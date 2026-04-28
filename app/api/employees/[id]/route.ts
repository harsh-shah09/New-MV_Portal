
import { NextResponse } from 'next/server';
import { getAllEmployees, getEmployeeById, updateEmployee, getEmployeesByTeamLead } from '@/lib/salesforce';

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
    if (typeof employee.Employee_Current_Address__c === 'string') {
        try {
            // Try parsing as JSON first (New Format)
            const parsed = JSON.parse(employee.Employee_Current_Address__c);
            // Validate it looks like an address object
            if (typeof parsed === 'object' && parsed !== null) {
                employee.Employee_Current_Address__c = {
                    street: parsed.street || '',
                    city: parsed.city || '',
                    state: parsed.state || '',
                    country: parsed.country || '',
                    postalCode: parsed.postalCode || ''
                };
            }
        } catch (e) {
            // Fallback to Comma Separated (Legacy Format)
            const parts = employee.Employee_Current_Address__c.split(',').map((s: string) => s.trim());
            // Attempt to map mostly correctly, but without JSON it's ambiguous if parts are missing.
            // We'll map left-to-right to Street, City, State, Country, Zip
            employee.Employee_Current_Address__c = {
                street: parts[0] || '',
                city: parts[1] || '',
                state: parts[2] || '',
                country: parts[3] || '',
                postalCode: parts[4] || ''
            };
        }
    } else if (!employee.Employee_Current_Address__c) {
        employee.Employee_Current_Address__c = { street: '', city: '', state: '', country: '', postalCode: '' };
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

    const incomingEmployeeCode = typeof data.Employee_Id__c === 'string' ? data.Employee_Id__c.trim() : '';
    if (incomingEmployeeCode) {
      const allEmployees = await getAllEmployees();
      const normalizedIncomingCode = incomingEmployeeCode.toLowerCase();
      const duplicateEmployee = allEmployees.find((emp: any) => {
        const existingCode = String(emp.Employee_Id__c || emp.Employee_ID__c || '').trim().toLowerCase();
        return emp.Id !== id && existingCode === normalizedIncomingCode;
      });

      if (duplicateEmployee) {
        return NextResponse.json(
          { error: 'Employee ID already exists' },
          { status: 409 }
        );
      }
      data.Employee_Id__c = incomingEmployeeCode;
    }

    // Aggregate Address into JSON String for storage reliability
    if (data.Employee_Current_Address__c && typeof data.Employee_Current_Address__c === 'object') {
        data.Employee_Current_Address__c = JSON.stringify(data.Employee_Current_Address__c);
    }

    // Validation: if Title__c is being changed, check if it's changing away from "Team Lead"
    // and if so, ensure this employee is not assigned as Team Lead for any other employee.
    if (data.Title__c !== undefined) {
      try {
        const currentEmp = await getEmployeeById(id);
        const currentTitle = (currentEmp?.Title__c || '').toString().trim().toLowerCase();
        const incomingTitle = (data.Title__c || '').toString().trim().toLowerCase();

        // Only validate if title is actually changing and moving away from "Team Lead"
        if (currentTitle === 'team lead' && incomingTitle !== 'team lead') {
          const reports = await getEmployeesByTeamLead(id);
          if (reports && reports.length > 0) {
            return NextResponse.json(
              { error: `Cannot change title: employee is Team Lead for ${reports.length} employee(s). Reassign their Team Lead first.` },
              { status: 400 }
            );
          }
        }
      } catch (err) {
        console.error('Error validating team lead reassignment:', err);
        // Non-fatal — proceed to update (but log the issue)
      }
    }

    await updateEmployee(id, data);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating employee:', error);
    return NextResponse.json({ error: 'Failed to update employee' }, { status: 500 });
  }
}
