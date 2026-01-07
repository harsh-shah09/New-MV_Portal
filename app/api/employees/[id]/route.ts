
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

    await updateEmployee(id, data);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating employee:', error);
    return NextResponse.json({ error: 'Failed to update employee' }, { status: 500 });
  }
}
