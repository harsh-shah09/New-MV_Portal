
import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import { createBankDetail, deleteBankDetail, updateBankDetail } from '@/lib/salesforce';
import { sendEmail, getHREmail } from '@/lib/email';
import { loadTemplate } from '@/lib/email-templates'; // We might need to export loadTemplate or just load it

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await verifySession();
    if (!session || !session.employeeId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    
    // Body should contain: Name (Bank Name), Bank_Branch_Name__c, Bank_Account_Number__c, IFSC__c, Primary_Account__c
    // And we need to append Employee__c
    
    const bankData = {
        ...body,
        Employee__c: id,
        Status__c: 'Pending'
    };

    await createBankDetail(bankData);

    const hrEmail = await getHREmail();
    if (hrEmail) {
        try {
            let bodyHtml = await loadTemplate('Bank-Approval-Pending', {
                recipientName: 'HR Team',
                employeeName: session.name, // Better to pass name if available, but id works for now or fetch employee
                // Add bank details if applicable
            });
            bodyHtml = bodyHtml.replace('{{employeeId}}', session.name);
            bodyHtml = bodyHtml.replace('{{department}}', body.Department__c);
            bodyHtml = bodyHtml.replace('{{bankName}}', body.Name);
            bodyHtml = bodyHtml.replace('{{bankBranchName}}', body.Bank_Branch_Name__c);
            bodyHtml = bodyHtml.replace('{{accountNumber}}', body.Bank_Account_Number__c);
            bodyHtml = bodyHtml.replace('{{ifscCode}}', body.IFSC__c);
            bodyHtml = bodyHtml.replace('{{accountHolderName}}', session.name);
            await sendEmail({
                to: hrEmail,
                subject: 'New Bank Account Added - Pending Verification',
                body: bodyHtml,
                contentType: 'text/html',
                isInfo: true
            });
        } catch (emailError) {
            console.error('Error sending Bank-Approval-Pending email:', emailError);
        }
    }

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

export async function PUT(
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
    const { bankId, primaryAccount } = body as { bankId?: string; primaryAccount?: boolean };

    if (!bankId) {
      return NextResponse.json({ error: 'Bank ID is required' }, { status: 400 });
    }

    if (primaryAccount !== true) {
      return NextResponse.json({ error: 'Only setting primary account is supported' }, { status: 400 });
    }

    await updateBankDetail({
      Id: bankId,
      Employee__c: id,
      Primary_Account__c: true,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating bank detail:', error);
    return NextResponse.json({ error: 'Failed to update bank detail' }, { status: 500 });
  }
}
