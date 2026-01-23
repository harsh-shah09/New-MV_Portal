
import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import { getEmployeeById } from '@/lib/salesforce';
import { getAllConfigurations, updateConfiguration } from '@/lib/admin-config';

export async function GET() {
  try {
    const session = await verifySession();
    if (!session || !session.employeeId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const employee = await getEmployeeById(session.employeeId);
    if (!employee || (employee.Role__c !== 'Admin' && employee.Role__c !== 'HR')) {
       return NextResponse.json({ error: 'Access Denied: Admin or HR role required.' }, { status: 403 });
    }

    const configs = await getAllConfigurations();
    console.log('Fetched admin configurations:', configs.leave);
    return NextResponse.json(configs);

  } catch (error) {
    console.error('Error fetching admin configurations:', error);
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
    const { updates } = body;

    if (!updates || !Array.isArray(updates)) {
       return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Group updates by metadata type to minimize API calls (though calls are per type anyway usually, or mixed? jsforce metadata.update takes mixed types? No, usually specific. actually it takes (type, records) OR (records) where records have type?
    // jsforce: conn.metadata.update(type, records)
    // CustomMetadata type is generic. we pass fullName.
    
    // Construct the payload for jsforce
    // The updates array from frontend should contain: { metadataType, fullName, label, value }
    
    // We can just process them.
    const recordsToUpdate = updates.map((u: any) => ({
        fullName: u.fullName,
        label: u.label,
        values: [
            { field: 'Value__c', value: u.value }
        ]
    }));

    if (recordsToUpdate.length === 0) {
        return NextResponse.json({ success: true, message: "No updates" });
    }

    // "CustomMetadata" is the type for all Custom Metadata Types
    const result = await updateConfiguration('CustomMetadata', recordsToUpdate);

    return NextResponse.json({ success: true, result });

  } catch (error) {
    console.error('Error updating admin configurations:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
