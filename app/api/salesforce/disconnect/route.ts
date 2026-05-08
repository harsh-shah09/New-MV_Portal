import { NextResponse } from 'next/server';
import { db } from '@/lib/dynamodb';
import { DeleteCommand } from '@aws-sdk/lib-dynamodb';

const TABLE_NAME = 'MV_Portal';
const ORG_TOKEN_ID = 'SALESFORCE_ORG_CONNECTION';

export async function DELETE() {
  try {
    const deleteCmd = new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { Employee_Id: ORG_TOKEN_ID, SortKey: 'TOKEN' },
    });
    await db.send(deleteCmd);

    // Also clear the old username/password token record if it exists
    const deleteOldCmd = new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { Employee_Id: 'Salesforce_Access_token', SortKey: 'TOKEN' },
    });
    await db.send(deleteOldCmd).catch(() => {/* ignore */});

    // Reset the in-memory jsforce connection
    try {
      const { resetConnection } = await import('@/lib/salesforce');
      resetConnection();
    } catch { /* non-fatal */ }

    return NextResponse.json({ success: true, message: 'Salesforce org disconnected successfully' });
  } catch (err: any) {
    console.error('SF disconnect error:', err);
    return NextResponse.json({ error: err.message || 'Failed to disconnect' }, { status: 500 });
  }
}
