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
