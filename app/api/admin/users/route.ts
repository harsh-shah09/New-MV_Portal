
import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import { getEmployeeById, getAllEmployees, updateEmployee } from '@/lib/salesforce';

export async function GET(req: Request) {
  try {
    const session = await verifySession();
    if (!session || !session.employeeId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = await getEmployeeById(session.employeeId);
    if (!admin || (admin.Role__c !== 'Admin' && admin.Role__c !== 'HR')) {
       return NextResponse.json({ error: 'Access Denied' }, { status: 403 });
    }

    // Parse search params if needed, for now return all
    const employees = await getAllEmployees();
    
    // Minimal data for the list
    const users = employees.map(e => ({
        Id: e.Id,
        Employee_ID__c: e.Name,
        Name: e.Employee_Name__c,
        Email: e.Employee_Email__c,
        Role: e.Role__c,
        Status: e.Status__c,
        Department: e.Department__c,
        Photo: e.Profile_Photo__c,
        Active__c: e.Active__c
    }));

    return NextResponse.json(users);

  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
    try {
        const session = await verifySession();
        if (!session || !session.employeeId) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
    
        const admin = await getEmployeeById(session.employeeId);
        if (!admin || (admin.Role__c !== 'Admin' && admin.Role__c !== 'HR')) {
           return NextResponse.json({ error: 'Access Denied' }, { status: 403 });
        }

        const body = await req.json();
        const { employeeId, updates } = body;

        if (!employeeId || !updates) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Allowed updates
        const allowedUpdates: any = {};
        if (updates.Role__c) allowedUpdates.Role__c = updates.Role__c;
        if (updates.Status__c) allowedUpdates.Status__c = updates.Status__c;
        allowedUpdates.Active__c = updates.Active__c ?? true;
        // Add other allowed fields here
        await updateEmployee(employeeId, allowedUpdates);

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Error updating user:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
