
import { NextResponse } from 'next/server';
import { uploadFileToS3 } from '@/lib/s3';
import { getEmployeeById, createDocumentRecord, updateEmployee, deleteDocument, getDocumentsByEmployee, updateDocument, createNotification, getSalesforceConnection } from '@/lib/salesforce';
import { verifySession } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const session = await verifySession();
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const employeeId = formData.get('employeeId') as string;
    const type = formData.get('type') as string; // 'profile_photo' or 'document'
    const category = formData.get('category') as string;
    const docType = formData.get('docType') as string;
    
    if (!file || !employeeId) {
      return NextResponse.json({ error: 'Missing file or employeeId' }, { status: 400 });
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    const contentType = file.type;

    // Get Employee Name for Folder
    const employee = await getEmployeeById(employeeId);
    if (!employee) {
         return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }
    const empName = employee.Employee_Name__c || employee.Employee_Id__c || 'Unknown';
    // Sanitize folder name: remove special chars, replace spaces with underscores
    const safeEmpName = empName.replace(/[^a-zA-Z0-9 ]/g, "").replace(/\s+/g, "_");

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
    const sanitizedEmployeeName = sanitizeSegment(empName) || 'Employee';
    const sanitizedDocumentName = sanitizeSegment(docType || 'Document') || 'Document';
    const uploadFileName = type === 'document'
      ? `${sanitizedDocumentName}_${sanitizedEmployeeName}${extension}`
      : file.name;
    
    // Upload to S3 with dynamic folder
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    if (!allowedTypes.includes(contentType)) {
        // return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }

    const s3Url = await uploadFileToS3(buffer, uploadFileName, contentType, safeEmpName);

    // Create Document__c record in Salesforce
    // Fields: Employee__c, Document_Type__c, Document_category__c, File_ID__c, File_URL__c, Status__c
    // Mapping:
    // Document_Type__c = type (e.g. 'Profile Photo', 'Resume')
    // Document_category__c = 'Personal' (generic?)
    // File_URL__c = s3Url
    // Status__c = 'Active'

    // If it's a profile photo, update the Employee__c record
    if (type === 'profile_photo') {
        const empUpdate = { Profile_Photo__c: s3Url };
        await updateEmployee(employeeId, empUpdate);
    }else{
        const normalizedType = (docType || 'Document').trim().toLowerCase();
        const existingDocs = await getDocumentsByEmployee(employeeId);
        const existingDoc = existingDocs.find(
          (doc: any) => (doc.Document_Type__c || '').trim().toLowerCase() === normalizedType
        );

        if (existingDoc?.Id) {
          await updateDocument({
            Id: existingDoc.Id,
            Name: `${sanitizedDocumentName}_${sanitizedEmployeeName}`,
            Document_Type__c: docType || 'Document',
            Document_Category__c: category || 'Personal',
            File_URL__c: s3Url,
            Status__c: 'Uploaded',
          });
        } else {
          await createDocumentRecord({
            Name: `${sanitizedDocumentName}_${sanitizedEmployeeName}`,
            Employee__c: employeeId,
            Document_Type__c: docType || 'Document',
            Document_Category__c: category || 'Personal',
            File_URL__c: s3Url,
            Status__c: 'Uploaded',
          });
        }

        // Notify reviewer queue
        const uploaderRole = session?.role || 'Employee';
        const needsAdminReview = uploaderRole === 'HR';
        const reviewerRole = needsAdminReview ? 'Admin' : 'HR';

        const conn = await getSalesforceConnection();
        if (conn) {
          const reviewerQuery = `SELECT Id FROM Employee__c WHERE Role__c = '${reviewerRole}' AND Active__c = true LIMIT 50`;
          const reviewerRes = await conn.query(reviewerQuery);
          const reviewerIds = (reviewerRes.records || []).map((r: any) => r.Id).filter(Boolean);

          if (reviewerIds.length > 0) {
            await Promise.all(
              reviewerIds.map((reviewerId: string) =>
                createNotification({
                  Employee__c: reviewerId,
                  Message__c: `New document uploaded by ${uploaderRole}: ${docType || 'Document'} for ${employee.Employee_Name__c || 'Employee'}.`,
                  Notification_Type__c: 'Document_Review',
                  Action_Required__c: true,
                  Status__c: 'Unread',
                  Action_Taken__c: 'Uploaded',
                  Comments__c: needsAdminReview ? 'Requires Admin verification' : 'Requires HR verification',
                })
              )
            );
          }
        }

        // Notify uploader
        if (session?.employeeId) {
          await createNotification({
            Employee__c: session.employeeId,
            Message__c: `Your document ${docType || 'Document'} was uploaded and sent for verification.`,
            Notification_Type__c: 'Document_Review',
            Action_Required__c: false,
            Status__c: 'Unread',
            Action_Taken__c: 'Uploaded',
          });
        }
    }

    return NextResponse.json({ success: true, url: s3Url });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const docId = searchParams.get('docId');

        if (!docId) {
            return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
        }

        await deleteDocument(docId);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting document:', error);
        return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
    }
}
