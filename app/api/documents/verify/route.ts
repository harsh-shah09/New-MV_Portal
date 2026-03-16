import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import { createNotification, getSalesforceConnection, updateDocument } from '@/lib/salesforce';

export async function PATCH(req: Request) {
  try {
    const session = await verifySession();
    if (!session || !session.employeeId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['HR', 'Admin'].includes(session.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await req.json();
    const { documentId, action, reason } = body as {
      documentId?: string;
      action?: 'approve' | 'reject';
      reason?: string;
    };

    if (!documentId || !action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const conn = await getSalesforceConnection();
    if (!conn) return NextResponse.json({ error: 'No Salesforce connection' }, { status: 500 });

    const docQuery = `
      SELECT Id, Name, Document_Type__c, Status__c, Employee__c, Employee__r.Employee_Name__c, Employee__r.Role__c
      FROM Document__c
      WHERE Id = '${documentId}'
      LIMIT 1
    `;

    const docResult = await conn.query(docQuery);
    const doc = docResult.records?.[0] as any;

    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    if (doc.Status__c !== 'Uploaded') {
      return NextResponse.json({ error: 'Only uploaded documents can be verified' }, { status: 400 });
    }

    // Rule:
    // - HR verifies non-HR employee docs
    // - Admin verifies HR employee docs
    const employeeRole = doc.Employee__r?.Role__c || '';
    if (employeeRole === 'HR' && session.role !== 'Admin') {
      return NextResponse.json({ error: 'Only Admin can verify HR documents' }, { status: 403 });
    }
    if (employeeRole !== 'HR' && session.role !== 'HR' && session.role !== 'Admin') {
      return NextResponse.json({ error: 'Only HR/Admin can verify documents' }, { status: 403 });
    }

    const nextStatus = action === 'approve' ? 'Verified' : 'Rejected';

    await updateDocument({
      Id: documentId,
      Status__c: nextStatus,
    });

    // Notify employee
    if (doc.Employee__c) {
      await createNotification({
        Employee__c: doc.Employee__c,
        Message__c: `Your document ${doc.Document_Type__c || doc.Name || 'Document'} has been ${nextStatus.toLowerCase()}.`,
        Notification_Type__c: 'Document_Verification',
        Action_Required__c: false,
        Status__c: 'Unread',
        Action_Taken__c: nextStatus,
        Comments__c: reason || '',
      });
    }

    // Notify verifier for audit visibility
    await createNotification({
      Employee__c: session.employeeId,
      Message__c: `You ${action === 'approve' ? 'approved' : 'rejected'} document ${doc.Document_Type__c || doc.Name || 'Document'}.`,
      Notification_Type__c: 'Document_Verification',
      Action_Required__c: false,
      Status__c: 'Unread',
      Action_Taken__c: nextStatus,
      Comments__c: reason || '',
    });

    return NextResponse.json({ success: true, status: nextStatus });
  } catch (error: any) {
    console.error('Error verifying document:', error);
    return NextResponse.json({ error: error.message || 'Failed to verify document' }, { status: 500 });
  }
}
