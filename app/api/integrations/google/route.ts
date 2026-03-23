
import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { verifySession } from '@/lib/auth';
import { getEmployeeById, updateEmployee } from '@/lib/salesforce';
import { db } from '@/lib/dynamodb';
import { PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/calendar'
];

async function getOAuth2Client() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8080';
    const redirectUri = `http://localhost:8080/api/integrations/google/callback`;
    console.log(redirectUri);
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
            const getCmd = new GetCommand({
                TableName: 'MV_Portal',
                Key: {
                    Employee_Id: session.employeeId,
                    SortKey: 'GOOGLE_INTEGRATION'
                }
            });
            const data = await db.send(getCmd);
            return NextResponse.json({ connected: !!data.Item });
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
