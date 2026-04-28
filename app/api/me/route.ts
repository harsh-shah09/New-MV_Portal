
import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import { getEmployeeById } from '@/lib/salesforce';

export async function GET() {
  try {
    const session = await verifySession();
    if (!session || !session.employeeId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const employee = await getEmployeeById(session.employeeId);
    if (!employee) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    return NextResponse.json({ 
      id: employee.Id,
      name: employee.Employee_Name__c,
      email: employee.Employee_Email__c,
      companyEmail: employee.Company_Email__c,
      role: employee.Role__c,
      profilePhoto: employee.Profile_Photo__c
    });

  } catch (error) {
    console.error('Error fetching current user:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
