
import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import { updateEmployee, getEmployeeById } from '@/lib/salesforce';
import { sendEmail } from '@/lib/email';
import { welcomeEmail } from '@/lib/email-templates';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const session = await verifySession();
        if (!session || !['HR', 'Admin'].includes(session.role as string)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const { active } = await req.json(); // expected boolean
        // 1. Update Salesforce
        await updateEmployee(id, { 
            Active__c: active,
            Pass_Reset_Active__c: active // Enable password setup if activating
        });

        // 2. If Activating, Send Welcome Email
        if (active) {
            const employee = await getEmployeeById(id);
            if (employee && employee.Employee_Email__c) {
                // Generate setup link (pointing to our auth setup page)
                // In a real app we'd generate a secure token here.
                // Using a placeholder token logic for demonstration or implicit current user check on that page.
                // Or passing ID to the page to 'initiate' the flow.
                const setupLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/welcome?id=${employee.Id}`;
                
                let { subject, html, text } = await welcomeEmail({
                    recipientName: employee.Employee_Name__c,
                    setupLink
                });

                if (employee.Employee_Id__c) {
                    html = html.replace(/{{Employee_Id}}/g, employee.Employee_Id__c);
                }

                await sendEmail({
                    to: employee.Company_Email__c,
                    subject,
                    body: html,
                    contentType: 'text/html',
                    isInfo : true
                });
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error toggling active status:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
