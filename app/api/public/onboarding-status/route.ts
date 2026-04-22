import { NextResponse } from 'next/server';
import { getIsFirstTimeLogin, getOnboardingStep, setOnboardingStep, clearOnboardingData, setFirstTimeLogin, getOnboardingCompleted } from '@/lib/dynamodb';
import { updateEmployee, upsertBankDetail, upsertDocumentRecord, getEmployeeById } from '@/lib/salesforce';
import { uploadFileToS3 } from '@/lib/s3';
import { getHREmail, sendEmail } from '@/lib/email';
import { getSpecificConfigurations } from '@/lib/admin-config';
import { onboardingCompletedToHR } from '@/lib/email-templates';

async function verifyRequiredDocuments(employeeData: any): Promise<string[]> {
    let mandatedDocs: string[] = [];
    try {
        const configs = await getSpecificConfigurations(['documents']);
        if (configs.documents && configs.documents.length > 0) {
            const common = configs.documents[0].Value__c;
            if (common) {
                mandatedDocs = common.split(',').map((s: string) => s.trim()).filter(Boolean);
            }
        }
    } catch (e) {
        console.error("Failed to fetch document configurations:", e);
        mandatedDocs = ['Aadhaar Card', 'PAN Card', 'Driving Licence'];
    }
    
    const requiredDocs = Array.from(new Set(['Passbook', ...mandatedDocs]));
    const uploadedDocTypes = new Set(
        (Array.isArray(employeeData?.documents) ? employeeData.documents : [])
            .map((doc: any) => (doc?.Document_Type__c || '').toString().trim().toLowerCase())
            .filter(Boolean)
    );

    return requiredDocs.filter((docName) => !uploadedDocTypes.has(docName.toLowerCase()));
}

const TOTAL_STEPS = 4; // Profile, Personal, Bank, Documents

export async function GET(req: Request) {
   const { searchParams } = new URL(req.url);
   const employeeId = searchParams.get('id');
   const firsttime = searchParams.get('firsttime');
   if (!employeeId) return NextResponse.json({ error: 'Missing employee ID' }, { status: 400 });

   // Priority 1: completed flag – never re-show the wizard once finished
   const isCompleted = await getOnboardingCompleted(employeeId);
   if (isCompleted) return NextResponse.json({ showOnboarding: false });

   // Priority 2: first-time login flag (or ?firsttime=true override)
   const isFirstTime = await getIsFirstTimeLogin(employeeId);
   if (!isFirstTime && !firsttime) return NextResponse.json({ showOnboarding: false });

   // Priority 3: resolve step from DynamoDB
   const rawStep = await getOnboardingStep(employeeId);
   // Step beyond total → all saved, treat as completed
   if (rawStep > TOTAL_STEPS) {
       return NextResponse.json({ showOnboarding: false });
   }
   const currentStep = rawStep > 0 ? rawStep : 1;

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
                     if (file.size > 5 * 1024 * 1024) {
                         return NextResponse.json({ error: 'File size exceeds 5MB limit' }, { status: 400 });
                     }
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
                     if (file.size > 5 * 1024 * 1024) {
                         return NextResponse.json({ error: 'File size exceeds 5MB limit' }, { status: 400 });
                     }
                     const buffer = Buffer.from(await file.arrayBuffer());
                     const url = await uploadFileToS3(buffer, `documents/${employeeId}-${file.name}`, file.type);
                     await upsertDocumentRecord({
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
                     if (file.size > 5 * 1024 * 1024) {
                         return NextResponse.json({ error: 'File size exceeds 5MB limit' }, { status: 400 });
                     }
                     const buffer = Buffer.from(await file.arrayBuffer());
                     const url = await uploadFileToS3(buffer, file.name, file.type);
                     await upsertDocumentRecord({
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
            console.log("Onboarding API called with", { step, action, employeeId });
           if (action === 'complete') {
               const employeeData = await getEmployeeById(employeeId);

               if (!employeeData) {
                   return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
               }

               const missingDocuments = await verifyRequiredDocuments(employeeData);
               if (missingDocuments.length > 0) {
                   return NextResponse.json(
                       {
                           error: 'Please upload all required documents before completing onboarding',
                           missingDocuments,
                       },
                       { status: 400 }
                   );
               }

               let hrNotificationSent = false;
               const hrEmail = await getHREmail();
               console.log("HR Email for onboarding completion notification:", hrEmail);
               if (hrEmail) {
                   const employeeName = employeeData?.Employee_Name__c || employeeData?.Name || employeeId;
                   const employeeEmail = employeeData?.Company_Email__c || employeeData?.Employee_Email__c || 'N/A';
                                     const { subject, html } = await onboardingCompletedToHR({
                                             recipientName: 'HR Team',
                                             employeeName,
                                             employeeId: employeeData?.Name || employeeId,
                                             employeeEmail,
                                           recordId: employeeId,
                                     });

                   try {
                       await sendEmail({
                           to: hrEmail,
                                                     subject,
                                                     body: html,
                           contentType: 'text/html',
                           isInfo: true,
                       });
                       console.log(`Onboarding completion email sent to HR at ${hrEmail} for employee ${employeeName}`);
                       hrNotificationSent = true;
                   } catch (emailError) {
                       console.error('Error sending onboarding completion email to HR', emailError);
                   }
               }

               await clearOnboardingData(employeeId);
               await setFirstTimeLogin(employeeId, true);
               return NextResponse.json({ success: true, completed: true, hrNotificationSent });
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
               // Bank Details – upsert to prevent duplicates on re-submission
                let nowStatus;
                if(data.Status__c === 'Approved'){
                    nowStatus = 'Approved';
                }else if(data.Status__c === 'Rejected'){
                    nowStatus = 'Rejected';
                }else{
                    nowStatus = 'Pending';
                }
               await upsertBankDetail({
                   Name: data.bankName,
                   Bank_Branch_Name__c: data.bankbranch,
                   Bank_Account_Number__c: data.accountNumber,
                   IFSC__c: data.ifscCode,
                   Primary_Account__c: true,
                   Employee__c: employeeId,
                   Status__c : nowStatus
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
