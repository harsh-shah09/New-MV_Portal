
import { NextResponse } from 'next/server';
import { uploadFileToS3 } from '@/lib/s3';
import { createDocumentRecord, updateEmployee } from '@/lib/salesforce';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const employeeId = formData.get('employeeId') as string;
    const contactId = formData.get('contactId') as string; // Optional, needed if updating contact? Profile photo url is on Emp.
    const type = formData.get('type') as string; // 'profile_photo' or 'document'
    
    if (!file || !employeeId) {
      return NextResponse.json({ error: 'Missing file or employeeId' }, { status: 400 });
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = file.name;
    const contentType = file.type;

    // Upload to S3
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    if (!allowedTypes.includes(contentType)) {
        // return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }

    const s3Url = await uploadFileToS3(buffer, fileName, contentType);

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
        if (contactId) {
             await updateEmployee(employeeId, contactId, empUpdate);
        } else {
             // Fallback or error?
        }
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
