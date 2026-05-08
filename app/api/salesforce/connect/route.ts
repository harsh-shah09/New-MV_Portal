import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const orgType = searchParams.get('orgType') || 'production'; // production | sandbox | custom
  const customDomain = searchParams.get('customDomain') || '';

  const clientId = process.env.SALESFORCE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: 'SALESFORCE_CLIENT_ID is not configured in environment variables.' }, { status: 500 });
  }

  let loginDomain: string;
  if (orgType === 'production') {
    loginDomain = 'login.salesforce.com';
  } else if (orgType === 'sandbox') {
    loginDomain = 'test.salesforce.com';
  } else if (orgType === 'custom' && customDomain) {
    // Strip any protocol prefix if entered
    loginDomain = customDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
  } else {
    return NextResponse.json({ error: 'Invalid orgType or missing customDomain' }, { status: 400 });
  }

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/salesforce/callback`;

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'api refresh_token offline_access openid profile email',
    // Pass login domain as state so callback knows which domain to use for token exchange
    state: Buffer.from(JSON.stringify({ loginDomain, orgType })).toString('base64'),
  });

  const authUrl = `https://${loginDomain}/services/oauth2/authorize?${params.toString()}`;
  return NextResponse.redirect(authUrl);
}
