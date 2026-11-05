import { NextResponse } from 'next/server';
import { getSalesforceConnection } from '@/lib/salesforce';
import { verifySession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const conn = await getSalesforceConnection();
    if (!conn) {
      return NextResponse.json({ error: 'Salesforce connection failed' }, { status: 500 });
    }

    const query = `
      SELECT Id, Employee_Name__c 
      FROM Employee__c 
      WHERE Title__c = 'Team Lead' AND Status__c = 'Active'
    `;
    const result = await conn.query(query);

    const teamLeads = result.records.map((r: any) => ({
      Id: r.Id,
      Employee_Name__c: r.Employee_Name__c
    }));

    return NextResponse.json(teamLeads);
  } catch (error) {
    console.error('Error fetching team leads:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
