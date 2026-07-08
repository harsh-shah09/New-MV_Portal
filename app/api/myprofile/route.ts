import { NextResponse } from 'next/server';
import { getEmployeeById, updateEmployee, getSalesforceConnection } from '@/lib/salesforce';
import { verifySession } from '@/lib/auth';

async function getRolePicklistOptions() {
  try {
    const conn = await getSalesforceConnection();
    if (!conn) return [];

    const description = await conn.sobject('Employee__c').describe();
    const roleField = description.fields?.find((field: any) => field.name === 'Role__c');

    if (!roleField?.picklistValues) return [];

    return roleField.picklistValues
      .filter((picklistValue: any) => picklistValue.active)
      .map((picklistValue: any) => picklistValue.value)
      .filter((value: string) => Boolean(value));
  } catch (error) {
    console.error('Error fetching Role__c picklist options:', error);
    return [];
  }
}

export async function GET() {
  try {
    const session = await verifySession();
    if (!session || !session.employeeId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const id = session.employeeId;

    const employee = await getEmployeeById(id, true);

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const roleOptions = await getRolePicklistOptions();

    const parseAddressHelper = (addrField: any) => {
      if (typeof addrField === 'string') {
          try {
              const parsed = JSON.parse(addrField);
              if (typeof parsed === 'object' && parsed !== null) {
                  return {
                      street: parsed.street || '',
                      city: parsed.city || '',
                      state: parsed.state || '',
                      country: parsed.country || '',
                      postalCode: parsed.postalCode || ''
                  };
              }
          } catch (e) {
              const parts = addrField.split(',').map((s: string) => s.trim());
              return {
                  street: parts[0] || '',
                  city: parts[1] || '',
                  state: parts[2] || '',
                  country: parts[3] || '',
                  postalCode: parts[4] || ''
              };
          }
      }
      return addrField || { street: '', city: '', state: '', country: '', postalCode: '' };
    };

    employee.Employee_Current_Address__c = parseAddressHelper(employee.Employee_Current_Address__c);
    employee.Employee_Address__c = parseAddressHelper(employee.Employee_Address__c);

    return NextResponse.json({ employee, roleOptions });
  } catch (error) {
    console.error('Error fetching own profile:', error);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await verifySession();
    if (!session || !session.employeeId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const id = session.employeeId;
    const body = await request.json();
    const data = body;
    delete data.contactId;

    const role = session.role;
    const isAdminOrHr = role === 'Admin' || role === 'HR';
    if (!isAdminOrHr) {
      delete data.Role__c;
      delete data.Title__c;
      delete data.Department__c;
      delete data.Company_Email__c;
      delete data.Joining_Date__c;
      delete data.Onboarding_Date__c;
      delete data.PF_Number__c;
      delete data.ESI_Number__c;
      delete data.UAN_Number__c;
      delete data.Active__c;
      delete data.Status__c;
      delete data.Team_Lead__c;
      delete data.Employee_Id__c;
      delete data.Employee_ID__c;
    }

    if (data.Employee_Current_Address__c && typeof data.Employee_Current_Address__c === 'object') {
        data.Employee_Current_Address__c = JSON.stringify(data.Employee_Current_Address__c);
    }
    if (data.Employee_Address__c && typeof data.Employee_Address__c === 'object') {
        data.Employee_Address__c = JSON.stringify(data.Employee_Address__c);
    }

    await updateEmployee(id, data);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating own profile:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
