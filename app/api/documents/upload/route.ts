
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
        const conn = await getSalesforceConnection();
        if (!conn) return NextResponse.json({ error: 'No Salesforce connection' }, { status: 500 });

        const docQuery = `
          SELECT Id, Name, Employee__c, Employee__r.Employee_Name__c, Document_Type__c
          FROM Document__c
          WHERE Id = '${documentId}'
          LIMIT 1
        `;
        const docRes = await conn.query(docQuery);
        const doc = docRes.records?.[0] as any;
        if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 });

        const getFileExtension = (name: string) => {
            const lastDotIndex = name.lastIndexOf('.');
            return lastDotIndex > -1 ? name.slice(lastDotIndex) : '';
        };

        const sanitizeSegment = (value: string) =>
            value
                .trim()
                .replace(/[^a-zA-Z0-9 ]/g, '')
                .replace(/\s+/g, '_')
                .replace(/_+/g, '_')
                .replace(/^_+|_+$/g, '');

        const extension = getFileExtension(file.name);
        const docName = sanitizeSegment(doc.Document_Type__c || doc.Name || 'Document') || 'Document';
        const employeeName = sanitizeSegment(doc.Employee__r?.Employee_Name__c || 'Employee') || 'Employee';
        const uploadFileName = `${docName}_${employeeName}${extension}`;

        const buffer = Buffer.from(await file.arrayBuffer());
        // Upload to S3
        const fileUrl = await uploadFileToS3(buffer, uploadFileName, file.type);
        
        // Update Document Record
        await updateDocument({
            Id: documentId,
            Status__c: 'Uploaded',
            File_URL__c: fileUrl
        });

                // Notify Employee
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

                // Notify all Admin users to verify HR-uploaded documents
                const adminRes = await conn.query(`SELECT Id FROM Employee__c WHERE Role__c = 'Admin' AND Active__c = true LIMIT 50`);
                const adminIds = (adminRes.records || []).map((a: any) => a.Id).filter(Boolean);
                if (adminIds.length > 0) {
                    await Promise.all(
                        adminIds.map((adminId: string) =>
                            createNotification({
                                Message__c: `HR uploaded document ${doc.Document_Type__c || doc.Name || 'Document'} and it requires Admin verification.`,
                                Action_Required__c: true,
                                Status__c: 'Unread',
                                Employee__c: adminId,
                                Notification_Type__c: 'Document_Review',
                                Action_Taken__c: 'Uploaded',
                                Comments__c: 'Requires Admin verification'
                            })
                        )
                    );
                }

                // Notify HR uploader as acknowledgement
                if (session.employeeId) {
                    await createNotification({
                        Message__c: `You uploaded ${doc.Document_Type__c || doc.Name || 'Document'} and sent it for Admin verification.`,
                        Action_Required__c: false,
                        Status__c: 'Unread',
                        Employee__c: session.employeeId,
                        Notification_Type__c: 'Document_Review',
                        Action_Taken__c: 'Uploaded',
                    });
                }
        }

        return NextResponse.json({ success: true, url: fileUrl });

    } catch (e: any) {
        console.error("Upload Error", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
