import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import { getAdminSettingValue } from '@/lib/admin-settings';

export async function GET(req: Request) {
  try {
    const session = await verifySession();
    if (!session || !session.employeeId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const leaveGuideUrl = await getAdminSettingValue('leaveGuideUrl');
    return NextResponse.json({ leaveGuideUrl: leaveGuideUrl || '' });
  } catch (error) {
    console.error('Error fetching leave guide URL:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
