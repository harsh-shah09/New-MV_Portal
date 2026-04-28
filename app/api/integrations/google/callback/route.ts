
import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { verifySession } from '@/lib/auth';
import { db } from '@/lib/dynamodb';
import { PutCommand } from '@aws-sdk/lib-dynamodb';

async function getOAuth2Client() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const redirectUri = `${baseUrl}/api/integrations/google/callback`;

    if (!clientId || !clientSecret) {
        throw new Error("Missing Google Client ID or Secret");
    }

    return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export async function GET(req: Request) {
    try {
        const session = await verifySession();
        if (!session || !session.employeeId) {
            return NextResponse.redirect(new URL('/auth/login', req.url));
        }

        const { searchParams } = new URL(req.url);
        const code = searchParams.get('code');
        const error = searchParams.get('error');

        if (error) {
            return NextResponse.redirect(new URL('/dashboard?tab=integration&error=google_auth_failed', req.url));
        }

        if (!code) {
             return NextResponse.redirect(new URL('/dashboard?tab=integration&error=no_code', req.url));
        }

        const oauth2Client = await getOAuth2Client();
        const { tokens } = await oauth2Client.getToken(code);

        oauth2Client.setCredentials(tokens);
        let accountEmail: string | null = null;
        try {
            const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
            const { data } = await oauth2.userinfo.get();
            accountEmail = data?.email || null;
        } catch (error) {
            console.warn('Failed to fetch Google account email on callback:', error);
        }

        // Store tokens in DynamoDB
        await db.send(new PutCommand({
            TableName: 'MV_Portal',
            Item: {
                Employee_Id: session.employeeId,
                SortKey: 'GOOGLE_INTEGRATION',
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token, // Crucial for offline access
                scope: tokens.scope,
                token_type: tokens.token_type,
                expiry_date: tokens.expiry_date,
                account_email: accountEmail,
                updated_at: new Date().toISOString()
            }
        }));

        return NextResponse.redirect(new URL('/dashboard?tab=integration&success=google_connected', req.url));

    } catch (error: any) {
        console.error('Google Callback Error:', error);
        return NextResponse.redirect(new URL(`/dashboard?tab=integration&error=${encodeURIComponent(error.message)}`, req.url));
    }
}
