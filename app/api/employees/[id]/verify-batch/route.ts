import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import { getSalesforceConnection, updateBankDetail, updateDocument, createNotification, getEmployeeById, deleteDocument } from '@/lib/salesforce';
import { sendEmail } from '@/lib/email';
import { loadTemplate } from '@/lib/email-templates';
import { setOnboardingStep, setFirstTimeLogin, setOnboardingCompleted } from '@/lib/dynamodb';

type VerificationItem = {
    type: 'bank' | 'document';
    id: string;
    action: 'approve' | 'reject';
    /** Extra bank metadata used in email (sent from UI) */
    bankName?: string;
    bankAccountNumber?: string;
    documentName?: string;
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
                if (item.action === 'approve') {
                    updateData.Primary_Account__c = true;
                    updateData.Employee__c = employeeId;
                }
                await updateBankDetail(updateData);

                // Notify employee
                await createNotification({
                    Employee__c: employeeId,
                    Message__c: `Your bank account (${item.bankName || 'Bank Account'}) has been ${status.toLowerCase()}.`,
                    Notification_Type__c: 'Bank_Verification',
                    Action_Required__c: false,
                    Status__c: 'Unread',
                    Action_Taken__c: status,
                    Comments__c: '',
                });
            } else {
                await updateDocument({ Id: item.id, Status__c: status });

                // Notify employee
                await createNotification({
                    Employee__c: employeeId,
                    Message__c: `Your document "${item.documentName || 'Document'}" has been ${status.toLowerCase()}.`,
                    Notification_Type__c: 'Document_Verification',
                    Action_Required__c: false,
                    Status__c: 'Unread',
                    Action_Taken__c: status,
                    Comments__c: '',
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

            if (personalEmail) {
                const rejectedBanks = allBanks.filter((b: any) => b.Status__c === 'Rejected');
                const rejectedDocs = allDocs.filter((d: any) => d.Status__c === 'Rejected');

                // Build masked bank detail lines
                const bankLines = rejectedBanks
                    .map((b: any) => `${b.Name || 'Bank'} — ${maskAccountNumber(b.Bank_Account_Number__c)}`)
                    .join('<br/>');

                const docLines = rejectedDocs
                    .map((d: any) => d.Document_Type__c || 'Document')
                    .join('<br/>');

                const rejectionSummary = [
                    bankLines && `<br/><strong>Bank Accounts:</strong><br/>${bankLines}`,
                    docLines && `<br/><strong>Documents:</strong><br/>${docLines}`,
                ]
                    .filter(Boolean)
                    .join('<br/><br/>');

                try {
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
                    const appLink = `${process.env.NEXTAUTH_URL || ''}/welcome?id=${employeeId}&token=${encodedToken}`;

                    // Re-use Document_Rejected template; replace {{BankDetails}} placeholder
                    let html = await loadTemplate('Document_Rejected', {
                        employeeEmail: personalEmail,
                        employeeId: employee.Employee_Id__c || employeeId,
                        employeeName: employee.Employee_Name__c || 'Employee',
                        recipientName: employee.Employee_Name__c || 'Employee',
                        endDate: new Date().toLocaleDateString(),
                        appLink: appLink,
                        documentName: rejectionSummary,
                    });

                    // Extra token replacement for bank details block
                    html = html.replace(/\{\{BankDetails\}\}/gi, bankLines || '-');

                    await sendEmail({
                        to: personalEmail,
                        subject: 'Action Required: Verification Rejected',
                        body: html,
                        contentType: 'text/html',
                        isInfo: true,
                    });

                    // Reset onboarding state so the wizard re-opens at the correct step (3 or 4)
                    await Promise.all([
                        setOnboardingStep(employeeId, targetStep),
                        setFirstTimeLogin(employeeId, true),
                        setOnboardingCompleted(employeeId, false),
                    ]);
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
