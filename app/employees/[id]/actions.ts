'use server'

import { generateTwoFactorSecret, generateQRCode, verifyTwoFactorToken } from '@/lib/two-factor';
import { saveTwoFactorSecret, updateEmployee2FAStatus, getEmployeeById, getSalesforceConnection } from '@/lib/salesforce';
import { revalidatePath } from 'next/cache';

export async function getEmployeeTitles() {
    const conn = await getSalesforceConnection();
    if (!conn) throw new Error("Salesforce connection failed");

    try {
        const describe = await conn.describe('Employee__c');
        const titleField = describe.fields.find((f: any) => f.name === 'Title__c');
        if (titleField && titleField.picklistValues) {
            return titleField.picklistValues.filter((v: any) => v.active).map((v: any) => ({ label: v.label, value: v.value }));
        }
        return [];
    } catch (e) {
        console.warn("Failed to fetch Employee describe information", e);
        return [];
    }
}


export async function generate2FASecretAction(employeeId: string) {
    // Ideally check session here to ensure user is editing their own profile or is admin
    const employee = await getEmployeeById(employeeId);
    if (!employee) return { error: "Employee not found" };
    
    const { secret, otpauth } = generateTwoFactorSecret(employee.Employee_Email__c || employee.Employee_Name__c);
    const qrCode = await generateQRCode(otpauth);
    
    return { secret, qrCode };
}

export async function verifyAndEnable2FAAction(employeeId: string, secret: string, token: string) {
    const isValid = verifyTwoFactorToken(token, secret);
    if (!isValid) return { error: "Invalid OTP" };

    try {
        await saveTwoFactorSecret(employeeId, secret);
        await updateEmployee2FAStatus(employeeId, true);
        revalidatePath(`/employees/${employeeId}`);
        return { success: true };
    } catch (e) {
        console.error(e);
        return { error: "Failed to enable 2FA" };
    }
}

export async function disable2FAAction(employeeId: string) {
    try {
        await updateEmployee2FAStatus(employeeId, false);
        revalidatePath(`/employees/${employeeId}`);
        return { success: true };
    } catch (e) {
        return { error: "Failed to disable 2FA" };
    }
}

import { sendEmail } from '@/lib/email';
import { loadTemplate, onboardingMail } from '@/lib/email-templates';
import { deleteBankDetail, deleteDocument } from '@/lib/salesforce';
import { setOnboardingStep, setFirstTimeLogin, setOnboardingCompleted } from '@/lib/dynamodb';

export async function sendWelcomeEmailAction(employeeId: string, email: string, name: string , empName : string) {
    try {
        // 1. Fetch employee to check for rejected documents/banks
        const employee = await getEmployeeById(employeeId);
        if (!employee) return { error: 'Employee not found' };

        const allBanks: any[] = employee.bankDetails || [];
        const allDocs: any[] = (employee.documents || []).filter(
            (d: any) => d.Document_Type__c?.toLowerCase() !== 'payslip'
        );

        const rejectedBanks = allBanks.filter((b: any) => b.Status__c === 'Rejected');
        const rejectedDocs = allDocs.filter((d: any) => d.Status__c === 'Rejected');

        // 2. If there are rejected items, delete them and send the rejection email instead
        if (rejectedBanks.length > 0 || rejectedDocs.length > 0) {
            // Delete rejected banks
            for (const bank of rejectedBanks) {
                await deleteBankDetail(bank.Id);
            }
            // Delete rejected documents (including passbook)
            for (const doc of rejectedDocs) {
                await deleteDocument(doc.Id);
            }

            // Build masked bank detail lines
            const maskAccountNumber = (raw?: string) => {
                if (!raw) return '****';
                const s = raw.toString().replace(/\D/g, '');
                if (s.length <= 4) return `****${s}`;
                return `${'*'.repeat(s.length - 4)}${s.slice(-4)}`;
            };

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

            // Send to step 3 if bank or passbook is rejected, else step 4
            const isBankOrPassbookRejected =
                rejectedBanks.length > 0 || rejectedDocs.some((d: any) => d.Document_Type__c === 'Passbook');
            const targetStep = isBankOrPassbookRejected ? 3 : 4;

            const tokenData = {
                expirationtime: Date.now() + 48 * 60 * 60 * 1000,
                firsttime: true,
                step: targetStep
            };
            const encodedToken = btoa(JSON.stringify(tokenData));
            const appLink = `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'}/welcome?id=${employeeId}&token=${encodedToken}`;

            let html = await loadTemplate('Document_Rejected', {
                employeeEmail: email,
                employeeId: empName || employeeId,
                employeeName: name,
                recipientName: name,
                endDate: new Date().toLocaleDateString(),
                appLink: appLink,
                documentName: rejectionSummary,
            });

            html = html.replace(/\{\{BankDetails\}\}/gi, bankLines || '-');

            await sendEmail({
                to: email,
                subject: 'Action Required: Verification Rejected',
                body: html,
                contentType: 'text/html',
                isInfo: true,
            });

            // Reset onboarding state so the wizard re-opens
            await Promise.all([
                setOnboardingStep(employeeId, targetStep),
                setFirstTimeLogin(employeeId, true),
                setOnboardingCompleted(employeeId, false),
            ]);

            return { success: true, emailType: 'rejected' };
        }

        // 3. Otherwise, if all are verified (or nothing is rejected), send normal welcome email
        const token = { expirationtime : Date.now() + 48 * 60 * 60 * 1000 , firsttime : true };
        const encryptedToken = btoa(JSON.stringify(token));
        const setupLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/welcome?id=${employeeId}&token=${encryptedToken}`;
        let { subject, html } = await onboardingMail({ recipientName: name, setupLink });
        
        if (empName) {
            html = html.replace(/{{Employee_Id}}/g, empName);
        }

        await sendEmail({
            to: email,
            subject,
            body: html,
            contentType: 'text/html',
            isInfo: true
        });
        return { success: true, emailType: 'welcome' };
    } catch (e) {
        console.error(e);
        return { error: "Failed to send welcome email" };
    }
}
