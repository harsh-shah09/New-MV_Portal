
import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import { getIsFirstTimeLogin, getOnboardingStep, setOnboardingStep, clearOnboardingData } from '@/lib/dynamodb';
import { updateEmployee, createBankDetail, createDocumentRecord } from '@/lib/salesforce';
import { uploadFileToS3 } from '@/lib/s3';

export async function GET() {
   const session = await verifySession();
   if (!session?.employeeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
   
   const isFirstTime = await getIsFirstTimeLogin(session.employeeId);
   if (!isFirstTime) return NextResponse.json({ showOnboarding: false });
   
   const currentStep = await getOnboardingStep(session.employeeId);
   return NextResponse.json({ showOnboarding: true, currentStep });
}

export async function POST(req: Request) {
   const session = await verifySession();
   if (!session?.employeeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
   
   try {
       // Using 'formData' for handling potential file uploads
       const contentType = req.headers.get('content-type') || '';
       
       if (contentType.includes('multipart/form-data')) {
            const formData = await req.formData();
            const step = parseInt(formData.get('step') as string);
            
            if (step === 1) {
                // Profile Photo
                const file = formData.get('file') as File;
                if(file) {
                     const buffer = Buffer.from(await file.arrayBuffer());
                     const url = await uploadFileToS3(buffer, `profile-photos/${session.employeeId}-${file.name}`, file.type);
                     await updateEmployee(session.employeeId, { Profile_Photo__c: url });
                }
                await setOnboardingStep(session.employeeId, 2);
            }
            else if (step === 4) {
                 // Documents
                 const file = formData.get('file') as File;
                 const type = formData.get('type') as string;
                 
                 if(file) {
                     const buffer = Buffer.from(await file.arrayBuffer());
                     const url = await uploadFileToS3(buffer, file.name, file.type);
                     await createDocumentRecord({
                         Name: file.name,
                         Document_Type__c: type,
                         File_URL__c: url,
                         Status__c: 'Uploaded',
                         Employee__c: session.employeeId
                     });
                 }
                 // Advance step? Or allow multiple uploads. Client decides when to call 'submit' to advance.
                 // Actually client might send { action: 'finish' } or { action: 'next' }
            }
       } else {
           // JSON
           const body = await req.json();
           const { step, data, action } = body;
           
           if (action === 'complete') {
               await clearOnboardingData(session.employeeId);
               return NextResponse.json({ success: true, completed: true });
           }

           if (step === 2) {
            console.log(data , 'in address') 
               // Personal Details
               await updateEmployee(session.employeeId, {
                   Employee_Address__c : JSON.stringify({
                    street : data.street,
                    city : data.city,
                    state : data.state,
                    postalCode : data.postalCode,
                    country : data.country
                   }),
                   Emergency_Contact_Name__c: data.emergencyContact,
                   Emergency_Contact_Number__c: data.emergencyPhone
               });
           } else if (step === 3) {
            console.log(data , 'inn bank')
               // Bank Details
               await createBankDetail({
                   Name: data.bankName,
                   Bank_Branch_Name__c: data.bankName,
                   Bank_Account_Number__c: data.accountNumber,
                   IFSC__c: data.ifscCode,
                   Primary_Account__c: true,
                   Employee__c: session.employeeId
               });
           }
           
           // Update Step in DB
           await setOnboardingStep(session.employeeId, step + 1);
       }
       
       return NextResponse.json({ success: true });
   } catch(e) {
       console.error("Onboarding Error", e);
       return NextResponse.json({ error: 'Failed' }, { status: 500 });
   }
}
