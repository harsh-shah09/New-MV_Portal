import { NextResponse } from 'next/server';
import { getIsFirstTimeLogin, getOnboardingStep, setOnboardingStep, clearOnboardingData, setFirstTimeLogin } from '@/lib/dynamodb';
import { updateEmployee, createBankDetail, createDocumentRecord, getEmployeeById } from '@/lib/salesforce';
import { uploadFileToS3 } from '@/lib/s3';

export async function GET(req: Request) {
   const { searchParams } = new URL(req.url);
   const employeeId = searchParams.get('id');
   const firsttime = searchParams.get('firsttime')
   if (!employeeId) return NextResponse.json({ error: 'Missing employee ID' }, { status: 400 });
   
   const isFirstTime = await getIsFirstTimeLogin(employeeId);
   if (!isFirstTime && !firsttime) return NextResponse.json({ showOnboarding: false });
   
   const currentStep = await getOnboardingStep(employeeId);

   let employeeData = null;
   try {
       employeeData = await getEmployeeById(employeeId);
   } catch(e) {
       console.error("Error fetching employee details for prefill", e);
   }
   
   return NextResponse.json({ showOnboarding: true, currentStep, employeeData });
}

export async function POST(req: Request) {
   try {
       const contentType = req.headers.get('content-type') || '';
       
       if (contentType.includes('multipart/form-data')) {
            const formData = await req.formData();
            const employeeId = formData.get('employeeId') as string;
            
            if (!employeeId) return NextResponse.json({ error: 'Missing employeeId' }, { status: 400 });

            const step = parseInt(formData.get('step') as string);
            if (step === 1) {
                // Profile Photo
                const file = formData.get('file') as File;
                if(file) {
                     const buffer = Buffer.from(await file.arrayBuffer());
                     const url = await uploadFileToS3(buffer, `profile-photos/${employeeId}-${file.name}`, file.type);
                     await updateEmployee(employeeId, { Profile_Photo__c: url });
                }
                await setOnboardingStep(employeeId, 2);
            }
            else if (formData.get('step') === '3_passbook') {
                 // Passbook Upload
                 const file = formData.get('file') as File;
                 const type = formData.get('type') as string; // 'Passbook'
                 if(file) {
                     const buffer = Buffer.from(await file.arrayBuffer());
                     const url = await uploadFileToS3(buffer, `documents/${employeeId}-${file.name}`, file.type);
                     await createDocumentRecord({
                         Name: file.name,
                         Document_Type__c: type || 'Passbook',
                         File_URL__c: url,
                         Status__c: 'Uploaded',
                         Employee__c: employeeId
                     });
                 }
            }
            else if (step === 5) {
                 // Documents (step 5)
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
                         Employee__c: employeeId
                     });
                 }
            }
       } else {
           // JSON
           const body = await req.json();
           const { step, data, action, employeeId } = body;
           
           if (!employeeId) return NextResponse.json({ error: 'Missing employeeId' }, { status: 400 });

           if (action === 'complete') {
               await clearOnboardingData(employeeId);
               await setFirstTimeLogin(employeeId, true);
               return NextResponse.json({ success: true, completed: true });
           }

           if (step === 2) {
               // Personal Details
               const payload = {
                   Employee_Current_Address__c : JSON.stringify({
                    street : data.street,
                    city : data.city,
                    state : data.state,
                    postalCode : data.postalCode,
                    country : data.country
                   }),
                   Employee_Address__c : '',
                   Emergency_Contact_Name__c: data.emergencyContact,
                   Emergency_Contact_Number__c: data.emergencyPhone
               }
                if(data.sameAsCurrent){
                    payload.Employee_Address__c = JSON.stringify({
                        street : data.street,
                        city : data.city,
                        state : data.state,
                        postalCode : data.postalCode,
                        country : data.country
                    })
                }else{
                     payload.Employee_Address__c = JSON.stringify({
                        street : data.permanentstreet,
                        city : data.permanentcity,
                        state : data.permanentstate,
                        postalCode : data.permanentpostalCode,
                        country : data.permanentcountry
                    })
                }
               await updateEmployee(employeeId, payload );
           } else if (step === 3) {
               // Bank Details
               await createBankDetail({
                   Name: data.bankName,
                   Bank_Branch_Name__c: data.bankbranch,
                   Bank_Account_Number__c: data.accountNumber,
                   IFSC__c: data.ifscCode,
                   Primary_Account__c: true,
                   Employee__c: employeeId
               });
           }
           
           // Update Step in DB
           // Assume Google Sync is step 4 and does nothing on backend right now
           await setOnboardingStep(employeeId, step + 1);
       }
       
       return NextResponse.json({ success: true });
   } catch(e) {
       console.error("Onboarding Error", e);
       return NextResponse.json({ error: 'Failed' }, { status: 500 });
   }
}
