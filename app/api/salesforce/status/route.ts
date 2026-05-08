import { NextResponse } from 'next/server';
import { db } from '@/lib/dynamodb';
import { GetCommand } from '@aws-sdk/lib-dynamodb';

const TABLE_NAME = 'MV_Portal';
export const ORG_TOKEN_ID = 'SALESFORCE_ORG_CONNECTION';

export async function GET() {
  try {
    const getCmd = new GetCommand({
      TableName: TABLE_NAME,
      Key: { Employee_Id: ORG_TOKEN_ID, SortKey: 'TOKEN' },
    });
    const data = await db.send(getCmd);

    if (!data.Item) {
      return NextResponse.json({ connected: false });
    }

    const item = data.Item;
    return NextResponse.json({
      connected: true,
      org_type: item.org_type,
      login_domain: item.login_domain,
      instance_url: item.instance_url,
      connected_at: item.connected_at,
      user_info: item.user_info || {},
    });
  } catch (err) {
    console.error('SF status check error:', err);
    return NextResponse.json({ connected: false, error: 'Failed to check status' }, { status: 500 });
  }
}
