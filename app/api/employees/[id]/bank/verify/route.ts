import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import { updateBankDetail, getEmployeeById, getSalesforceConnection } from '@/lib/salesforce';
import { sendEmail, getHREmail } from '@/lib/email';
import { loadTemplate } from '@/lib/email-templates';
import { getAdminSettingValue } from '@/lib/admin-settings';

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
    const { bankId, action, reason } = body as { bankId: string; action: 'approve' | 'reject'; reason?: string; Name?: string };

    if (!bankId || !action) {
      return NextResponse.json({ error: 'Bank ID and action are required' }, { status: 400 });
    }

    const conn = await getSalesforceConnection();
    let isMarkedForApproval = false;
    let accountHolderName = '';

    if (action === 'approve') {
      const bankResult = await conn.query(`SELECT Id, Mark_for_Approval__c, Account_Holder_Name__c FROM Bank_Detail__c WHERE Id = '${bankId}' LIMIT 1`);
      if (bankResult.records.length > 0) {
        const record = bankResult.records[0] as any;
        isMarkedForApproval = record.Mark_for_Approval__c === true || record.Mark_for_Approval__c === 'true';
        accountHolderName = record.Account_Holder_Name__c || '';
      }
    }

    const status = action === 'approve' ? 'Verified' : 'Rejected';

    const updateData: any = {
      Id: bankId,
      Status__c: status,
    };

    if (action === 'reject' && reason) {
      updateData.Rejection_Reason__c = reason;
    }
    
    // Automatically make it primary if approved, and ensure other accounts are demoted
    if (action === 'approve') {
       if (isMarkedForApproval) {
          updateData.Primary_Account__c = true;
          updateData.Employee__c = id;
       } else {
          updateData.Primary_Account__c = false;
       }
    }

    if (action === 'reject') {
       updateData.Primary_Account__c = false;
    }

    await updateBankDetail(updateData);

    const employee = await getEmployeeById(id);

    // Send email to employee if verified
    if (action === 'approve') {
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
              bodyHtml = bodyHtml.replace('{{accountHolderName}}', accountHolderName || employee.Employee_Name__c || 'Employee');
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

    if (action === 'reject') {
      // Find the most recent other bank account of this employee to make primary
      const conn = await getSalesforceConnection();
      const otherBanksQuery = `
          SELECT Id, Status__c, Primary_Account__c, CreatedDate
          FROM Bank_Detail__c
          WHERE Employee__c = '${id}' AND Id != '${bankId}'
          ORDER BY CreatedDate DESC
      `;
      const otherBanksResult = await conn.query(otherBanksQuery);
      if (otherBanksResult.records.length > 0) {
          const mostRecentBank = otherBanksResult.records[0] as any;
          await updateBankDetail({
              Id: mostRecentBank.Id,
              Primary_Account__c: true,
              Employee__c: id
          });
      }

      // If active, send email
      const active = employee?.Active__c === true;
      const emailToSend = active ? (employee?.Company_Email__c || employee?.Employee_Email__c) : employee?.Employee_Email__c;
      if (emailToSend) {
        try {
          const settingsNextAuthUrl = await getAdminSettingValue('NEXTAUTH_URL');
          const template = await loadTemplate('Document_Rejected', {
            employeeEmail: emailToSend,
            employeeId: employee.Employee_Id__c || id,
            employeeName: employee.Employee_Name__c || 'Employee',
            endDate: new Date().toLocaleDateString(),
            recipientName: employee.Employee_Name__c || 'Employee',
            appLink: (settingsNextAuthUrl || process.env.NEXTAUTH_URL || '') + `/employees/${id}?tab=bank`,
            documentName: body.Name || 'Bank Account',
          });
          await sendEmail({
            isInfo: true,
            to: emailToSend,
            body: template,
            subject: `Bank Account Verification - ${body.Name || 'Bank Account'} - REJECTED`,
          });
        } catch (emailError) {
          console.error('Error sending Bank Rejection email:', emailError);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error verifying bank detail:', error);
    return NextResponse.json({ error: 'Failed to verify bank detail' }, { status: 500 });
  }
}
