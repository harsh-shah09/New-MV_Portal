
import { NextRequest, NextResponse } from 'next/server';
import { getHandbookDocuments, createDocumentRecord } from '@/lib/salesforce';
import { uploadFileToS3 } from '@/lib/s3';
import { verifySession } from '@/lib/auth';

export async function GET() {
  const session = await verifySession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  try {
    const docs = await getHandbookDocuments();
    return NextResponse.json(docs);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await verifySession();
  if (!session || (!session.rolejd?.includes('HR') && !session.role?.includes('Admin'))) { 
     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const name = formData.get('name') as string;
    const type = formData.get('type') as string; 

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileUrl = await uploadFileToS3(buffer, file.name, file.type);

    await createDocumentRecord({
        // Name: name || file.name,
        Document_Category__c: 'Handbook',
        Document_Type__c: type,
        File_URL__c: fileUrl,
        Status__c: 'Uploaded',
        Employee__c: session.employeeId // Linked to uploader
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
      console.error(err);
      return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
