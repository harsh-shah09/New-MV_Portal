import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import { getSalesforceConnection, updateBankDetail, updateDocument, createNotification, getEmployeeById, deleteDocument } from '@/lib/salesforce';
import { sendEmail } from '@/lib/email';
import { loadTemplate } from '@/lib/email-templates';
import { setOnboardingStep, setFirstTimeLogin, setOnboardingCompleted } from '@/lib/dynamodb';
import { getAdminSettingValue } from '@/lib/admin-settings';

type VerificationItem = {
    type: 'bank' | 'document';
    id: string;
    action: 'approve' | 'reject';
    /** Extra bank metadata used in email (sent from UI) */
    bankName?: string;
    bankAccountNumber?: string;
    documentName?: string;
    rejectionReason?: string;
};

/** Mask bank account: ****1234 */
const maskAccountNumber = (raw?: string) => {
    if (!raw) return '****';
    const s = raw.toString().replace(/\D/g, '');
    if (s.length <= 4) return `****${s}`;
    return `${'*'.repeat(s.length - 4)}${s.slice(-4)}`;
};

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await verifySession();
        if (!session?.employeeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        if (!['HR', 'Admin'].includes(session.role)) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

        const { id: employeeId } = await params;
        const { items } = (await req.json()) as { items: VerificationItem[] };

        if (!items || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ error: 'No items to verify' }, { status: 400 });
        }

        const conn = await getSalesforceConnection();
        if (!conn) return NextResponse.json({ error: 'No Salesforce connection' }, { status: 500 });

        // ── 1. Apply all verifications ─────────────────────────────────────
        for (const item of items) {
            const status = item.action === 'approve' ? 'Verified' : 'Rejected';

            if (item.type === 'bank') {
                const updateData: any = { Id: item.id, Status__c: status };
                if (item.action === 'reject' && item.rejectionReason) {
                    updateData.Rejection_Reason__c = item.rejectionReason;
                }
                if (item.action === 'approve') {
                    updateData.Primary_Account__c = true;
                    updateData.Employee__c = employeeId;
                }
                if (item.action === 'reject') {
                    updateData.Primary_Account__c = false;
                }
                await updateBankDetail(updateData);

                if (item.action === 'reject') {
                    // Find the most recent other bank account of this employee to make primary
                    const otherBanksQuery = `
                        SELECT Id, Status__c, Primary_Account__c, CreatedDate
                        FROM Bank_Detail__c
                        WHERE Employee__c = '${employeeId}' AND Id != '${item.id}' AND Status__c != 'Rejected'
                        ORDER BY CreatedDate DESC
                    `;
                    const otherBanksResult = await conn.query(otherBanksQuery);
                    if (otherBanksResult.records.length > 0) {
                        const mostRecentBank = otherBanksResult.records[0] as any;
                        await updateBankDetail({
                            Id: mostRecentBank.Id,
                            Primary_Account__c: true,
                            Employee__c: employeeId
                        });
                    }
                }

                // Notify employee
                await createNotification({
                    Employee__c: employeeId,
                    Message__c: `Your bank account (${item.bankName || 'Bank Account'}) has been ${status.toLowerCase()}.`,
                    Notification_Type__c: 'Bank_Verification',
                    Action_Required__c: false,
                    Status__c: 'Unread',
                    Action_Taken__c: status,
                    Comments__c: item.rejectionReason || '',
                });
            } else {
                const documentUpdate: any = { Id: item.id, Status__c: status };
                if (item.action === 'reject' && item.rejectionReason) {
                    documentUpdate.Rejection_Reason__c = item.rejectionReason;
                }
                await updateDocument(documentUpdate);

                // Notify employee
                await createNotification({
                    Employee__c: employeeId,
                    Message__c: `Your document "${item.documentName || 'Document'}" has been ${status.toLowerCase()}.`,
                    Notification_Type__c: 'Document_Verification',
                    Action_Required__c: false,
                    Status__c: 'Unread',
                    Action_Taken__c: status,
                    Comments__c: item.rejectionReason || '',
                });
            }
        }

        // ── 2. Re-fetch employee with updated bank + document records ──────
        const employee = await getEmployeeById(employeeId);
        if (!employee) return NextResponse.json({ success: true });

        const allBanks: any[] = employee.bankDetails || [];
        const allDocs: any[] = (employee.documents || []).filter(
            (d: any) => d.Document_Type__c?.toLowerCase() !== 'payslip'
        );

        // ── 3. Check if anything is still Pending / Uploaded (not decided) ─
        const hasPendingBank = allBanks.some(
            (b: any) => !b.Status__c || b.Status__c === 'Pending'
        );
        const hasPendingDoc = allDocs.some(
            (d: any) => !d.Status__c || d.Status__c === 'Uploaded'
        );

        const hasRejectedBank = allBanks.some((b: any) => b.Status__c === 'Rejected');
        const hasRejectedDoc = allDocs.some((d: any) => d.Status__c === 'Rejected');
        const anyRejected = hasRejectedBank || hasRejectedDoc;

        // Only send the consolidated rejection email when:
        // - All banks AND docs are fully decided (nothing pending)
        // - At least one is rejected
        if (!hasPendingBank && !hasPendingDoc && anyRejected) {
            const personalEmail = employee.Employee_Email__c;
            const companyEmail = employee.Company_Email__c;
            const isEmployeeActive = employee.Active__c === true;
            const emailToSend = isEmployeeActive ? (companyEmail || personalEmail) : personalEmail;

            if (emailToSend) {
                const rejectedBanks = allBanks.filter((b: any) => b.Status__c === 'Rejected');
                const rejectedDocs = allDocs.filter((d: any) => d.Status__c === 'Rejected');

                const rejectedDocsTable = `
                    <table width="100%" style="border-collapse: collapse;">
                        <thead>
                            <tr>
                                <th style="text-align:left;padding:6px 8px;border:1px solid #fecaca;background:#fee2e2;font-size:12px;">Type</th>
                                <th style="text-align:left;padding:6px 8px;border:1px solid #fecaca;background:#fee2e2;font-size:12px;">Name</th>
                                <th style="text-align:left;padding:6px 8px;border:1px solid #fecaca;background:#fee2e2;font-size:12px;">Reason</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${[
                                ...rejectedBanks.map((b: any) => ({
                                    type: 'Bank',
                                    name: `${b.Name || 'Bank'} — ${maskAccountNumber(b.Bank_Account_Number__c)}`,
                                    reason: b.Rejection_Reason__c || '-'
                                })),
                                ...rejectedDocs.map((d: any) => ({
                                    type: 'Document',
                                    name: d.Document_Type__c || 'Document',
                                    reason: d.Rejection_Reason__c || '-'
                                })),
                            ]
                                .map((item) => `
                                    <tr>
                                        <td style="padding:6px 8px;border:1px solid #fecaca;font-size:12px;">${item.type}</td>
                                        <td style="padding:6px 8px;border:1px solid #fecaca;font-size:12px;">${item.name}</td>
                                        <td style="padding:6px 8px;border:1px solid #fecaca;font-size:12px;">${item.reason}</td>
                                    </tr>
                                `)
                                .join('')}
                        </tbody>
                    </table>
                `.trim();

                const rejectionSummary = [rejectedDocsTable]
                    .filter(Boolean)
                    .join('<br/><br/>');

                try {
                    const settingsNextAuthUrl = await getAdminSettingValue('NEXTAUTH_URL');
                    let appLink = '';
                    if (isEmployeeActive) {
                        appLink = `${settingsNextAuthUrl || process.env.NEXTAUTH_URL || ''}/employees/${employeeId}?tab=bank`;
                    } else {
                        // Determine which step to send the user back to.
                        // If any bank or passbook is rejected, send to step 3 (Passbook).
                        // Otherwise, if only other documents are rejected, send to step 4 (Documents).
                        const isBankOrPassbookRejected =
                            hasRejectedBank || rejectedDocs.some((d: any) => d.Document_Type__c === 'Passbook');
                        const targetStep = isBankOrPassbookRejected ? 3 : 4;

                        const tokenData = {
                            expirationtime: Date.now() + 48 * 60 * 60 * 1000,
                            firsttime: false,
                            step: targetStep
                        };
                        const encodedToken = btoa(JSON.stringify(tokenData));
                        appLink = `${settingsNextAuthUrl || process.env.NEXTAUTH_URL || ''}/welcome?id=${employeeId}&token=${encodedToken}`;
                    }

                    // Re-use Document_Rejected template; replace table placeholders
                    let html = await loadTemplate('Document_Rejected', {
                        employeeEmail: emailToSend,
                        employeeId: employee.Employee_Id__c || employeeId,
                        employeeName: employee.Employee_Name__c || 'Employee',
                        recipientName: employee.Employee_Name__c || 'Employee',
                        endDate: new Date().toLocaleDateString(),
                        appLink: appLink,
                        documentName: rejectionSummary,
                    });

                    // Extra token replacement for table block
                    html = html.replace(/\{\{RejectedDocumentsTable\}\}/gi, rejectedDocsTable);

                    await sendEmail({
                        to: emailToSend,
                        subject: 'Action Required: Verification Rejected',
                        body: html,
                        contentType: 'text/html',
                        isInfo: true,
                    });

                    if (!isEmployeeActive) {
                        const isBankOrPassbookRejected =
                            hasRejectedBank || rejectedDocs.some((d: any) => d.Document_Type__c === 'Passbook');
                        const targetStep = isBankOrPassbookRejected ? 3 : 4;
                        // Reset onboarding state so the wizard re-opens at the correct step (3 or 4)
                        await Promise.all([
                            setOnboardingStep(employeeId, targetStep),
                            setFirstTimeLogin(employeeId, true),
                            setOnboardingCompleted(employeeId, false),
                        ]);
                    }
                } catch (emailErr) {
                    console.error('Failed to send consolidated rejection email:', emailErr);
                }
            }
        }

        return NextResponse.json({ success: true, emailSent: !hasPendingBank && !hasPendingDoc && anyRejected });
    } catch (error: any) {
        console.error('Batch verify error:', error);
        return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 });
    }
}
