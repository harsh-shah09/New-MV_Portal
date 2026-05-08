import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/dynamodb';
import { PutCommand } from '@aws-sdk/lib-dynamodb';

const TABLE_NAME = 'MV_Portal';
export const ORG_TOKEN_ID = 'SALESFORCE_ORG_CONNECTION';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const stateRaw = searchParams.get('state');
  const errorParam = searchParams.get('error');
  const errorDesc = searchParams.get('error_description');
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';

  if (errorParam) {
    return NextResponse.redirect(`${appUrl}/salesforce-connect?error=${encodeURIComponent(errorDesc || errorParam)}`);
  }

  if (!code || !stateRaw) {
    return NextResponse.redirect(`${appUrl}/salesforce-connect?error=${encodeURIComponent('Missing code or state parameter')}`);
  }

  let loginDomain: string;
  let orgType: string;
  try {
    const parsed = JSON.parse(Buffer.from(stateRaw, 'base64').toString('utf-8'));
    loginDomain = parsed.loginDomain;
    orgType = parsed.orgType;
  } catch {
    return NextResponse.redirect(`${appUrl}/salesforce-connect?error=${encodeURIComponent('Invalid state parameter')}`);
  }

  const clientId = process.env.SALESFORCE_CLIENT_ID!;
  const clientSecret = process.env.SALESFORCE_CLIENT_SECRET!;
  const redirectUri = `${appUrl}/api/salesforce/callback`;

  // ── 1. Exchange auth code for tokens ──────────────────────────────────────
  const tokenParams = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
  });

  const tokenRes = await fetch(`https://${loginDomain}/services/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: tokenParams.toString(),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.json().catch(() => ({}));
    return NextResponse.redirect(`${appUrl}/salesforce-connect?error=${encodeURIComponent(err.error_description || 'Token exchange failed')}`);
  }

  const tokenData = await tokenRes.json();
  const { access_token, refresh_token, instance_url } = tokenData;

  // ── 2. Fetch user info from Salesforce ────────────────────────────────────
  let userInfo: Record<string, any> = {};
  try {
    const userInfoRes = await fetch(`https://${loginDomain}/services/oauth2/userinfo`, {
      headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' },
    });
    if (userInfoRes.ok) {
      const raw = await userInfoRes.json();
      userInfo = {
        user_id: raw.user_id,
        name: raw.name,
        email: raw.email,
        preferred_username: raw.preferred_username,
        zoneinfo: raw.zoneinfo,
        locale: raw.locale,
        language: raw.language,
        user_type: raw.user_type,
        mobile_phone: raw.mobile_phone,
        photos: raw.photos || {},
        organization_id: raw.organization_id,
        display_name: raw.display_name,
        nick_name: raw.nick_name,
      };
    }
  } catch (e) {
    console.warn('Could not fetch user info:', e);
  }

  // ── 3. Store everything in DynamoDB ──────────────────────────────────────
  const putCmd = new PutCommand({
    TableName: TABLE_NAME,
    Item: {
      Employee_Id: ORG_TOKEN_ID,
      SortKey: 'TOKEN',
      access_token,
      refresh_token: refresh_token || null,
      instance_url,
      login_domain: loginDomain,
      org_type: orgType,
      user_info: userInfo,
      connected_at: new Date().toISOString(),
    },
  });
  await db.send(putCmd);

  // Invalidate in-memory jsforce connection so it re-initialises from new token
  // (done via salesforce.ts resetConnection export below)
  try {
    const { resetConnection } = await import('@/lib/salesforce');
    resetConnection();
  } catch { /* non-fatal */ }

  return NextResponse.redirect(`${appUrl}/dashboard?sfConnected=1`);
}
