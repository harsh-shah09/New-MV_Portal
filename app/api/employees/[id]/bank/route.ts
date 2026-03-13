
import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import { createBankDetail, deleteBankDetail } from '@/lib/salesforce';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await verifySession();
    if (!session || !session.employeeId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['HR', 'Admin'].includes(session.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    
    // Body should contain: Name (Bank Name), Bank_Branch_Name__c, Bank_Account_Number__c, IFSC__c, Primary_Account__c
    // And we need to append Employee__c
    
    const bankData = {
        ...body,
        Employee__c: id
    };

    await createBankDetail(bankData);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error creating bank detail:', error);
    return NextResponse.json({ error: 'Failed to create bank detail' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const bankId = searchParams.get('bankId');

    if (!bankId) {
        return NextResponse.json({ error: 'Bank ID is required' }, { status: 400 });
    }

    // Optional: Check if bank detail belongs to employee 'id' if needed for security
    // JSForce .destroy() will fail if id is invalid anyway.

    await deleteBankDetail(bankId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting bank detail:', error);
    return NextResponse.json({ error: 'Failed to delete bank detail' }, { status: 500 });
  }
}
