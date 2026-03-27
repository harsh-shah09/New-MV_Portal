/**
 * Email utility for sending notifications
 * Replace GoogleGmailApi.sendEmailFuture from Apex
 */

import nodemailer from 'nodemailer';
import { google } from 'googleapis';
import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { db } from '@/lib/dynamodb';

interface EmailParams {
  to: string;
  subject: string;
  body: string;
  contentType?: string;
  senderEmployeeId?: string;
  isInfo?: boolean;
}

interface GoogleIntegrationItem {
  access_token?: string;
  refresh_token?: string;
  expiry_date?: number;
  token_type?: string;
}

/**
 * Create nodemailer transporter for Gmail
 */

function createInfoTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.INFO_USER,
      pass: process.env.INFO_GMAIL_APP_PASSWORD,
    },
  });
}

function createOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:8080';
  const redirectUri = `${baseUrl}/api/integrations/google/callback`;

  if (!clientId || !clientSecret) {
    return null;
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

async function getGoogleIntegration(employeeId: string): Promise<GoogleIntegrationItem | null> {
  const result = await db.send(new GetCommand({
    TableName: 'MV_Portal',
    Key: {
      Employee_Id: employeeId,
      SortKey: 'GOOGLE_INTEGRATION',
    },
  }));

  if (!result.Item) {
    return null;
  }

  return result.Item as GoogleIntegrationItem;
}

async function persistGoogleIntegration(employeeId: string, integration: GoogleIntegrationItem): Promise<void> {
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
  const raw = encodeGmailMessage(params.to, params.subject, params.body);

  await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw },
  });
}

function encodeGmailMessage(to: string, subject: string, html: string): string {
  const mimeMessage = [
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    '',
    html,
  ].join('\r\n');

  return Buffer.from(mimeMessage)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

async function sendViaUserGoogleAccount(params: EmailParams): Promise<boolean> {
  if (!params.senderEmployeeId) {
    return false;
  }

  const integration = await getGoogleIntegration(params.senderEmployeeId);
  if (!integration?.access_token && !integration?.refresh_token) {
    return false;
  }

  const oauth2Client = createOAuth2Client();
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
      console.log('✅ Email sent via user Google account after token refresh');
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
export async function sendEmail({ to, subject, body, contentType = 'text/plain', senderEmployeeId, isInfo = false }: EmailParams): Promise<void> {
  try {
    console.log('📧 Sending email:', { to, subject, contentType, isInfo });

    // If isInfo is true, use nodemailer with Gmail app password
    if (isInfo) {
      const transporter = createInfoTransporter();

      const mailOptions: any = {
        from: process.env.INFO_USER,
        to,
        subject,
        html: body,
      };

      await transporter.sendMail(mailOptions);
      console.log('✅ Email sent via nodemailer (Gmail app password) to:', to);
      return;
    }

    const wasSentViaGoogle = await sendViaUserGoogleAccount({ to, subject, body, contentType, senderEmployeeId });
    if (wasSentViaGoogle) {
      console.log('✅ Email sent via user Google account to:', to);
      return;
    }

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
    sendEmail(params).catch(err => {
      console.error('Async email error:', err);
    });
  });
}

/**
 * Get HR email from environment variable
 */
export function getHREmail(): string {
  return 'harsh.s@mvclouds.com';
}