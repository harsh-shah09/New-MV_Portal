
import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { verifySession } from '@/lib/auth';
import { getEmployeeById, updateEmployee } from '@/lib/salesforce';
import { db } from '@/lib/dynamodb';
import { PutCommand, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/userinfo.email',
  'openid'
];

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

async function fetchGoogleAccountEmail(oauth2Client: any): Promise<string | null> {
    try {
        const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
        const { data } = await oauth2.userinfo.get();
        return data?.email || null;
    } catch (error) {
        return null;
    }
}

async function getOAuth2Client() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8080';
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/google/callback`;
    if (!clientId || !clientSecret) {
        throw new Error("Missing Google Client ID or Secret in Environment Variables");
    }

    return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export async function GET(req: Request) {
    try {
        const session = await verifySession();
        if (!session || !session.employeeId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const action = searchParams.get('action');

        if (action === 'status') {
            // Allow HR/Admin to fetch status for another employee via ?employeeId=<id>
            const { searchParams } = new URL(req.url);
            const targetEmployeeId = searchParams.get('employeeId') || session.employeeId;

            // If asking for someone else's status, enforce HR/Admin role
            if (targetEmployeeId !== session.employeeId) {
                const allowedRoles = ['HR', 'Admin'];
                if (!allowedRoles.includes(session.role || '')) {
                    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
                }
            }

            const getCmd = new GetCommand({
                TableName: 'MV_Portal',
                Key: {
                    Employee_Id: targetEmployeeId,
                    SortKey: 'GOOGLE_INTEGRATION'
                }
            });
            const data = await db.send(getCmd);
            if (!data.Item) {
                return NextResponse.json({ connected: false });
            }

            const existingEmail = (data.Item as { account_email?: string }).account_email || null;
            if (existingEmail) {
                return NextResponse.json({ connected: true, googleEmail: existingEmail });
            }

            const oauth2Client = await getOAuth2Client();
            oauth2Client.setCredentials({
                access_token: (data.Item as any).access_token,
                refresh_token: (data.Item as any).refresh_token,
                expiry_date: (data.Item as any).expiry_date,
                token_type: (data.Item as any).token_type,
                scope: (data.Item as any).scope,
            });

            let googleEmail: string | null = null;
            try {
                await oauth2Client.getAccessToken();
                googleEmail = await fetchGoogleAccountEmail(oauth2Client);
            } catch (error) {
                if (!isAuthError(error)) {
                    console.warn('Google email fetch failed:', error);
                }
            }

            if (googleEmail) {
                await db.send(new UpdateCommand({
                    TableName: 'MV_Portal',
                    Key: {
                        Employee_Id: targetEmployeeId,
                        SortKey: 'GOOGLE_INTEGRATION'
                    },
                    UpdateExpression: 'SET account_email = :accountEmail, updated_at = :updatedAt',
                    ExpressionAttributeValues: {
                        ':accountEmail': googleEmail,
                        ':updatedAt': new Date().toISOString()
                    }
                }));
            }

            return NextResponse.json({ connected: true, googleEmail });
        }

        if (action === 'disconnect') {
             // In a real app, maybe revoke token with Google too
             const getCmd = new GetCommand({
                TableName: 'MV_Portal',
                Key: {
                    Employee_Id: session.employeeId,
                    SortKey: 'GOOGLE_INTEGRATION'
                }
            });
            const data = await db.send(getCmd);
            
            // Delete from DB
            // We use delete (not implemented in lib but easy)
             // Or typically Put with empty? No, proper DeleteCommand.
             // Let's assume user wants to just overwrite or we add Delete. 
             // Since I don't see delete wrapper, I'll use native
             const { DeleteCommand } = await import('@aws-sdk/lib-dynamodb');
             await db.send(new DeleteCommand({
                  TableName: 'MV_Portal',
                  Key: {
                      Employee_Id: session.employeeId,
                      SortKey: 'GOOGLE_INTEGRATION'
                  }
             }));
             return NextResponse.json({ success: true });
        }

        // Auth URL Generation
        const oauth2Client = await getOAuth2Client();
        const authUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: SCOPES,
            prompt: 'consent' // Force refresh token
        });

        return NextResponse.json({ url: authUrl });

    } catch (error: any) {
        console.error('Google Auth Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
