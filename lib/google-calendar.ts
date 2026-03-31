import { google } from 'googleapis';
import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { db } from '@/lib/dynamodb';

interface GoogleIntegrationItem {
  access_token?: string;
  refresh_token?: string;
  expiry_date?: number;
  token_type?: string;
  scope?: string;
}

interface CreateLeaveCalendarEventParams {
  employeeId: string;
  employeeName?: string;
  leaveType?: string;
  leaveCategory?: string;
  startDate: string;
  endDate: string;
  reason?: string;
  approvedBy?: string;
}

interface DeleteLeaveCalendarEventParams {
  employeeId: string;
  eventId?: string | null;
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

async function persistGoogleCredentials(employeeId: string, credentials: GoogleIntegrationItem): Promise<void> {
  await db.send(new UpdateCommand({
    TableName: 'MV_Portal',
    Key: {
      Employee_Id: employeeId,
      SortKey: 'GOOGLE_INTEGRATION',
    },
    UpdateExpression: 'SET access_token = :accessToken, expiry_date = :expiryDate, token_type = :tokenType, #scope = :scope, updated_at = :updatedAt',
    ExpressionAttributeNames: {
      '#scope': 'scope',
    },
    ExpressionAttributeValues: {
      ':accessToken': credentials.access_token || null,
      ':expiryDate': credentials.expiry_date || null,
      ':tokenType': credentials.token_type || null,
      ':scope': credentials.scope || null,
      ':updatedAt': new Date().toISOString(),
    },
  }));
}

function normalizeDateOnly(dateValue: string): string {
  return String(dateValue).slice(0, 10);
}

function getExclusiveEndDateFromInclusive(dateValue: string): string {
  const normalizedDate = normalizeDateOnly(dateValue);
  const endDate = new Date(`${normalizedDate}T00:00:00.000Z`);
  if (Number.isNaN(endDate.getTime())) {
    return normalizedDate;
  }

  endDate.setUTCDate(endDate.getUTCDate() + 1);
  return endDate.toISOString().slice(0, 10);
}

function isLossOfPayCategory(value?: string): boolean {
  const normalized = (value || '').toLowerCase().replace(/\s+/g, '-');
  return normalized === 'loss-of-pay';
}

function isTodayOrFutureDate(dateValue: string): boolean {
  const normalizedDate = normalizeDateOnly(dateValue);
  const today = new Date().toISOString().slice(0, 10);
  return normalizedDate >= today;
}

export async function createLeaveCalendarEventForEmployee({
  employeeId,
  employeeName,
  leaveType,
  leaveCategory,
  startDate,
  endDate,
  reason,
  approvedBy,
}: CreateLeaveCalendarEventParams): Promise<string | null> {
  try {
    const normalizedStartDate = normalizeDateOnly(startDate);
    const normalizedEndDate = normalizeDateOnly(endDate);

    if (!isLossOfPayCategory(leaveCategory)) {
      console.log('📅 [Calendar] Skipping event creation: not Loss of Pay', {
        employeeId,
        leaveCategory,
        startDate: normalizedStartDate,
        endDate: normalizedEndDate,
      });
      return null;
    }

    if (!isTodayOrFutureDate(normalizedStartDate)) {
      console.log('📅 [Calendar] Skipping event creation: leave starts in the past', {
        employeeId,
        startDate: normalizedStartDate,
        endDate: normalizedEndDate,
      });
      return null;
    }

    const oauth2Client = createOAuth2Client();
    if (!oauth2Client) {
      console.log('📅 [Calendar] Skipping event creation: OAuth client not configured', {
        employeeId,
      });
      return null;
    }

    const integration = await getGoogleIntegration(employeeId);
    if (!integration?.refresh_token) {
      console.log('📅 [Calendar] Skipping event creation: no Google integration refresh token', {
        employeeId,
      });
      return null;
    }

    oauth2Client.setCredentials({
      access_token: integration.access_token,
      refresh_token: integration.refresh_token,
      expiry_date: integration.expiry_date,
      token_type: integration.token_type,
      scope: integration.scope,
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const safeEmployeeName = (employeeName || 'Employee').trim();
    console.log('📅 [Calendar] Creating leave calendar event:', {
      employeeId,
      safeEmployeeName,
    });
    const eventSummary = `Leave - ${safeEmployeeName}`;
    const summaryLeaveType = leaveType || 'Leave';

    const descriptionLines = [
      `Leave approved in HRMS`,
      `Type: ${summaryLeaveType}`,
      approvedBy ? `Approved by: ${approvedBy}` : null,
      reason ? `Reason: ${reason}` : null,
    ].filter(Boolean);

    const createdEvent = await calendar.events.insert({
      calendarId: 'primary',
      sendUpdates: 'none',
      requestBody: {
        summary: eventSummary,
        description: descriptionLines.join('\n'),
        start: { date: normalizedStartDate },
        end: { date: getExclusiveEndDateFromInclusive(normalizedEndDate) },
        // attendees: [
        //   {
        //     email: 'mvteam@mvclouds.com',
        //   },
        // ],
        guestsCanInviteOthers: false,
        guestsCanModify: false,
        guestsCanSeeOtherGuests: false,
      },
    });

    console.log('📅 Leave calendar event created:', {
      employeeId,
      eventId: createdEvent.data?.id,
      startDate: normalizedStartDate,
      endDate: normalizedEndDate,
    });
    const eventId = createdEvent.data?.id || null;
    console.log('📅 [Calendar] Event id extracted from Google response:', {
      employeeId,
      eventId,
      googleEventStatus: createdEvent.data?.status,
    });

    try {
      const refreshedCredentials = oauth2Client.credentials;
      await persistGoogleCredentials(employeeId, {
        access_token: refreshedCredentials.access_token ?? undefined,
        refresh_token: refreshedCredentials.refresh_token || integration.refresh_token,
        expiry_date: refreshedCredentials.expiry_date ?? undefined,
        token_type: refreshedCredentials.token_type ?? undefined,
        scope: refreshedCredentials.scope ?? undefined,
      });
    } catch (persistError) {
      console.warn('⚠️ [Calendar] Event created but failed to persist refreshed OAuth credentials', {
        employeeId,
        eventId,
        persistError,
      });
    }

    return eventId;
  } catch (error) {
    console.error('Failed to create leave calendar event:', {
      employeeId,
      error,
    });
    return null;
  }
}

export async function deleteLeaveCalendarEventForEmployee({
  employeeId,
  eventId,
}: DeleteLeaveCalendarEventParams): Promise<boolean> {
  try {
    if (!eventId) {
      return false;
    }

    const oauth2Client = createOAuth2Client();
    if (!oauth2Client) {
      return false;
    }

    const integration = await getGoogleIntegration(employeeId);
    if (!integration?.refresh_token) {
      return false;
    }

    oauth2Client.setCredentials({
      access_token: integration.access_token,
      refresh_token: integration.refresh_token,
      expiry_date: integration.expiry_date,
      token_type: integration.token_type,
      scope: integration.scope,
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    await calendar.events.delete({
      calendarId: 'primary',
      eventId,
      sendUpdates: 'none',
    });

    const refreshedCredentials = oauth2Client.credentials;
    await persistGoogleCredentials(employeeId, {
      access_token: refreshedCredentials.access_token ?? undefined,
      refresh_token: refreshedCredentials.refresh_token || integration.refresh_token,
      expiry_date: refreshedCredentials.expiry_date ?? undefined,
      token_type: refreshedCredentials.token_type ?? undefined,
      scope: refreshedCredentials.scope ?? undefined,
    });

    console.log('🗑️ Leave calendar event deleted:', {
      employeeId,
      eventId,
    });

    return true;
  } catch (error) {
    console.error('Failed to delete leave calendar event:', {
      employeeId,
      eventId,
      error,
    });
    return false;
  }
}
