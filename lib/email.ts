import nodemailer from 'nodemailer';
import { google } from 'googleapis';
import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { db } from '@/lib/dynamodb';
import { getSalesforceConnection } from "@/lib/salesforce";
import { getAdminSettings } from '@/lib/admin-settings';


interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType: string;
}

interface EmailParams {
  to: string;
  cc?: string | string[];
  subject: string;
  body: string;
  contentType?: string;
  senderEmployeeId?: string;
  isInfo?: boolean;
  attachments?: EmailAttachment[];
}

interface GoogleIntegrationItem {
  access_token?: string;
  refresh_token?: string;
  expiry_date?: number;
  token_type?: string;
}

const isEmailDebugEnabled = () => {
  const raw = (process.env.NODE_ENV === 'production').toString();
  return ['1', 'true', 'yes', 'on'].includes(raw.toLowerCase());
};

const logEmailDebug = (message: string, meta?: Record<string, unknown>) => {
  if (!isEmailDebugEnabled()) {
    return;
  }
  if (meta) {
    console.log(`[email] ${message}`, meta);
    return;
  }
  console.log(`[email] ${message}`);
};

/**
 * Create nodemailer transporter for Gmail
 */

async function createInfoTransporter() {
  const settings = await getAdminSettings();
  const infoUser = settings.INFO_USERNAME || process.env.INFO_USER;
  const gmailAppPassword = settings.INFO_GMAIL_APP_PASSWORD || process.env.INFO_GMAIL_APP_PASSWORD;

  logEmailDebug('Creating info transporter', {
    hasInfoUser: Boolean(infoUser),
    hasAppPassword: Boolean(gmailAppPassword),
  });

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: infoUser,
      pass: gmailAppPassword,
    },
  });
}

async function createOAuth2Client() {
  const settings = await getAdminSettings();
  const clientId = settings.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
  const clientSecret = settings.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;
  const baseUrl = settings.NEXT_PUBLIC_APP_URL || settings.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:8080';
  const redirectUri = `${baseUrl}/api/integrations/google/callback`;

  if (!clientId || !clientSecret) {
    logEmailDebug('OAuth2 client missing configuration', {
      hasClientId: Boolean(clientId),
      hasClientSecret: Boolean(clientSecret),
    });
    return null;
  }

  logEmailDebug('OAuth2 client created', { redirectUri });
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

async function getGoogleIntegration(employeeId: string): Promise<GoogleIntegrationItem | null> {
  logEmailDebug('Fetching Google integration', { employeeId });
  const result = await db.send(new GetCommand({
    TableName: 'MV_Portal',
    Key: {
      Employee_Id: employeeId,
      SortKey: 'GOOGLE_INTEGRATION',
    },
  }));

  if (!result.Item) {
    logEmailDebug('No Google integration record found', { employeeId });
    return null;
  }

  logEmailDebug('Google integration record found', { employeeId, hasAccessToken: Boolean((result.Item as any)?.access_token), hasRefreshToken: Boolean((result.Item as any)?.refresh_token) });
  return result.Item as GoogleIntegrationItem;
}

async function persistGoogleIntegration(employeeId: string, integration: GoogleIntegrationItem): Promise<void> {
  logEmailDebug('Persisting Google integration', {
    employeeId,
    hasAccessToken: Boolean(integration.access_token),
    hasRefreshToken: Boolean(integration.refresh_token),
    expiryDate: integration.expiry_date || null,
    tokenType: integration.token_type || null,
  });
  await db.send(new UpdateCommand({
    TableName: 'MV_Portal',
    Key: {
      Employee_Id: employeeId,
      SortKey: 'GOOGLE_INTEGRATION',
    },
    UpdateExpression: 'SET access_token = :accessToken, refresh_token = :refreshToken, expiry_date = :expiryDate, token_type = :tokenType, updated_at = :updatedAt',
    ExpressionAttributeValues: {
      ':accessToken': integration.access_token || null,
      ':refreshToken': integration.refresh_token || null,
      ':expiryDate': integration.expiry_date || null,
      ':tokenType': integration.token_type || null,
      ':updatedAt': new Date().toISOString(),
    },
  }));
}

function isAuthError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const maybe = error as { code?: string | number; status?: number; response?: { status?: number } };
  const status = maybe.status || maybe.response?.status;

  if (status === 401 || status === 403) {
    return true;
  }

  if (typeof maybe.code === 'string') {
    return ['invalid_grant', 'unauthorized_client', 'invalid_client'].includes(maybe.code);
  }

  return false;
}

async function sendWithCurrentCredentials(oauth2Client: any, params: EmailParams): Promise<void> {
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  const raw = encodeGmailMessage(params.to, params.cc, params.subject, params.body);

  logEmailDebug('Sending Gmail message with current credentials', {
    to: params.to,
    cc: params.cc ? (Array.isArray(params.cc) ? params.cc.length : 1) : 0,
    subject: params.subject,
  });

  await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw },
  });
}

function encodeGmailMessage(to: string, cc: string | string[] | undefined, subject: string, html: string): string {
  const ccString = Array.isArray(cc) ? cc.filter(Boolean).join(', ') : cc || '';
  logEmailDebug('Encoding email message', { to, cc: ccString, subject, bodyLength: html?.length || 0 });
  
  const headers = [
    `To: ${to}`,
    ...(ccString ? [`Cc: ${ccString}`] : []),
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    '',
  ];

  const mimeMessage = headers.join('\r\n') + '\r\n' + html;

  return Buffer.from(mimeMessage)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

async function sendViaUserGoogleAccount(params: EmailParams): Promise<boolean> {
  if (!params.senderEmployeeId) {
    logEmailDebug('Sender employee ID missing; skipping Google send');
    return false;
  }

  const integration = await getGoogleIntegration(params.senderEmployeeId);
  if (!integration?.access_token && !integration?.refresh_token) {
    console.warn('No Google integration found for employee:', params.senderEmployeeId);
    return false;
  }

  const oauth2Client = await createOAuth2Client();
  if (!oauth2Client) {
    console.warn('Google OAuth client not configured. Skipping refresh flow.');
    return false;
  }

  oauth2Client.setCredentials({
    access_token: integration.access_token,
    refresh_token: integration.refresh_token,
    expiry_date: integration.expiry_date,
    token_type: integration.token_type,
  });

  try {
    await sendWithCurrentCredentials(oauth2Client, params);
    logEmailDebug('Email sent with existing credentials', { employeeId: params.senderEmployeeId });
    return true;
  } catch (error) {
    if (!isAuthError(error) || !integration.refresh_token) {
      console.warn('Google send failed without refresh retry:', error);
      return false;
    }

    try {
      const refreshedToken = await oauth2Client.getAccessToken();
      const refreshedAccessToken = refreshedToken?.token || oauth2Client.credentials?.access_token;

      if (!refreshedAccessToken) {
        console.warn('Refresh token flow did not return a new access token.');
        return false;
      }

      const refreshedCredentials = oauth2Client.credentials;
      await persistGoogleIntegration(params.senderEmployeeId, {
        access_token: refreshedAccessToken,
        refresh_token: refreshedCredentials.refresh_token || integration.refresh_token,
        expiry_date: refreshedCredentials.expiry_date ?? undefined,
        token_type: refreshedCredentials.token_type ?? undefined,
      });

      await sendWithCurrentCredentials(oauth2Client, params);
      console.info('Email sent successfully after token refresh for employee:', params.senderEmployeeId);
      return true;
    } catch (refreshError) {
      console.warn('Google token refresh/send retry failed:', refreshError);
      return false;
    }
  }
}

export async function hasGoogleWorkspaceIntegration(employeeId: string): Promise<boolean> {
  const integration = await getGoogleIntegration(employeeId);
  return !!(integration?.access_token || integration?.refresh_token);
}

/**
 * Send email notification using Gmail
 */
export async function sendEmail({ to, cc, subject, body, contentType = 'text/plain', senderEmployeeId, isInfo = false, attachments }: EmailParams): Promise<void> {
  try {
    logEmailDebug('Send email invoked', {
      to,
      ccCount: cc ? (Array.isArray(cc) ? cc.length : 1) : 0,
      subject,
      contentType,
      senderEmployeeId: senderEmployeeId || null,
      isInfo,
      bodyLength: body?.length || 0,
    });

    // If isInfo is true, use nodemailer with Gmail app password
    if (isInfo) {
      logEmailDebug('Using info transporter flow');
      const transporter = await createInfoTransporter();
      const settings = await getAdminSettings();
      const infoUser = settings.INFO_USERNAME || process.env.INFO_USER;

      const mailOptions: any = {
        from: `"MV Clouds" <${infoUser}>`,
        to,
        subject,
        html: body,
      };

      if (cc) {
        mailOptions.cc = cc;
      }

      if (attachments && attachments.length > 0) {
        mailOptions.attachments = attachments.map((a) => ({
          filename: a.filename,
          content: a.content,
          contentType: a.contentType,
        }));
      }

      logEmailDebug('Sending via nodemailer info account', { to, cc: mailOptions.cc ? true : false, subject, attachmentCount: attachments?.length || 0 });
      await transporter.sendMail(mailOptions);
      logEmailDebug('Info email sent successfully', { to, subject });

      return;
    }

    const wasSentViaGoogle = await sendViaUserGoogleAccount({ to, cc, subject, body, contentType, senderEmployeeId });
    if (wasSentViaGoogle) {
      logEmailDebug('Email sent via Google integration', { senderEmployeeId });
      return;
    }

    logEmailDebug('Email not sent via Google integration; no fallback configured', { senderEmployeeId });

  } catch (error) {
    console.error('❌ Error sending email:', error);
  }
}

/**
 * Send email asynchronously (non-blocking)
 * Equivalent to @future in Apex
 */
export function sendEmailAsync(params: EmailParams): void {
  // Run in next tick to avoid blocking
  setImmediate(() => {
    logEmailDebug('Async email queued', {
      to: params.to,
      subject: params.subject,
      senderEmployeeId: params.senderEmployeeId || null,
      isInfo: params.isInfo || false,
    });
    sendEmail(params).catch(err => {
      console.error('Async email error:', err);
    });
  });
}

/**
 * Get HR email from environment variable
 */
// export function getHREmail(): string {
//   return 'harsh.s@mvclouds.com';
// }

export async function getHREmail(): Promise<string> {

  const conn = await getSalesforceConnection();
  // return 'harsh.s@mvclouds.com';
  const hrRecord = await conn.query<any>(`
            SELECT Employee_Email__c ,Company_Email__c
            FROM Employee__c
            WHERE Role__c = 'HR' and Title__c = 'Team Lead'
            LIMIT 1
          `);
  const hrEmail = hrRecord.records?.[0]?.Company_Email__c;
  return hrEmail || '';

}