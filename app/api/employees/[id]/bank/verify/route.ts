import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import { updateBankDetail, getEmployeeById } from '@/lib/salesforce';
import { sendEmail, getHREmail } from '@/lib/email';
import { loadTemplate } from '@/lib/email-templates';

export async function PATCH(
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
    const { bankId, action } = body as { bankId: string; action: 'approve' | 'reject' };

    if (!bankId || !action) {
      return NextResponse.json({ error: 'Bank ID and action are required' }, { status: 400 });
    }

    const status = action === 'approve' ? 'Verified' : 'Rejected';

    const updateData: any = {
      Id: bankId,
      Status__c: status,
    };
    
    // Automatically make it primary if approved, and ensure other accounts are demoted
    if (action === 'approve') {
       updateData.Primary_Account__c = true;
       updateData.Employee__c = id;
    }

    await updateBankDetail(updateData);

    // Send email to employee if verified
    if (action === 'approve') {
      const employee = await getEmployeeById(id);
      if (employee?.Company_Email__c) {
          try {
              let bodyHtml = await loadTemplate('Bank-Approval', {
                  recipientName: employee.Employee_Name__c || 'Employee',
                  employeeName: employee.Employee_Name__c || 'Employee',
              }); 
            bodyHtml = bodyHtml.replace('{{employeeId}}', employee.Employee_Id__c);
              bodyHtml = bodyHtml.replace('{{bankName}}', body.Name);
              bodyHtml = bodyHtml.replace('{{bankBranchName}}', body.Bank_Branch_Name__c);
              bodyHtml = bodyHtml.replace('{{accountNumber}}', body.Bank_Account_Number__c);
              bodyHtml = bodyHtml.replace('{{ifscCode}}', body.IFSC__c);
              bodyHtml = bodyHtml.replace('{{accountHolderName}}', employee.Employee_Name__c);
              await sendEmail({
                  to: employee.Company_Email__c,
                  subject: 'Bank Account Verified Successfully',
                  body: bodyHtml,
                  contentType: 'text/html',
                  isInfo: true
              });
          } catch (emailError) {
              console.error('Error sending Bank-Approval email:', emailError);
          }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error verifying bank detail:', error);
    return NextResponse.json({ error: 'Failed to verify bank detail' }, { status: 500 });
  }
}
