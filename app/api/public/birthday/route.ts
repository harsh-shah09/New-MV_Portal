import { NextResponse } from 'next/server';
import { getSalesforceConnection } from '@/lib/salesforce';
import { sendEmail } from '@/lib/email';

async function handleBirthdayCheck() {
    try {
        const conn = await getSalesforceConnection();
        if (!conn) {
            return NextResponse.json({ error: 'Failed to connect to Salesforce' }, { status: 500 });
        }

        // Query active employees with email and birthdate
        const query = `
            SELECT Id, Employee_Name__c, Company_Email__c, Birthdate__c, Name
            FROM Employee__c
            WHERE Active__c = true AND Company_Email__c != null AND Birthdate__c != null
        `;
        const result = await conn.query<any>(query);

        const today = new Date();
        const todayMonth = today.getMonth() + 1; // getMonth is 0-indexed
        const todayDay = today.getDate();

        // Filter employees whose birthday is today
        const birthdayEmployees = (result.records || []).filter((emp: any) => {
            if (!emp.Birthdate__c) return false;
            const dob = new Date(emp.Birthdate__c);
            if (isNaN(dob.getTime())) return false;
            return (dob.getMonth() + 1) === todayMonth && dob.getDate() === todayDay;
        });

        if (birthdayEmployees.length === 0) {
            return NextResponse.json({ message: 'No birthdays today', sentCount: 0 });
        }

        // Fetch the Birthday email template
        let templateHtml = '';
        let subject = 'Happy Birthday!';

        // Try Custom Metadata first
        try {
            const mdtTemplateRes = await conn.query<any>(`
                SELECT Value__c 
                FROM Email_Templates__mdt 
                WHERE DeveloperName = 'Birthday_Wishes_Template' 
                LIMIT 1
            `);
            if (mdtTemplateRes.records && mdtTemplateRes.records.length > 0) {
                templateHtml = mdtTemplateRes.records[0].Value__c || '';
            }
        } catch (err) {
            console.warn('Could not fetch from Email_Templates__mdt:', err);
        }

        // Try standard EmailTemplate if custom metadata was not found/configured
        if (!templateHtml) {
            try {
                const templateRes = await conn.query<any>(`
                    SELECT HtmlValue, Subject 
                    FROM EmailTemplate 
                    WHERE DeveloperName = 'Birthday_Wishes_Template' 
                    LIMIT 1
                `);
                if (templateRes.records && templateRes.records.length > 0) {
                    templateHtml = templateRes.records[0].HtmlValue || '';
                    subject = templateRes.records[0].Subject || subject;
                }
            } catch (err) {
                console.error('Could not fetch template from standard EmailTemplate:', err);
            }
        }

        // Default HTML template if none is found in Salesforce
        const defaultTemplate = `
            <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6; max-width: 600px; margin: 40px auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
                <h2 style="color: #4f46e5; text-align: center;">Happy Birthday! 🎂</h2>
                <p>Dear {{Employee_Name__c}},</p>
                <p>On behalf of the entire team, we want to wish you a very Happy Birthday! We hope you have a fantastic day filled with joy, laughter, and success.</p>
                <p style="margin-top: 24px; font-weight: bold;">Best regards,<br/>MV Clouds Team</p>
            </div>
        `;

        const finalTemplate = templateHtml || defaultTemplate;
        const sentList: string[] = [];

        for (const emp of birthdayEmployees) {
            let customizedHtml = finalTemplate;
            customizedHtml = customizedHtml.replace(/\{\{Employee_Name__c\}\}/g, emp.Employee_Name__c || emp.Name || 'Employee');
            customizedHtml = customizedHtml.replace(/\{\{Name\}\}/g, emp.Employee_Name__c || emp.Name || 'Employee');
            customizedHtml = customizedHtml.replace(/\{!Employee__c\.Employee_Name__c\}/g, emp.Employee_Name__c || emp.Name || 'Employee');

            let customizedSubject = subject;
            customizedSubject = customizedSubject.replace(/\{\{Employee_Name__c\}\}/g, emp.Employee_Name__c || emp.Name || 'Employee');
            customizedSubject = customizedSubject.replace(/\{\{Name\}\}/g, emp.Employee_Name__c || emp.Name || 'Employee');

            // Send via the info mail transporter (using settings configuration)
            await sendEmail({
                to: emp.Company_Email__c,
                subject: customizedSubject,
                body: customizedHtml,
                contentType: 'text/html',
                isInfo: true
            });

            sentList.push(emp.Company_Email__c);
        }

        return NextResponse.json({
            message: `Successfully processed birthdays`,
            sentCount: sentList.length,
            recipients: sentList
        });

    } catch (error: any) {
        console.error('Error processing birthday reminder endpoint:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

export async function GET(req: Request) {
    return handleBirthdayCheck();
}

export async function POST(req: Request) {
    return handleBirthdayCheck();
}
