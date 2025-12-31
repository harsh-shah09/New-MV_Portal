
import { NextResponse } from 'next/server';
import { createBankDetail } from '@/lib/salesforce';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
