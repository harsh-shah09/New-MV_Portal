
import { NextResponse } from 'next/server';
import { uploadFileToS3 } from '@/lib/s3';
import { getEmployeeById, createDocumentRecord, updateEmployee, deleteDocument } from '@/lib/salesforce';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const employeeId = formData.get('employeeId') as string;
    const type = formData.get('type') as string; // 'profile_photo' or 'document'
    
    if (!file || !employeeId) {
      return NextResponse.json({ error: 'Missing file or employeeId' }, { status: 400 });
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = file.name;
    const contentType = file.type;

    // Get Employee Name for Folder
    const employee = await getEmployeeById(employeeId);
    if (!employee) {
         return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }
    const empName = employee.Employee_Name__c || employee.Name || 'Unknown';
    // Sanitize folder name: remove special chars, replace spaces with underscores
    const safeEmpName = empName.replace(/[^a-zA-Z0-9 ]/g, "").replace(/\s+/g, "_");
    
    // Upload to S3 with dynamic folder
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    if (!allowedTypes.includes(contentType)) {
        // return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }

    const s3Url = await uploadFileToS3(buffer, fileName, contentType, safeEmpName);

    // Create Document__c record in Salesforce
    // Fields: Employee__c, Document_Type__c, Document_category__c, File_ID__c, File_URL__c, Status__c
    // Mapping:
    // Document_Type__c = type (e.g. 'Profile Photo', 'Resume')
    // Document_category__c = 'Personal' (generic?)
    // File_URL__c = s3Url
    // Status__c = 'Active'

    const category = formData.get('category') as string;
    const docType = formData.get('docType') as string;

    // If it's a profile photo, update the Employee__c record
    if (type === 'profile_photo') {
        const empUpdate = { Profile_Photo__c: s3Url };
        await updateEmployee(employeeId, empUpdate);
    }else{
        await createDocumentRecord({
          Employee__c: employeeId,
          Document_Type__c: docType || 'Document', 
          Document_Category__c: category || 'Personal',
          File_URL__c: s3Url,
          Status__c: 'Uploaded',
      });
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
