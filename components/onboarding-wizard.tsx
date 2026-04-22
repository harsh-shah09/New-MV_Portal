
"use client"

import { useState, useEffect, useRef } from "react"
import { Modal, Steps, Form, Grid, Input, Button, Upload, message, Collapse, Checkbox, Divider, Card, Spin, Select } from "antd"
import { UploadOutlined, BankOutlined, UserOutlined, FileTextOutlined, CheckCircleOutlined, CameraOutlined, GoogleOutlined, CheckCircleFilled } from "@ant-design/icons"
import { useQueryClient } from "@tanstack/react-query"
import Confetti from "react-confetti"
import { motion, AnimatePresence } from "framer-motion"
import { Check, AlertCircle, Loader2, Trash2 } from "lucide-react"
import ImgCrop from "antd-img-crop"

export interface OnboardingWizardProps {
    publicMode?: boolean;
    publicEmpId?: string;
    firsttime?: boolean;
    step?: number;
}

export function OnboardingWizard({ publicMode = false, publicEmpId, firsttime = false, step = 1 }: OnboardingWizardProps = {}) {
    const [open, setOpen] = useState(publicMode ? true : false)
    const [currentStep, setCurrentStep] = useState(step)
    const [loading, setLoading] = useState(false)
    const [pageLoading, setPageLoading] = useState(true)
    const [form] = Form.useForm()
    const phonePattern = /^(?:\+91[6-9]\d{9}|[6-9]\d{9})$/
    const [formErrors, setFormErrors] = useState<Record<string, string>>({})
    const queryClient = useQueryClient()
    const [showConfetti, setShowConfetti] = useState(false)
    const [profileFile, setProfileFile] = useState<File | null>(null)
    const [passbookFile, setPassbookFile] = useState<File | null>(null)
    const [passbookUploading, setPassbookUploading] = useState(false)
    const [passbookUploaded, setPassbookUploaded] = useState(false)
    const [userRole, setUserRole] = useState('')
    // Google integration state (for step 4)
    const [googleConnected, setGoogleConnected] = useState(false)
    const [googleLoading, setGoogleLoading] = useState(false)
    const [googleChecking, setGoogleChecking] = useState(false)
    const [googleNotification, setGoogleNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null)
    const [documents, setDocuments] = useState<string[]>([])
    const [documentsLoading, setDocumentsLoading] = useState(true)
    const [documentsUploading, setdocumentsUploading] = useState(false)
    const [existingProfilePhoto, setExistingProfilePhoto] = useState<string | null>(null)
    const [existingDocuments, setExistingDocuments] = useState<any[]>([])
    const [isExpired, setIsExpired] = useState(false)
    // Track last successfully saved personal-info payload to skip unchanged API calls
    const [disabledsteps , setDisabledSteps] = useState<number[]>([])
    const lastSavedPersonalData = useRef<string | null>(null)
    const countryOptions = [
        'Afghanistan',
        'Albania',
        'Algeria',
        'Andorra',
        'Angola',
        'Antigua and Barbuda',
        'Argentina',
        'Armenia',
        'Australia',
        'Austria',
        'Azerbaijan',
        'Bahamas',
        'Bahrain',
        'Bangladesh',
        'Barbados',
        'Belarus',
        'Belgium',
        'Belize',
        'Benin',
        'Bhutan',
        'Bolivia',
        'Bosnia and Herzegovina',
        'Botswana',
        'Brazil',
        'Brunei',
        'Bulgaria',
        'Burkina Faso',
        'Burundi',
        'Cabo Verde',
        'Cambodia',
        'Cameroon',
        'Canada',
        'Central African Republic',
        'Chad',
        'Chile',
        'China',
        'Colombia',
        'Comoros',
        'Congo',
        'Costa Rica',
        'Cote d’Ivoire',
        'Croatia',
        'Cuba',
        'Cyprus',
        'Czech Republic',
        'Denmark',
        'Djibouti',
        'Dominica',
        'Dominican Republic',
        'DR Congo',
        'Ecuador',
        'Egypt',
        'El Salvador',
        'Equatorial Guinea',
        'Eritrea',
        'Estonia',
        'Eswatini',
        'Ethiopia',
        'Fiji',
        'Finland',
        'France',
        'Gabon',
        'Gambia',
        'Georgia',
        'Germany',
        'Ghana',
        'Greece',
        'Grenada',
        'Guatemala',
        'Guinea',
        'Guinea-Bissau',
        'Guyana',
        'Haiti',
        'Honduras',
        'Hungary',
        'Iceland',
        'India',
        'Indonesia',
        'Iran',
        'Iraq',
        'Ireland',
        'Israel',
        'Italy',
        'Jamaica',
        'Japan',
        'Jordan',
        'Kazakhstan',
        'Kenya',
        'Kiribati',
        'Kuwait',
        'Kyrgyzstan',
        'Laos',
        'Latvia',
        'Lebanon',
        'Lesotho',
        'Liberia',
        'Libya',
        'Liechtenstein',
        'Lithuania',
        'Luxembourg',
        'Madagascar',
        'Malawi',
        'Malaysia',
        'Maldives',
        'Mali',
        'Malta',
        'Marshall Islands',
        'Mauritania',
        'Mauritius',
        'Mexico',
        'Micronesia',
        'Moldova',
        'Monaco',
        'Mongolia',
        'Montenegro',
        'Morocco',
        'Mozambique',
        'Myanmar',
        'Namibia',
        'Nauru',
        'Nepal',
        'Netherlands',
        'New Zealand',
        'Nicaragua',
        'Niger',
        'Nigeria',
        'North Korea',
        'North Macedonia',
        'Norway',
        'Oman',
        'Pakistan',
        'Palau',
        'Palestine',
        'Panama',
        'Papua New Guinea',
        'Paraguay',
        'Peru',
        'Philippines',
        'Poland',
        'Portugal',
        'Qatar',
        'Romania',
        'Russia',
        'Rwanda',
        'Saint Kitts and Nevis',
        'Saint Lucia',
        'Saint Vincent and the Grenadines',
        'Samoa',
        'San Marino',
        'Sao Tome and Principe',
        'Saudi Arabia',
        'Senegal',
        'Serbia',
        'Seychelles',
        'Sierra Leone',
        'Singapore',
        'Slovakia',
        'Slovenia',
        'Solomon Islands',
        'Somalia',
        'South Africa',
        'South Korea',
        'South Sudan',
        'Spain',
        'Sri Lanka',
        'Sudan',
        'Suriname',
        'Sweden',
        'Switzerland',
        'Syria',
        'Taiwan',
        'Tajikistan',
        'Tanzania',
        'Thailand',
        'Timor-Leste',
        'Togo',
        'Tonga',
        'Trinidad and Tobago',
        'Tunisia',
        'Turkey',
        'Turkmenistan',
        'Tuvalu',
        'Uganda',
        'Ukraine',
        'United Arab Emirates',
        'United Kingdom',
        'United States',
        'Uruguay',
        'Uzbekistan',
        'Vanuatu',
        'Vatican City',
        'Venezuela',
        'Vietnam',
        'Yemen',
        'Zambia',
        'Zimbabwe',
    ]
    const { useBreakpoint } = Grid;
    const screens = useBreakpoint();

    const splitEmergencyContact = (value?: string) => {
        const normalized = value?.trim() || ''
        const match = normalized.match(/^(\+\d{1,2})\s*(\d+)$/)

        if (match) {
            return {
                emergencyCountryCode: match[1],
                emergencyPhoneNumber: match[2],
            }
        }

        return {
            emergencyCountryCode: '+91',
            emergencyPhoneNumber: normalized.replace(/\D/g, '').slice(0, 10),
        }
    }

    const mergeEmergencyContact = (countryCode?: string, phoneNumber?: string) => {
        const code = countryCode?.trim() || '+91'
        const number = phoneNumber?.trim() || ''
        return `${code}${number}`.replace(/\s+/g, '')
    }

    const validateEmergencyPhone = (value: string) => {
        if (!value) return true
        return /^\d{10}$/.test(value.replace(/\s+/g, ''))
    }

    const validateEmergencyCountryCode = (value: string) => {
        if (!value) return true
        return /^\+\d+$/.test(value.trim())
    }

    useEffect(() => {
        // Check status on mount
        if (publicMode && !publicEmpId) {
            setPageLoading(false);
            return;
        }

        setPageLoading(true);
        const endpoint = publicMode && publicEmpId
            ? `/api/public/onboarding-status?id=${publicEmpId}&firsttime=${firsttime}`
            : '/api/auth/onboarding-status';

        fetch(endpoint)
            .then(res => res.json())
            .then(data => {
                if (data.showOnboarding) {
                    if (!publicMode) setOpen(true)
                    setCurrentStep(data.currentStep || 1)
                    console.log("currentStep", data.currentStep);
                    if (data.employeeData) {
                        const emp = data.employeeData || {};

                        if (emp.Profile_Photo__c) {
                            setExistingProfilePhoto(emp.Profile_Photo__c);
                        }

                        // Parse addresses
                        let currentAddrStr = emp.Employee_Current_Address__c;
                        let permanentAddrStr = emp.Employee_Address__c;
                        let currentAddr: any = null;
                        let permanentAddr: any = null;
                        try {
                            if (currentAddrStr) currentAddr = JSON.parse(currentAddrStr);
                            if (permanentAddrStr) permanentAddr = JSON.parse(permanentAddrStr);
                        } catch (e) { }

                        let isSameAsCurrent = false;
                        if (currentAddr && permanentAddr &&
                            currentAddr.street === permanentAddr.street &&
                            currentAddr.city === permanentAddr.city &&
                            currentAddr.state === permanentAddr.state &&
                            currentAddr.postalCode === permanentAddr.postalCode &&
                            currentAddr.country === permanentAddr.country) {
                            isSameAsCurrent = true;
                        } else if (currentAddrStr && !permanentAddrStr) {
                            isSameAsCurrent = true;
                        }

                        form.setFieldsValue({
                            street: currentAddr?.street || '',
                            city: currentAddr?.city || '',
                            state: currentAddr?.state || '',
                            postalCode: currentAddr?.postalCode || '',
                            country: currentAddr?.country || 'India',

                            sameAsCurrent: isSameAsCurrent,

                            permanentstreet: permanentAddr?.street || '',
                            permanentcity: permanentAddr?.city || '',
                            permanentstate: permanentAddr?.state || '',
                            permanentpostalCode: permanentAddr?.postalCode || '',
                            permanentcountry: permanentAddr?.country || 'India',

                            emergencyContact: emp.Emergency_Contact_Name__c || '',
                            ...splitEmergencyContact(emp.Emergency_Contact_Number__c),
                        });

                        if (emp.bankDetails && emp.bankDetails.length > 0) {
                            const activeBanks = emp.bankDetails.filter((b: any) => b.Status__c !== 'Rejected');
                            if (activeBanks.length > 0) {
                                const bank = activeBanks[0];
                                form.setFieldsValue({
                                    bankName: bank.Name || '',
                                    bankbranch: bank.Bank_Branch_Name__c || '',
                                    accountNumber: bank.Bank_Account_Number__c || '',
                                    accountHolder: emp.Employee_Name__c || '',
                                    ifscCode: bank.IFSC__c || '',
                                });
                            }
                        }
                        if (emp.documents && emp.documents.length > 0) {
                            const activeDocs = emp.documents.filter((d: any) => d.Status__c !== 'Rejected');
                            const passbook = activeDocs.find((d: any) => d.Document_Type__c === 'Passbook');
                            if (passbook) setPassbookUploaded(true);
                            setExistingDocuments(activeDocs);
                        }
                    }
                } else {
                    if (publicMode) {
                        setIsExpired(true);
                    }
                }
            })
            .catch(err => console.error(err))
            .finally(() => {
                setPageLoading(false)
                if(!firsttime){
                    if(step === 1){
                        setDisabledSteps([])
                    }
                    if(step === 2){
                        setDisabledSteps([1])
                    }
                    if(step === 3){
                        setDisabledSteps([1,2])
                    }
                    if(step === 4){
                        setDisabledSteps([1,2,3])
                    }
                }
            })
    }, [])

    useEffect(() => {
        // Fetch documents configuration
        setDocumentsLoading(true)
        const fetchDocs = async () => {
            try {
                // For public mode, use the public documents endpoint; for internal use the admin endpoint
                const endpoint = publicMode && publicEmpId
                    ? `/api/public/onboarding-documents?id=${publicEmpId}`
                    : '/api/admin/configurations?types=documents';

                const res = await fetch(endpoint);
                const data = await res.json();

                if (data.documents && Array.isArray(data.documents) && data.documents.length > 0) {
                    const firstDoc = data.documents[0];
                    // Admin config returns objects; public endpoint returns string[]
                    if (typeof firstDoc === 'string') {
                        setDocuments(data.documents);
                    } else {
                        const common = firstDoc.Value__c?.split(',').map((s: string) => s.trim()).filter(Boolean) || [];
                        setDocuments(common);
                    }
                } else {
                    // Fallback if no config found
                    setDocuments(['Aadhaar Card', 'PAN Card', 'Driving Licence', 'Degree/Marksheet(Latest)']);
                }
            } catch (err) {
                console.error('Failed to fetch documents:', err);
                setDocuments(['Aadhaar Card', 'PAN Card', 'Driving Licence', 'Degree/Marksheet(Latest)']);
            } finally {
                setDocumentsLoading(false);
            }
        };
        fetchDocs();
    }, [])

    useEffect(() => {
        if (open && !publicMode) {
            checkGoogleStatus()
        }
    }, [open, publicMode])

    // Check Google connection status
    const checkGoogleStatus = async () => {
        try {
            setGoogleChecking(true)
            const res = await fetch('/api/integrations/google?action=status')
            if (res.ok) {
                const data = await res.json()
                setGoogleConnected(data.connected)
            }
        } catch (e) {
            console.error(e)
        } finally {
            setGoogleChecking(false)
        }
    }

    const handleGoogleConnect = async () => {
        try {
            setGoogleLoading(true)
            const res = await fetch('/api/integrations/google')
            if (!res.ok) throw new Error("Failed")
            const data = await res.json()
            window.location.href = data.url
        } catch (e) {
            setGoogleNotification({ type: 'error', message: "Failed to initiate connection. Please try again." })
            setGoogleLoading(false)
        }
    }

    const handleGoogleDisconnect = async () => {
        try {
            setGoogleLoading(true)
            const res = await fetch('/api/integrations/google?action=disconnect')
            if (!res.ok) throw new Error("Failed")
            setGoogleConnected(false)
            setGoogleNotification({ type: 'success', message: "Disconnected from Google Workspace" })
        } catch (e) {
            setGoogleNotification({ type: 'error', message: "Failed to disconnect. Please try again." })
        } finally {
            setGoogleLoading(false)
        }
    }

    const stepItems = [
        { title: 'Profile Picture', icon: <CameraOutlined /> },
        { title: 'Personal Info', icon: <UserOutlined /> },
        { title: 'Bank Details', icon: <BankOutlined /> },
        // { title: 'Google Sync', icon: <GoogleOutlined /> },
        { title: 'Documents', icon: <FileTextOutlined /> },
    ]

    const handlePassbookUpload = async (file: File) => {
        if (!file) return
        if (file.size > 5 * 1024 * 1024) {
            message.error("File size exceeds 5MB limit.")
            return
        }
        setPassbookUploading(true)
        const formData = new FormData()
        formData.append('file', file)
        formData.append('type', 'Passbook')
        formData.append('step', '3_passbook')
        if (publicMode && publicEmpId) formData.append('id', publicEmpId)
        try {
            const res = await fetch('/api/auth/onboarding-status', {
                method: 'POST',
                body: formData
            })
            if (!res.ok) throw new Error('Upload Failed')
            setPassbookUploaded(true)
            message.success(`${file.name} uploaded successfully`)
        } catch (err) {
            message.error(`${file.name} upload failed`)
        } finally {
            setPassbookUploading(false)
        }
    }

    const handleNext = async () => {
        if (publicMode && !publicEmpId) return;

        try {
            setLoading(true)
            setFormErrors({}) // Clear previous errors

            const endpoint = publicMode ? '/api/public/onboarding-status' : '/api/auth/onboarding-status';

            if (currentStep === 1) {
                if (!profileFile && !existingProfilePhoto) {
                    message.error("Please upload a profile picture to proceed.");
                    setLoading(false);
                    return;
                }
                if (profileFile) {
                    if(profileFile.size > 1 * 1024 * 1024) {
                        message.error("File size exceeds 1MB limit.")
                        setLoading(false)
                        return
                    }
                    const formData = new FormData()
                    formData.append('file', profileFile)
                    formData.append('step', '1')
                    if (publicMode && publicEmpId) formData.append('employeeId', publicEmpId)

                    const res = await fetch(endpoint, {
                        method: 'POST',
                        body: formData
                    })
                    if (!res.ok) throw new Error('Upload Failed')
                } else {
                    await fetch(endpoint, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ step: 1, data: {}, employeeId: publicMode ? publicEmpId : undefined })
                    })
                }
            } else if (currentStep === 2) {
                // Personal Info validation
                const values = await form.validateFields()
                const mergedEmergencyPhone = mergeEmergencyContact(values.emergencyCountryCode, values.emergencyPhoneNumber)

                // Manual check to absolutely ensure "Next is working" bug doesn't happen
                if (!values.street || !values.city || !values.state || !values.postalCode || !values.country || !values.emergencyContact || !values.emergencyCountryCode || !values.emergencyPhoneNumber) {
                    message.error("Please fill in all required personal information.");
                    setLoading(false);
                    return;
                }
                if (!values.sameAsCurrent) {
                    if (!values.permanentstreet || !values.permanentcity || !values.permanentstate || !values.permanentpostalCode || !values.permanentcountry) {
                        message.error("Please fill in all required permanent address information.");
                        setLoading(false);
                        return;
                    }
                }

                if (values.emergencyCountryCode && !validateEmergencyCountryCode(values.emergencyCountryCode)) {
                    setFormErrors({ emergencyCountryCode: 'Country code must start with + and contain digits only (example: +91)' })
                    setLoading(false)
                    return
                }

                if (values.emergencyPhoneNumber && !validateEmergencyPhone(values.emergencyPhoneNumber)) {
                    setFormErrors({ emergencyPhoneNumber: 'Emergency contact number must be exactly 10 digits' })
                    setLoading(false)
                    return
                }

                setFormErrors({})

                // Only call the API if the data has actually changed
                const personalPayload = {
                    step: currentStep,
                    data: { ...values, emergencyPhone: mergedEmergencyPhone },
                    employeeId: publicMode ? publicEmpId : undefined,
                };
                const personalKey = JSON.stringify(personalPayload);
                if (personalKey !== lastSavedPersonalData.current) {
                    const res = await fetch(endpoint, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: personalKey,
                    })
                    if (!res.ok) throw new Error('Failed')
                    lastSavedPersonalData.current = personalKey;
                }
            } else {
                if (currentStep === 3) {
                    const values = await form.validateFields()
                    if (!values.bankName || !values.bankbranch || !values.accountNumber || !values.accountHolder || !values.ifscCode) {
                        message.error("Please fill in all required bank details.");
                        setLoading(false);
                        return;
                    }
                    if (!passbookUploaded) {
                        message.error("Please upload your Passbook or Bank Statement to proceed.");
                        setLoading(false);
                        return;
                    }
                }
                if (currentStep === 4) {
                    if (documents && documents.length > 0) {
                        const missingDocs = documents.filter(docName => !existingDocuments.some(d => d.Document_Type__c === docName));
                        if (missingDocs.length > 0) {
                            message.error("Please upload all required documents to proceed.");
                            setLoading(false);
                            return;
                        }
                    }
                }
                const values = await form.validateFields()
                const res = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        step: currentStep,
                        data: values,
                        employeeId: publicMode ? publicEmpId : undefined
                    })
                })
                if (!res.ok) throw new Error('Failed')
            }

            setCurrentStep(prev => prev + 1)
            setLoading(false)
        } catch (error) {
            console.error("Validation Failed:", error)
            setLoading(false)
        }
    }

    const handlePrevious = () => {
        setFormErrors({})
        setCurrentStep(prev => (prev > 1 ? prev - 1 : 1))
    }

    const handleDocumentUpload = async (options: any, doc: any) => {
        const { file, onSuccess, onError } = options
         // 5 MB client-side limit
        if (file.size > 5 * 1024 * 1024) {
            message.error(`File size exceeds 5MB limit.`)
            onError({ event: new Error('File too large') })
            return
        }
        setdocumentsUploading(true)
        const formData = new FormData()
        formData.append('file', file)
        formData.append('type', doc)
        formData.append('step', '5') // Docs step (was 4, now 5)
        if (publicMode && publicEmpId) {
            formData.append('employeeId', publicEmpId)
        }

        const endpoint = publicMode ? '/api/public/onboarding-status' : '/api/auth/onboarding-status';

        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                body: formData
            })
            if (!res.ok) throw new Error('Upload Failed')
            onSuccess("Ok")
            setExistingDocuments(prev => [...prev, { Document_Type__c: doc }])
            message.success('Uploaded successfully')
        } catch (err) {
            onError({ err })
            message.error('Upload failed')
            setdocumentsUploading(false)
        } finally {
            setdocumentsUploading(false)
        }
    }

    const handleFinish = async () => {
        if (publicMode && !publicEmpId) return;

        // Ensure all required documents are uploaded before finishing
        if (documents && documents.length > 0) {
            const missingDocs = documents.filter(doc => !existingDocuments.some(d => d.Document_Type__c === doc));
            if (missingDocs.length > 0) {
                message.error(`Please upload the following required documents: ${missingDocs.join(', ')}`);
                return;
            }
        }

        const endpoint = publicMode ? '/api/public/onboarding-status' : '/api/auth/onboarding-status';

        try {
            setLoading(true)
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'complete', employeeId: publicMode ? publicEmpId : undefined })
            })

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || 'Failed to complete onboarding');
            }

            // Fetch role for tour
            // try {
            //     const meRes = await fetch('/api/me')
            //     if (meRes.ok) {
            //         const me = await meRes.json()
            //         setUserRole(me.role || 'Employee')
            //     }
            // } catch (_) {}
            setLoading(false)
            setOpen(false)
            if (publicMode) {
                setCurrentStep(6)
            }
            setShowConfetti(true)
            message.success("Onboarding Completed! 🎉")
            // Start tour globally after confetti delay (only for internal mode)
            setTimeout(() => {
                setShowConfetti(false)
                if (!publicMode) window.dispatchEvent(new CustomEvent('mv:tour:autostart'))
            }, 3000)
        } catch (e: any) {
            setLoading(false)
            message.error(e.message || "Failed to complete onboarding.")
        }
    }

    const renderStepContent = (step: number) => {
        switch (step) {
            case 1:
                return (
                    <div className="py-8 text-center flex flex-col items-center">
                        <p className="mb-6 text-gray-500">Upload a professional profile picture.</p>
                        <ImgCrop rotationSlider cropShape="round" showGrid aspect={1}>
                            <Upload
                                listType="picture-circle"
                                showUploadList={false}
                                beforeUpload={(file) => {
                                    setProfileFile(file)
                                    return false
                                }}
                                disabled = {documentsUploading || disabledsteps.includes(1)}
                                className="avatar-uploader group border-dashed"
                            >
                                {profileFile ? (
                                    <div className="w-full h-full relative group rounded-full overflow-hidden flex items-center justify-center p-1">
                                        <img src={URL.createObjectURL(profileFile)} alt="avatar" className="w-full h-full object-cover rounded-full" />
                                        <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                                            <CameraOutlined className="text-white text-xl" />
                                            <span className="text-white text-xs mt-1">Change</span>
                                        </div>
                                    </div>
                                ) : existingProfilePhoto ? (
                                    <div className="w-full h-full relative group rounded-full overflow-hidden flex items-center justify-center p-1">
                                        <img src={existingProfilePhoto} alt="avatar" className="w-full h-full object-cover rounded-full" />
                                        <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                                            <CameraOutlined className="text-white text-xl" />
                                            <span className="text-white text-xs mt-1">Change</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center text-gray-400 group-hover:text-blue-500 transition-colors w-full h-full mt-5">
                                        <CameraOutlined className="text-2xl mb-2" />
                                        <div className="font-medium text-sm">Upload</div>
                                    </div>
                                )}
                            </Upload>
                        </ImgCrop>
                    </div>
                )
            case 2:
                // Personal Info
                return (
                    <div className="py-4">
                        <p className="mb-4 text-gray-500">Current Address</p>
                        <Form.Item name="street" label="Street Address" rules={[{ required: true }]}>
                            <Input placeholder="123 Main St" disabled={disabledsteps.includes(2)} />
                        </Form.Item>
                        <div className="grid grid-cols-2 gap-4">
                            <Form.Item name="city" label="City" rules={[{ required: true }]}>
                                <Input disabled={disabledsteps.includes(2)} />
                            </Form.Item>
                            <Form.Item name="state" label="State" rules={[{ required: true }]}>
                                <Input disabled={disabledsteps.includes(2)} />
                            </Form.Item>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Form.Item name="postalCode" label="Postal Code" rules={[{ required: true }]}>
                                <Input disabled={disabledsteps.includes(2)} />
                            </Form.Item>
                            <Form.Item name="country" label="Country" rules={[{ required: true }]}>
                                <Select
                                    showSearch
                                    placeholder="Select country"
                                    options={countryOptions.map(country => ({ label: country, value: country }))}
                                    optionFilterProp="label"
                                    disabled={disabledsteps.includes(2)}
                                />
                            </Form.Item>
                        </div>
                        <Divider />
                        <p className="mb-4 text-gray-500">Permanent Address</p>
                        <Form.Item
                            name="sameAsCurrent"
                            valuePropName="checked"
                            className="mb-3"
                        >
                            <Checkbox disabled={disabledsteps.includes(2)}>
                                Same as Current Address
                            </Checkbox>
                        </Form.Item>
                        <Form.Item shouldUpdate={(prev, curr) => prev.sameAsCurrent !== curr.sameAsCurrent} noStyle>
                            {({ getFieldValue }) => {
                                const isSame = getFieldValue('sameAsCurrent');

                                if (isSame) return null; // hide when checked

                                return (
                                    <>
                                        <Form.Item name="permanentstreet" label="Street Address" rules={[{ required: true }]}>
                                            <Input placeholder="123 Main St" disabled={disabledsteps.includes(2)} />
                                        </Form.Item>

                                        <div className="grid grid-cols-2 gap-4">
                                            <Form.Item name="permanentcity" label="City" rules={[{ required: true }]}>
                                                <Input disabled={disabledsteps.includes(2)} />
                                            </Form.Item>
                                            <Form.Item name="permanentstate" label="State" rules={[{ required: true }]}>
                                                <Input disabled={disabledsteps.includes(2)} />
                                            </Form.Item>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <Form.Item name="permanentpostalCode" label="Postal Code" rules={[{ required: true }]}>
                                                <Input disabled={disabledsteps.includes(2)} />
                                            </Form.Item>
                                            <Form.Item name="permanentcountry" label="Country" rules={[{ required: true }]}>
                                                <Select
                                                    showSearch
                                                    placeholder="Select country"
                                                    options={countryOptions.map(country => ({ label: country, value: country }))}
                                                    optionFilterProp="label"
                                                    disabled={disabledsteps.includes(2)}
                                                />
                                            </Form.Item>
                                        </div>

                                    </>
                                );
                            }}
                        </Form.Item>
                        <Divider />
                        <Form.Item name="emergencyContact" label="Emergency Contact Name" rules={[{ required: true }]}>
                            <Input disabled={disabledsteps.includes(2)} />
                        </Form.Item>
                        <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-4">
                            <Form.Item
                                name="emergencyCountryCode"
                                label="Country Code"
                                rules={[
                                    { required: true, message: 'Country code is required' },
                                    { pattern: /^\+\d+$/, message: 'Country code must start with + and contain digits only' },
                                ]}
                            > 
                                <Input
                                    disabled={disabledsteps.includes(2)}
                                    placeholder="+91"
                                    status={formErrors.emergencyCountryCode ? 'error' : ''}
                                    className={formErrors.emergencyCountryCode ? 'border-red-500' : ''}
                                    maxLength={5}
                                    onChange={(event) => {
                                        const value = event.target.value || ''
                                        if (!value) {
                                            form.setFieldValue('emergencyCountryCode', '')
                                            return
                                        }
                                        const digitsOnly = value.replace(/\D/g, '')
                                        form.setFieldValue('emergencyCountryCode', `+${digitsOnly}`)
                                    }}
                                />
                            </Form.Item>
                            <Form.Item
                                name="emergencyPhoneNumber"
                                label="Emergency Contact Number"
                                rules={[
                                    { required: true, message: 'Emergency contact number is required' },
                                    { pattern: /^\d{10}$/, message: 'Emergency contact number must be exactly 10 digits' },
                                ]}
                            > 
                                <Input
                                    placeholder="9876543210"
                                    status={formErrors.emergencyPhoneNumber ? 'error' : ''}
                                    className={formErrors.emergencyPhoneNumber ? 'border-red-500' : ''}
                                    maxLength={10}
                                    inputMode="numeric"
                                    onChange={(event) => {
                                        form.setFieldValue('emergencyPhoneNumber', (event.target.value || '').replace(/\D/g, '').slice(0, 10))
                                    }}
                                    disabled={disabledsteps.includes(2)}
                                />
                            </Form.Item>
                        </div>
                        {formErrors.emergencyCountryCode && (
                            <div className='text-red-500 text-sm mb-4 flex items-center gap-1'>
                                <AlertCircle className='w-4 h-4' />
                                {formErrors.emergencyCountryCode}
                            </div>
                        )}
                        {formErrors.emergencyPhoneNumber && (
                            <div className='text-red-500 text-sm mb-4 flex items-center gap-1'>
                                <AlertCircle className='w-4 h-4' />
                                {formErrors.emergencyPhoneNumber}
                            </div>
                        )}
                    </div>
                )
            case 3:
                return (
                    <div className="py-4">
                        <p className="mb-4 text-gray-500">We need your bank details for payroll processing.</p>
                        <Form.Item name="bankName" label="Bank Name" rules={[{ required: true }]}>
                            <Input prefix={<BankOutlined />} disabled={disabledsteps.includes(3)} />
                        </Form.Item>
                        <Form.Item name="bankbranch" label="Bank Branch Name" rules={[{ required: true }]}>
                            <Input disabled={disabledsteps.includes(3)} />
                        </Form.Item>
                        <Form.Item name="accountNumber" label="Account Number" rules={[{ required: true }]}>
                            <Input type='number' disabled={disabledsteps.includes(3)} />
                        </Form.Item>
                        <Form.Item name="accountHolder" label="Account Holder Name" rules={[{ required: true }]}>
                            <Input disabled={disabledsteps.includes(3)} />
                        </Form.Item>
                        <Form.Item name="ifscCode" label="IFSC / Routing Code" rules={[{ required: true }]}>
                            <Input disabled={disabledsteps.includes(3)} />
                        </Form.Item>

                        {/* Passbook Upload */}
                        <div className="mt-4">
                            <p className="text-sm font-medium text-gray-700 mb-2">Passbook / Bank Statement <span className="text-red-500">*</span></p>
                            <Upload.Dragger
                                name="passbook"
                                multiple={false}
                                showUploadList={passbookFile ? true : false}
                                beforeUpload={(file) => {
                                    setPassbookFile(file)
                                    handlePassbookUpload(file)
                                    return false
                                }}
                                className="!bg-gray-50 hover:!bg-blue-50 transition rounded-lg"
                                disabled={passbookUploading || disabledsteps.includes(3)}
                                accept=".pdf,.jpg,.jpeg,.png"
                            >
                                <p className="ant-upload-drag-icon">
                                    {passbookUploaded
                                        ? <Check className="w-6 h-6 text-green-500 mx-auto" />
                                        : <UploadOutlined className="text-xl text-blue-500" />
                                    }
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    {passbookUploading
                                        ? 'Uploading…'
                                        : passbookUploaded
                                            ? 'Passbook uploaded ✓'
                                            : 'Click or drag passbook / bank statement'}
                                </p>
                            </Upload.Dragger>
                        </div>
                    </div>
                )

            case 4:
                // Documents (was case 5)
                return (
                    <div className="py-4 text-center">
                        <p className="mb-6 text-gray-500">Please upload your ID proof and other relevant documents.</p>
                        {documentsLoading ? (
                            <div className="flex flex-col items-center justify-center py-12">
                                <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-3" />
                                <p className="text-gray-500">Loading documents...</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                                {documents && documents.length > 0 ? documents.map((doc) => {
                                    const isUploaded = existingDocuments.some(d => d.Document_Type__c === doc);
                                    return (
                                        <Card
                                            key={doc}
                                            className="rounded-xl shadow-sm hover:shadow-md transition"
                                            bodyStyle={{ padding: '16px' }}
                                        >
                                            {/* Title */}
                                            <p className="text-sm font-medium text-gray-700 mb-3">
                                                {doc} <span className="text-red-500">*</span>
                                            </p>

                                            {/* Upload Box */}
                                            <Upload.Dragger
                                                name={doc}
                                                customRequest={(opts) => handleDocumentUpload(opts, doc)}
                                                multiple={false}
                                                showUploadList={!isUploaded}
                                                className="!bg-gray-50 hover:!bg-blue-50 transition rounded-lg"
                                                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                                disabled={disabledsteps.includes(4)}
                                            >
                                                <p className="ant-upload-drag-icon">
                                                    {isUploaded ? <CheckCircleFilled className="text-xl text-green-500" /> : <UploadOutlined className="text-xl text-blue-500" />}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {isUploaded ? 'Document Uploaded' : 'Click or drag file'}
                                                </p>
                                            </Upload.Dragger>
                                        </Card>
                                    )
                                }) : (
                                    <div className="col-span-full text-center py-8">
                                        <p className="text-gray-400">No documents configured</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )
            default:
                return null
        }
    }

    const ContentWrapper = ({ children }: { children: React.ReactNode }) => {
        if (publicMode) {
            return (
                <div className="min-h-screen bg-slate-50 flex flex-col py-8 px-4 sm:px-6 lg:px-8">
                    <div className="max-w-4xl mx-auto w-full mb-8 flex justify-center items-center gap-3">
                        <img src="/mv_logo1.png" alt="MV Clouds" className="h-10 sm:h-12 drop-shadow-sm" />
                        <span className="font-bold text-slate-800 text-xl tracking-tight uppercase">MV Clouds</span>
                    </div>
                    <div className="max-w-4xl mx-auto w-full bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden flex flex-col relative p-6 sm:p-8">
                        {children}
                    </div>
                </div>
            )
        }
        return (
            <Modal
                title={
                    <div className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                        Welcome Onboard! 🚀
                    </div>
                }
                open={open}
                footer={null}
                closable={false}
                maskClosable={false}
                centered
                width='90vw'
                height='calc(100vh - 40px)'
                styles={{
                    body: {
                        padding: '24px',
                        maxHeight: '86vh',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                    },
                    mask: { backdropFilter: 'blur(8px)', backgroundColor: 'rgba(0,0,0,0.6)' }
                }}
                className="onboarding-modal"
            >
                {children}
            </Modal>
        )
    };

    if (publicMode && isExpired) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl shadow-xl border border-slate-100 max-w-lg w-full p-10 text-center">
                    <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-6" />
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">Link Expired</h2>
                    <p className="text-gray-500 text-lg mb-8">This onboarding link is no longer valid or you have already completed the onboarding process.</p>

                    <div className="mt-8 flex justify-center items-center gap-3 border-t border-slate-100 pt-8 opacity-80">
                        <img src="/mv_logo1.png" alt="MV Clouds" className="h-8 drop-shadow-sm" />
                        <span className="font-bold text-slate-800 tracking-tight">MV Clouds</span>
                    </div>
                </div>
            </div>
        )
    }

    if (publicMode && currentStep > stepItems.length) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                {true && <Confetti recycle={false} numberOfPieces={500} />}
                <div className="bg-white rounded-3xl shadow-xl border border-slate-100 max-w-lg w-full p-10 text-center">
                    <CheckCircleOutlined className="text-6xl text-green-500 mb-6" />
                    <h2 className="text-3xl font-bold text-gray-800 mb-4">You're All Set!</h2>
                    <p className="text-gray-500 text-lg mb-8">You have successfully completed the onboarding process. Your data is being securely processed by the HR team.</p>

                    <div className="mt-8 flex justify-center items-center gap-3 border-t border-slate-100 pt-8 opacity-80">
                        <img src="/mv_logo1.png" alt="MV Clouds" className="h-8 drop-shadow-sm" />
                        <span className="font-bold text-slate-800 tracking-tight">MV Clouds</span>
                    </div>
                </div>
            </div>
        )
    }

    if (!publicMode && !open && !showConfetti) return null;

    return (
        <>
            {showConfetti && <Confetti recycle={false} numberOfPieces={500} />}
            <ContentWrapper>
                {!screens.md ? (
                    <div className="mb-6 md:mb-8">
                        <div className="flex items-center justify-center gap-3 py-4 px-2 overflow-x-auto">
                            {stepItems.map((item, index) => {
                                const isActive = index + 1 === currentStep;
                                const isCompleted = index + 1 < currentStep;

                                return (
                                    <motion.div
                                        key={index}
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        transition={{ delay: index * 0.1 }}
                                        className="flex flex-col items-center gap-1.5 group"
                                    >
                                        <div
                                            className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold transition-all duration-300 flex-shrink-0 shadow-md
                                        ${isCompleted ? 'bg-gradient-to-br from-cyan-400 to-blue-600' :
                                                    isActive ? 'bg-gradient-to-br from-blue-500 to-blue-700' :
                                                        'bg-gradient-to-br from-gray-100 to-gray-200 border-2 border-gray-300 group-hover:border-blue-300 group-hover:shadow-blue-100'}`}
                                            title={item.title}
                                        >
                                            {isCompleted ? (
                                                <motion.div
                                                    initial={{ rotate: -180, scale: 0 }}
                                                    animate={{ rotate: 0, scale: 1 }}
                                                    transition={{ duration: 0.4, type: 'spring' }}
                                                    className="flex items-center justify-center"
                                                >
                                                    <CheckCircleFilled className="text-white text-xl" />
                                                </motion.div>
                                            ) : (
                                                <motion.div
                                                    className={`text-lg flex items-center justify-center ${isActive ? 'text-white' : 'text-gray-600 group-hover:text-blue-600'}`}
                                                    animate={isActive ? { scale: [1, 1.1, 1] } : {}}
                                                    transition={isActive ? { repeat: Infinity, duration: 2 } : {}}
                                                >
                                                    {item.icon}
                                                </motion.div>
                                            )}
                                        </div>
                                        {isActive && (
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: 24 }}
                                                className="h-1 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full shadow-sm"
                                            />
                                        )}

                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="mb-6 md:mb-8">
                        <Steps current={currentStep - 1} items={stepItems} />
                    </div>
                )}
                <Spin spinning={loading || passbookUploading || documentsUploading} size="large" tip="Processing...">
                    <div className="min-h-[300px]" style={{ height: '100%', flex: 1, overflowY: 'auto' }}>
                        {pageLoading ? (
                            <div className="flex flex-col items-center justify-center h-full min-h-[300px]">
                                <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
                                <p className="text-gray-500 font-medium">Loading your details...</p>
                            </div>
                        ) : (
                            <Form form={form} layout="vertical" initialValues={{ emergencyCountryCode: '+91' }}>
                                <AnimatePresence mode="wait">
                                    {currentStep <= stepItems.length ? (
                                        <motion.div
                                            key={currentStep}
                                            initial={{ y: 10, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            exit={{ y: -10, opacity: 0 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            {renderStepContent(currentStep)}
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="finish"
                                            initial={{ scale: 0.8, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            className="text-center py-10"
                                        >
                                            <CheckCircleOutlined className="text-6xl text-green-500 mb-4" />
                                            <h2 className="text-2xl font-bold text-gray-800">All Set!</h2>
                                            <p className="text-gray-500 mt-2 block">You have successfully completed the onboarding process.</p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </Form>
                        )}
                    </div>
                </Spin>
                <div className="flex flex-col sm:flex-row justify-between pt-6 border-t border-gray-100 mt-6 gap-3">
                    <div className="flex gap-2 sm:gap-3 order-2 sm:order-1">
                        {!publicMode && (
                            <Button disabled={pageLoading} onClick={() => setOpen(false)} className="flex-1 sm:flex-initial">
                                Skip for Now
                            </Button>
                        )}
                    </div>

                    {currentStep <= stepItems.length && (
                        <div className="flex gap-2 sm:gap-3 order-1 sm:order-2 w-full sm:w-auto">
                            {currentStep > 1 && (
                                <Button disabled={pageLoading} type="primary" size="large" onClick={handlePrevious} className="flex-1 sm:flex-initial">
                                    ← Previous
                                </Button>
                            )}
                            {currentStep < stepItems.length ? (
                                <Button disabled={pageLoading} type="primary" size="large" onClick={handleNext} loading={loading} className="flex-1 sm:flex-initial">
                                    Next Step
                                </Button>
                            ) : (
                                <Button disabled={pageLoading} type="primary" size="large" onClick={handleFinish} loading={loading} className="bg-green-600 hover:bg-green-700 w-full sm:w-auto flex-1 sm:flex-initial">
                                    Complete
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </ContentWrapper>
        </>
    )
}
