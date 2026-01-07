
import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import { createDocumentRecord, createNotification, getSalesforceConnection } from '@/lib/salesforce';

export async function POST(req: Request) {
    const session = await verifySession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { documentType, comment } = body;

    if(!documentType) return NextResponse.json({ error: 'Document Type required' }, { status: 400 });

    try {
        // 1. Create Document Request (Pending)
        const docData = {
            Document_Type__c: documentType,
            Status__c: 'Pending',
            Employee__c: session.employeeId,
        };
        const docRes = await createDocumentRecord(docData);
        
        if (!(docRes as any).success) throw new Error("Failed to create document record");

        // 2. Find HR to notify
        const conn = await getSalesforceConnection();
        // Assuming there's a role 'HR' or similar. 
        // If not, we might need to rely on a specific user or skip this if no HR found.
        // We'll try to find someone with 'HR' in their role.
        if (conn) {
             const hrQuery = `SELECT Id FROM Employee__c WHERE Role__c LIKE '%HR%' LIMIT 1`; 
             const hrRes = await conn.query(hrQuery);
             const hrId = hrRes?.records[0]?.Id;

             if (hrId) {
                const notifData = {
                    Message__c: `Document Requested: ${documentType} by ${session.user?.name || 'Employee'}`,
                    Action_Required__c: true,
                    Status__c: 'Pending',
                    Employee__c: hrId, // Notify HR
                    Notification_Type__c: 'Document Request', 
                    Comments__c: comment || ''
                };
                await createNotification(notifData);
             }
        }

        return NextResponse.json({ success: true, id: (docRes as any).id });

    } catch (e: any) {
        console.error("Doc Request Error", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
