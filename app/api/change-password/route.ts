import { NextResponse } from 'next/server';
import { getSalesforceConnection } from '@/lib/salesforce';
import crypto, { hash } from 'crypto';
import { hashPassword} from '@/lib/auth';

interface EmployeeRecord {
  Id: string;
  Pass_Reset_Active__c: boolean;
}

async function findEmployee(conn: any, id: string): Promise<EmployeeRecord | null> {
  try {
    // 1. Check by Name if EMP
    if (id.startsWith('EMP')) {
      const query = `SELECT Id, Pass_Reset_Active__c FROM Employee__c WHERE Name = '${id}' LIMIT 1`;
      const result = await conn.query(query);
      if (result.records.length > 0) return result.records[0];
    }
    
    // 2. Check by Salesforce Id
    const query = `SELECT Id, Pass_Reset_Active__c FROM Employee__c WHERE Id = '${id}' LIMIT 1`;
    const result = await conn.query(query);
    if (result.records.length > 0) return result.records[0];
  } catch (error) {
    console.warn('Error finding employee:', error);
  }
  return null;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
    }

    const conn = await getSalesforceConnection();
    const employee = await findEmployee(conn, id);

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // If Pass_Reset_Active__c is false, it means it's ALREADY active/used/expired (based on user requirement)
    return NextResponse.json({ 
      expired: employee.Pass_Reset_Active__c === false 
    });

  } catch (error: any) {
    console.error('Check status error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { id, password } = await req.json();

    if (!id || !password) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const conn = await getSalesforceConnection();
    const employee = await findEmployee(conn, id);

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    if (employee.Pass_Reset_Active__c === false) {
      return NextResponse.json(
        { error: 'Password is changed once! Link is expired' },
        { status: 400 }
      );
    }

    // Encrypt password (using SHA-256 for simplicity as requested)
    const hashedPassword = await hashPassword(password)

    // Update the password in Salesforce and set Pass_Reset_Active__c to false
    await conn.sobject('Employee__c').update({
      Id: employee.Id,
      Password__c: hashedPassword,
      Pass_Reset_Active__c: false,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Change password error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
