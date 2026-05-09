import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import { getEmployeeById, getSalesforceConnection } from '@/lib/salesforce';
import { getAdminSettings, updateAdminSettings } from '@/lib/admin-settings';

export async function GET(req: Request) {
  try {
    const session = await verifySession();
    if (!session || !session.employeeId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const employee = await getEmployeeById(session.employeeId);
    if (!employee || (employee.Role__c !== 'Admin' && employee.Role__c !== 'HR')) {
      return NextResponse.json({ error: 'Access Denied: Admin or HR role required.' }, { status: 403 });
    }

    const settings = await getAdminSettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error fetching admin settings:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await verifySession();
    if (!session || !session.employeeId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const employee = await getEmployeeById(session.employeeId);
    if (!employee || (employee.Role__c !== 'Admin' && employee.Role__c !== 'HR')) {
      return NextResponse.json({ error: 'Access Denied: Admin or HR role required.' }, { status: 403 });
    }

    const body = await req.json();
    const { 
      INFO_USERNAME, INFO_GMAIL_APP_PASSWORD, GOOGLE_CLIENT_ID, 
      GOOGLE_CLIENT_SECRET, S3_BUCKET_NAME, AWS_ACCESS_KEY_ID, 
      AWS_SECRET_ACCESS_KEY, AWS_REGION, NEXTAUTH_SECRET, 
      NEXTAUTH_URL, NEXT_PUBLIC_APP_URL, ENCRYPTION_KEY, 
      SESSION_SECRET 
    } = body;

    // Validate that at least one field is being updated
    if (
      INFO_USERNAME === undefined &&
      INFO_GMAIL_APP_PASSWORD === undefined &&
      GOOGLE_CLIENT_ID === undefined &&
      GOOGLE_CLIENT_SECRET === undefined &&
      S3_BUCKET_NAME === undefined &&
      AWS_ACCESS_KEY_ID === undefined &&
      AWS_SECRET_ACCESS_KEY === undefined &&
      AWS_REGION === undefined &&
      NEXTAUTH_SECRET === undefined &&
      NEXTAUTH_URL === undefined &&
      NEXT_PUBLIC_APP_URL === undefined &&
      ENCRYPTION_KEY === undefined &&
      SESSION_SECRET === undefined
    ) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    await updateAdminSettings({
      INFO_USERNAME,
      INFO_GMAIL_APP_PASSWORD,
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      S3_BUCKET_NAME,
      AWS_ACCESS_KEY_ID,
      AWS_SECRET_ACCESS_KEY,
      AWS_REGION,
      NEXTAUTH_SECRET,
      NEXTAUTH_URL,
      NEXT_PUBLIC_APP_URL,
      ENCRYPTION_KEY,
      SESSION_SECRET,
    });

    return NextResponse.json({ success: true, message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Error updating admin settings:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
