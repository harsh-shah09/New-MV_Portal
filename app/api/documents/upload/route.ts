
import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import { updateDocument, createNotification, getSalesforceConnection } from '@/lib/salesforce';
import { uploadFileToS3 } from '@/lib/s3';

export async function POST(req: Request) {
    const session = await verifySession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const documentId = formData.get('documentId') as string;

    if (!file || !documentId) return NextResponse.json({ error: 'Missing file or documentId' }, { status: 400 });

    try {
        const buffer = Buffer.from(await file.arrayBuffer());
        // Upload to S3
        const fileUrl = await uploadFileToS3(buffer, file.name, file.type);
        
        // Update Document Record
        await updateDocument({
            Id: documentId,
            Status__c: 'Uploaded',
            File_URL__c: fileUrl
        });

        // Notify Employee
        // First get the document to find the employee
        const conn = await getSalesforceConnection();
        if(conn) {
             const docQuery = `SELECT Name, Employee__c FROM Document__c WHERE Id = '${documentId}' LIMIT 1`; 
             const docRes = await conn.query(docQuery);
             const doc = docRes.records[0] as any;

             if (doc && doc.Employee__c) {
                await createNotification({
                    Message__c: `Your requested document ${doc.Name || 'Document'} is now available.`,
                    Action_Required__c: false,
                    Status__c: 'Unread',
                    Employee__c: doc.Employee__c,
                    Notification_Type__c: 'Document_Ready',
                    Action_Taken__c: 'Uploaded',
                    Comments__c: 'Document has been uploaded by HR.'
                });
             }
        }

        return NextResponse.json({ success: true, url: fileUrl });

    } catch (e: any) {
        console.error("Upload Error", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
