
import { NextResponse } from 'next/server';
import { getEmployeeById, updateEmployee } from '@/lib/salesforce';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> } // Params is a promise in Next.js 15+? Or strictly context? Next 13+ app dir has async params if dynamic.
) {
  try {
     const { id } = await params;
    const employee = await getEmployeeById(id);
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Parse Address for frontend convenience
    if (typeof employee.Employee_Address__c === 'string') {
        try {
            // Try parsing as JSON first (New Format)
            const parsed = JSON.parse(employee.Employee_Address__c);
            // Validate it looks like an address object
            if (typeof parsed === 'object' && parsed !== null) {
                employee.Employee_Address__c = {
                    street: parsed.street || '',
                    city: parsed.city || '',
                    state: parsed.state || '',
                    country: parsed.country || '',
                    postalCode: parsed.postalCode || ''
                };
            }
        } catch (e) {
            // Fallback to Comma Separated (Legacy Format)
            const parts = employee.Employee_Address__c.split(',').map((s: string) => s.trim());
            // Attempt to map mostly correctly, but without JSON it's ambiguous if parts are missing.
            // We'll map left-to-right to Street, City, State, Country, Zip
            employee.Employee_Address__c = {
                street: parts[0] || '',
                city: parts[1] || '',
                state: parts[2] || '',
                country: parts[3] || '',
                postalCode: parts[4] || ''
            };
        }
    } else if (!employee.Employee_Address__c) {
        employee.Employee_Address__c = { street: '', city: '', state: '', country: '', postalCode: '' };
    }

    return NextResponse.json(employee);
  } catch (error) {
    console.error('Error fetching employee:', error);
    return NextResponse.json({ error: 'Failed to fetch employee' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
   { params }: { params: Promise<{ id: string }> }
) {
  try {
     const { id } = await params;
    const body = await request.json();
    const data = body;
    delete data.contactId; // Cleanup if sent

    // Aggregate Address into JSON String for storage reliability
    if (data.Employee_Address__c && typeof data.Employee_Address__c === 'object') {
        data.Employee_Address__c = JSON.stringify(data.Employee_Address__c);
    }

    await updateEmployee(id, data);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating employee:', error);
    return NextResponse.json({ error: 'Failed to update employee' }, { status: 500 });
  }
}
