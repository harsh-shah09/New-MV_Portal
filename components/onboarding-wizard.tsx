
"use client"

import { useState, useEffect, useRef } from "react"
import { Modal, Steps, Form, Grid, Input, Button, Upload, message, Collapse, Checkbox, Divider, Card, Spin, Select } from "antd"
import { UploadOutlined, BankOutlined, UserOutlined, FileTextOutlined, CheckCircleOutlined, CameraOutlined, GoogleOutlined, CheckCircleFilled } from "@ant-design/icons"
import { useQueryClient } from "@tanstack/react-query"
import Confetti from "react-confetti"
import { motion, AnimatePresence } from "framer-motion"
import { Check, AlertCircle, Loader2, Trash2 } from "lucide-react"
import ImgCrop from "antd-img-crop"
import { getCountries, getCountryCallingCode, parsePhoneNumberFromString, AsYouType, CountryCode, getExampleNumber } from 'libphonenumber-js'
import examples from 'libphonenumber-js/examples.mobile.json'
import { Country, State, City } from "country-state-city"
import { showToast } from "@/app/assets/components/toast"

const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
const dynamicCountryOptions = getCountries().map((country) => {
    return {
        value: country,
        label: `${regionNames.of(country)} (+${getCountryCallingCode(country)})`,
        dialCode: `+${getCountryCallingCode(country)}`,
        name: regionNames.of(country) || '',
    };
}).sort((a, b) => a.name.localeCompare(b.name));

export interface OnboardingWizardProps {
    publicMode?: boolean;
    publicEmpId?: string;
    firsttime?: boolean;
    step?: number;
}

export function OnboardingWizard({ publicMode = false, publicEmpId, firsttime = false, step = 1 }: OnboardingWizardProps = {}) {
    const [open, setOpen] = useState(publicMode ? true : false)
    const [currentStep, setCurrentStep] = useState(4)
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
    const { useBreakpoint } = Grid;
    const screens = useBreakpoint();

    const splitEmergencyContact = (value?: string) => {
        const normalized = value?.trim() || ''
        const phoneNumber = parsePhoneNumberFromString(normalized)

        if (phoneNumber) {
            return {
                emergencyCountryCode: phoneNumber.country || 'IN',
                emergencyPhoneNumber: phoneNumber.formatNational(),
            }
        }

        const match = value?.trim().match(/^(\+\d{1,3})[- ]?(\d+)$/)
        if (match) {
            return {
                emergencyCountryCode: 'IN',
                emergencyPhoneNumber: match[2],
            }
        }

        return {
            emergencyCountryCode: 'IN',
            emergencyPhoneNumber: value?.replace(/\D/g, '').slice(0, 10) || '',
        }
    }

    const mergeEmergencyContact = (countryCode?: string, phoneNumber?: string) => {
        const isoCode = (countryCode || 'IN') as CountryCode
        const number = phoneNumber?.trim() || ''
        if (!number) return ''
        const parsed = parsePhoneNumberFromString(number, isoCode)
        const dialCode = `+${getCountryCallingCode(isoCode)}`
        const formattedNumber = parsed ? parsed.nationalNumber : number.replace(/\D/g, '')
        return `${dialCode}-${formattedNumber}`
    }

    const validateEmergencyPhone = (isoCode: string, value: string) => {
        if (!value) return true;
        // Try parsing with the formatted value first
        let parsed = parsePhoneNumberFromString(value, isoCode as CountryCode);
        if (!parsed || !parsed.isValid()) {
            // If that fails, try with digits only
            const digitsOnly = value.replace(/\D/g, '');
            if (digitsOnly) {
                parsed = parsePhoneNumberFromString(digitsOnly, isoCode as CountryCode);
            }
        }
        return parsed ? parsed.isValid() : false;
    };

    const validateEmergencyCountryCode = (value: string) => {
        return true
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
                            emergencyRelation: emp.Emergency_Contact_Relation__c || '',
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
            showToast.error("File size exceeds 5MB limit.")
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
            showToast.success(`${file.name} uploaded successfully`)
        } catch (err) {
            showToast.error(`${file.name} upload failed`)
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
                    showToast.error("Please upload a profile picture to proceed.");
                    setLoading(false);
                    return;
                }
                if (profileFile) {
                    const isImage = profileFile.type.startsWith("image/");
                    if (!isImage) {
                        showToast.error("Only image files are allowed (JPG, PNG, etc.)");
                        setLoading(false);
                        return;
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
                // Let the form validate naturally
                try {
                    const values = await form.validateFields();

                    // Custom validation that can't be done via rules
                    const postalPattern = /^[0-9]{5,10}$/;
                    const namePattern = /^[a-zA-Z\s-]*$/;

                    const customErrors: Record<string, string> = {};

                    // Validate current address
                    if (values.postalCode && !postalPattern.test(values.postalCode)) {
                        customErrors.postalCode = 'Postal code should contain 5-10 digits';
                    }
                    if (values.emergencyContact && !namePattern.test(values.emergencyContact)) {
                        customErrors.emergencyContact = 'Name cannot contain numbers or special characters';
                    }
                    if (values.emergencyRelation && !namePattern.test(values.emergencyRelation)) {
                        customErrors.emergencyRelation = 'Relation cannot contain numbers or special characters';
                    }

                    // Validate permanent address if not same as current
                    if (!values.sameAsCurrent) {
                        if (values.permanentpostalCode && !postalPattern.test(values.permanentpostalCode)) {
                            customErrors.permanentpostalCode = 'Postal code should contain 5-10 digits';
                        }
                    }

                    // Validate emergency phone
                    if (values.emergencyPhoneNumber) {
                        const digitsOnly = values.emergencyPhoneNumber.replace(/\D/g, '');
                        if (!validateEmergencyPhone(values.emergencyCountryCode, digitsOnly)) {
                            customErrors.emergencyPhoneNumber = 'Please enter a valid phone number for the selected country';
                        }
                    }

                    // If there are custom validation errors, set them and stop
                    if (Object.keys(customErrors).length > 0) {
                        setFormErrors(customErrors);
                        // Also set form field errors for inline display
                        form.setFields(
                            Object.entries(customErrors).map(([name, error]) => ({
                                name,
                                errors: [error],
                            }))
                        );
                        showToast.error("Please fix all validation errors before proceeding.");
                        setLoading(false);
                        return;
                    }

                    // Manual check for required fields
                    if (!values.street || !values.city || !values.state || !values.postalCode || !values.country || !values.emergencyContact || !values.emergencyRelation || !values.emergencyCountryCode || !values.emergencyPhoneNumber) {
                        showToast.error("Please fill in all required personal information.");
                        setLoading(false);
                        return;
                    }
                    if (!values.sameAsCurrent) {
                        if (!values.permanentstreet || !values.permanentcity || !values.permanentstate || !values.permanentpostalCode || !values.permanentcountry) {
                            showToast.error("Please fill in all required permanent address information.");
                            setLoading(false);
                            return;
                        }
                    }

                    const mergedEmergencyPhone = mergeEmergencyContact(values.emergencyCountryCode, values.emergencyPhoneNumber)

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
                } catch (validationError: any) {
                    // Ant Design form validation failed - errors will show inline automatically
                    console.error("Validation error:", validationError);
                    // Don't show toast here as Ant Design already shows inline errors
                    setLoading(false);
                    return;
                }
            } else if (currentStep === 3) {
                // Similar approach for bank details
                try {
                    const values = await form.validateFields();

                    // Check if form validation failed (this shouldn't happen as errors would be caught)
                    if (!values) {
                        setLoading(false);
                        return;
                    }

                    const customErrors: Record<string, string> = {};
                    if (values.accountNumber) {
                        const accPattern = /^\d{9,18}$/;
                        if (!accPattern.test(values.accountNumber)) {
                            customErrors.accountNumber = 'Account number must be 9-18 digits';
                            setFormErrors(customErrors)
                            setLoading(false)
                            showToast.warning('Account number must be 9-18 digits')
                            return
                        }
                    }
                    // Validate account holder name specifically
                    if (values.accountHolder) {
                        const namePattern = /^[a-zA-Z\s.]+$/;
                        if (!namePattern.test(values.accountHolder)) {
                            customErrors.accountHolder = 'Name can only contain letters, spaces and periods';
                        }
                    }

                    // Additional bank validations
                    if (values.accountNumber) {
                        // Check if account number contains only digits
                        if (!/^\d+$/.test(values.accountNumber)) {
                            customErrors.accountNumber = 'Account number must contain only digits';
                        }
                        // Check length
                        else if (values.accountNumber.length < 9) {
                            customErrors.accountNumber = 'Account number must be at least 9 digits';
                        }
                        else if (values.accountNumber.length > 18) {
                            customErrors.accountNumber = 'Account number must not exceed 18 digits';
                        }

                        // Check for commonly used test account numbers
                        const commonTestNumbers = ['12345678', '123456789', '000000000', '111111111', '999999999'];
                        if (commonTestNumbers.includes(values.accountNumber)) {
                            customErrors.accountNumber = 'Please enter a valid account number';
                        }
                    }

                    // Check for required fields
                    if (!values.bankName || !values.bankbranch || !values.accountNumber || !values.accountHolder || !values.ifscCode) {
                        showToast.error("Please fill in all required bank details.");
                        setLoading(false);
                        return;
                    }
                    if(values.bankbranch){
                        if(values.bankbranch.length > 100){
                            customErrors.bankbranch = 'Bank Branch name cannot exceed 100 characters.'
                            showToast.error("Bank Branch name cannot exceed 100 characters.");
                            setLoading(false);
                            return;
                        }
                    }
                    if (!passbookUploaded) {
                        showToast.error("Please upload your Passbook or Bank Statement to proceed.");
                        setLoading(false);
                        return;
                    }

                    // If there are custom validation errors, set them and STOP
                    if (Object.keys(customErrors).length > 0) {
                        setFormErrors(customErrors);
                        form.setFields(
                            Object.entries(customErrors).map(([name, error]) => ({
                                name,
                                errors: [error],
                            }))
                        );
                        // Remove the toast message to avoid confusion with inline errors
                        // message.error("Please fix all validation errors before proceeding.");
                        setLoading(false);
                        return; // This is crucial - stop execution here
                    }

                    // Only proceed if no errors
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

                    // Success - move to next step
                    setCurrentStep(prev => prev + 1)
                    setLoading(false)
                    return; // Explicitly return after success

                } catch (validationError: any) {
                    console.error("Validation error:", validationError);
                    // Don't show toast for validation errors as inline errors are shown
                    setLoading(false);
                    return;
                }
            } else if (currentStep === 4) {
                // Document validation
                if (documents && documents.length > 0) {
                    const missingDocs = documents.filter(docName => !existingDocuments.some(d => d.Document_Type__c === docName));
                    if (missingDocs.length > 0) {
                        showToast.error("Please upload all required documents to proceed.");
                        setLoading(false);
                        return;
                    }
                }

                try {
                    const values = await form.validateFields();
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
                } catch (validationError: any) {
                    console.error("Validation error:", validationError);
                    setLoading(false);
                    return;
                }
            }

            setCurrentStep(prev => prev + 1)
            setLoading(false)
        } catch (error) {
            console.error("Error:", error)
            if (error instanceof Error && !error.message.includes('Validation')) {
                showToast.error(error.message || "An error occurred. Please try again.");
            }
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
            showToast.error(`File size exceeds 5MB limit.`)
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
            setExistingDocuments(prev => [...prev, { Document_Type__c: doc, FileName: file.name }])
            showToast.success('Uploaded successfully')
        } catch (err) {
            onError({ err })
            showToast.error('Upload failed')
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
                showToast.error(`Please upload the following required documents: ${missingDocs.join(', ')}`);
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
            showToast.success("Onboarding Completed! 🎉")
            // Start tour globally after confetti delay (only for internal mode)
            setTimeout(() => {
                setShowConfetti(false)
                if (!publicMode) window.dispatchEvent(new CustomEvent('mv:tour:autostart'))
            }, 3000)
        } catch (e: any) {
            setLoading(false)
            showToast.error(e.message || "Failed to complete onboarding.")
        }
    }
    const formatFileSize = (size?: number) => {
        if (!size) return '';
        const kb = size / 1024;
        if (kb < 1024) return `${kb.toFixed(1)} KB`;
        return `${(kb / 1024).toFixed(2)} MB`;
    };
    const renderStepContent = (step: number) => {
        switch (step) {
            case 1:
                return (
                    <div className="py-8 text-center flex flex-col items-center">
                        <p className="mb-6 text-gray-500">Upload a professional profile picture.</p>
                        <ImgCrop rotationSlider cropShape="round" showGrid aspect={1} quality={0.6} modalTitle="Crop Image" beforeCrop={(file)=>{
                            if(!file.type.includes('image/')) {
                                showToast.error('Only image files are allowed')
                                return false
                            }
                            if(file.size > 1.1*1024*1024) {
                                showToast.error('File size should be less than 1MB')

                                return false
                            }
                            return true
                        }}>
                            <Upload
                                listType="picture-circle"
                                showUploadList={false}
                                beforeUpload={(file) => {
                                    console.log(file.size)
                                    if(file.size > 1.1*1024*1024) {
                                        return false
                                    }
                                    if(!file.type.includes('image/')) {
                                        return false
                                    }
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
                        <Form.Item name="street" label="Street Address" rules={[{ required: true, message: 'Street address is required' } , {pattern: /^[A-Za-z]*$/, message: 'Street address should contain only alphabets'} ,
                            { max: 100, message: 'Street address should not exceed 100 characters'} ,
                            { min: 2, message: 'Street address should be at least 2 characters long'}
                        ]}>
                            <Input placeholder="123 Main St" disabled={disabledsteps.includes(2)} />
                        </Form.Item>
                        <div className="grid grid-cols-2 gap-4">
                            <Form.Item name="country" label="Country" rules={[{ required: true, message: 'Country is required' }]}>
                                <Select
                                    showSearch
                                    placeholder="Select country"
                                    options={Country.getAllCountries().map(country => ({ label: country.name, value: country.name }))}
                                    optionFilterProp="label"
                                    disabled={disabledsteps.includes(2)}
                                    onChange={(val) => {
                                        form.setFieldsValue({ state: undefined, city: undefined });
                                        const code = dynamicCountryOptions.find(c => c.name === val)?.value;
                                        if (code) form.setFieldValue('emergencyCountryCode', code);
                                        form.setFieldValue('emergencyPhoneNumber', ''); // clear mismatch
                                    }}
                                />
                            </Form.Item>
                            <Form.Item noStyle shouldUpdate={(prev, curr) => prev.country !== curr.country}>
                                {({ getFieldValue }) => {
                                    const countryVal = getFieldValue('country');
                                    const countryCode = Country.getAllCountries().find(c => c.name === countryVal)?.isoCode;
                                    const states = countryCode ? State.getStatesOfCountry(countryCode) : [];
                                    return (
                                        <Form.Item 
                                            name="state" 
                                            label="State" 
                                            rules={[{ required: true, message: 'State is required' }]}
                                        >
                                            <Select
                                                showSearch
                                                placeholder="Select state"
                                                options={states.map(s => ({ label: s.name, value: s.name }))}
                                                optionFilterProp="label"
                                                disabled={disabledsteps.includes(2) || !countryVal}
                                                onChange={() => form.setFieldValue('city', undefined)}
                                            />
                                        </Form.Item>
                                    );
                                }}
                            </Form.Item>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Form.Item noStyle shouldUpdate={(prev, curr) => prev.country !== curr.country || prev.state !== curr.state}>
                                {({ getFieldValue }) => {
                                    const countryVal = getFieldValue('country');
                                    const stateVal = getFieldValue('state');
                                    const countryCode = Country.getAllCountries().find(c => c.name === countryVal)?.isoCode;
                                    const stateCode = State.getStatesOfCountry(countryCode || '').find(s => s.name === stateVal)?.isoCode;
                                    const cities = (countryCode && stateCode) ? City.getCitiesOfState(countryCode, stateCode) : [];
                                    return (
                                        <Form.Item 
                                            name="city" 
                                            label="City" 
                                            rules={[{ required: true, message: 'City is required' }]}
                                        >
                                            <Select
                                                showSearch
                                                placeholder="Select city"
                                                options={cities.map(c => ({ label: c.name, value: c.name }))}
                                                optionFilterProp="label"
                                                disabled={disabledsteps.includes(2) || !stateVal}
                                            />
                                        </Form.Item>
                                    );
                                }}
                            </Form.Item>
                            <Form.Item 
                                name="postalCode" 
                                label="Postal Code" 
                                rules={[
                                    { required: true, message: 'Postal code is required' },
                                    { pattern: /^[0-9]{5,10}$/, message: 'Postal code should contain 5-10 digits' }
                                ]}
                            >
                                <Input 
                                    disabled={disabledsteps.includes(2)}
                                    onChange={(e) => {
                                        const onlyDigits = e.target.value.replace(/\D/g, '').slice(0, 10);
                                        form.setFieldValue('postalCode', onlyDigits);
                                    }}
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
                                        <Form.Item name="permanentstreet" label="Street Address" rules={[{ required: true, message: 'Street address is required' }]}>
                                            <Input placeholder="123 Main St" disabled={disabledsteps.includes(2)} />
                                        </Form.Item>

                                        <div className="grid grid-cols-2 gap-4">
                                            <Form.Item name="permanentcountry" label="Country" rules={[{ required: true, message: 'Country is required' }]}>
                                                <Select
                                                    showSearch
                                                    placeholder="Select country"
                                                    options={Country.getAllCountries().map(country => ({ label: country.name, value: country.name }))}
                                                    optionFilterProp="label"
                                                    disabled={disabledsteps.includes(2)}
                                                    onChange={() => {
                                                        form.setFieldsValue({ permanentstate: undefined, permanentcity: undefined });
                                                    }}
                                                />
                                            </Form.Item>
                                            <Form.Item noStyle shouldUpdate={(prev, curr) => prev.permanentcountry !== curr.permanentcountry}>
                                                {({ getFieldValue }) => {
                                                    const countryVal = getFieldValue('permanentcountry');
                                                    const countryCode = Country.getAllCountries().find(c => c.name === countryVal)?.isoCode;
                                                    const states = countryCode ? State.getStatesOfCountry(countryCode) : [];
                                                    return (
                                                        <Form.Item 
                                                            name="permanentstate" 
                                                            label="State" 
                                                            rules={[{ required: true, message: 'State is required' }]}
                                                        >
                                                            <Select
                                                                showSearch
                                                                placeholder="Select state"
                                                                options={states.map(s => ({ label: s.name, value: s.name }))}
                                                                optionFilterProp="label"
                                                                disabled={disabledsteps.includes(2) || !countryVal}
                                                                onChange={() => form.setFieldValue('permanentcity', undefined)}
                                                            />
                                                        </Form.Item>
                                                    );
                                                }}
                                            </Form.Item>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <Form.Item noStyle shouldUpdate={(prev, curr) => prev.permanentcountry !== curr.permanentcountry || prev.permanentstate !== curr.permanentstate}>
                                                {({ getFieldValue }) => {
                                                    const countryVal = getFieldValue('permanentcountry');
                                                    const stateVal = getFieldValue('permanentstate');
                                                    const countryCode = Country.getAllCountries().find(c => c.name === countryVal)?.isoCode;
                                                    const stateCode = State.getStatesOfCountry(countryCode || '').find(s => s.name === stateVal)?.isoCode;
                                                    const cities = (countryCode && stateCode) ? City.getCitiesOfState(countryCode, stateCode) : [];
                                                    return (
                                                        <Form.Item 
                                                            name="permanentcity" 
                                                            label="City" 
                                                            rules={[{ required: true, message: 'City is required' }]}
                                                        >
                                                            <Select
                                                                showSearch
                                                                placeholder="Select city"
                                                                options={cities.map(c => ({ label: c.name, value: c.name }))}
                                                                optionFilterProp="label"
                                                                disabled={disabledsteps.includes(2) || !stateVal}
                                                            />
                                                        </Form.Item>
                                                    );
                                                }}
                                            </Form.Item>
                                            <Form.Item 
                                                name="permanentpostalCode" 
                                                label="Postal Code" 
                                                rules={[
                                                    { required: true, message: 'Postal code is required' },
                                                    { pattern: /^[0-9]{5,10}$/, message: 'Postal code should contain 5-10 digits' }
                                                ]}
                                            >
                                                <Input 
                                                    disabled={disabledsteps.includes(2)}
                                                    onChange={(e) => {
                                                        const onlyDigits = e.target.value.replace(/\D/g, '').slice(0, 10);
                                                        form.setFieldValue('permanentpostalCode', onlyDigits);
                                                    }}
                                                />
                                            </Form.Item>
                                        </div>

                                    </>
                                );
                            }}
                        </Form.Item>
                        <Divider />
                        <Form.Item 
                            name="emergencyContact" 
                            label="Emergency Contact Name" 
                            rules={[
                                { required: true, message: 'Emergency contact name is required' },
                                { pattern: /^[a-zA-Z\s-]*$/, message: 'Name cannot contain numbers or special characters' },
                                { max:100, message: 'Emergency contact name cannot exceed 100 characters' },
                                { min:3, message: 'Emergency contact name cannot be less than 3 characters' },
                            ]}
                            
                        >
                            <Input disabled={disabledsteps.includes(2)} placeholder="Enter emergency contact name" />
                        </Form.Item>
                        <Form.Item 
                            name="emergencyRelation" 
                            label="Emergency Contact Relation" 
                            rules={[
                                { required: true, message: 'Emergency contact relation is required' },
                                { pattern: /^[a-zA-Z\s-]*$/, message: 'Relation cannot contain numbers or special characters' },
                                { max:100, message: 'Emergency contact relation cannot exceed 100 characters' }
                            ]}
                        >
                            <Input disabled={disabledsteps.includes(2)} placeholder="e.g. Spouse, Parent, Sibling" />
                        </Form.Item>
                        <div className="grid grid-cols-1 sm:grid-cols-[300px_minmax(500px,_1fr)] sm:gap-4">
                            <Form.Item
                                name="emergencyCountryCode"
                                label="Country Code"
                                rules={[
                                    { required: true, message: 'Country code is required' },
                                ]}
                            >
                                <Select
                                                    showSearch
                                                    disabled={disabledsteps.includes(2)}
                                                    placeholder="Select country code"
                                                    options={dynamicCountryOptions.map(c => ({
                                                        value: c.value,
                                                        label: c.label
                                                    }))}
                                                    optionFilterProp="label"
                                                    status={formErrors.emergencyCountryCode ? 'error' : ''}
                                                    onChange={(value) => {
                                                        const phone = form.getFieldValue('emergencyPhoneNumber')
                                                    
                                                        if (phone) {
                                                          const isValid = validateEmergencyPhone(value, phone)
                                                    
                                                          if (!isValid) {
                                                            setFormErrors({
                                                              emergencyPhoneNumber: 'Please enter a valid phone number for the selected country'
                                                            })
                                                          } else {
                                                            setFormErrors({})
                                                          }
                                                        } else {
                                                          setFormErrors({})
                                                        }
                                                      }}
                                                />
                            </Form.Item>

                            <Form.Item noStyle shouldUpdate={(prev, current) => prev.emergencyCountryCode !== current.emergencyCountryCode}>
                                {({ getFieldValue }) => {
                                    const selectedCountry = (getFieldValue('emergencyCountryCode') || 'IN') as CountryCode;
                                    const exampleNumber = getExampleNumber(selectedCountry, examples);
                                    const formatString = exampleNumber ? exampleNumber.formatNational() : '98765 43210';
                                    const phoneMaxLength = formatString.length;

                                    return (
                                        // In the emergency phone number section of case 2:
                                        <Form.Item
                                            name="emergencyPhoneNumber"
                                            label="Emergency Contact Number"
                                            dependencies={['emergencyCountryCode']}
                                            validateTrigger={['onChange', 'onBlur']}
                                            rules={[
                                                { required: true, message: 'Emergency contact number is required' },
                                                () => ({
                                                    validator(_, value) {
                                                        if (!value) return Promise.resolve();
                                                        const selectedCountry = form.getFieldValue('emergencyCountryCode') || 'IN';
                                                        const cleanValue = value.replace(/\D/g, '');
                                                        const parsed = parsePhoneNumberFromString(cleanValue, selectedCountry as CountryCode);
                                                        if (parsed && parsed.isValid()) {
                                                            return Promise.resolve();
                                                        }
                                                        return Promise.reject(new Error('Invalid phone number for selected country'));
                                                    }
                                                }),
                                            ]}
                                            getValueFromEvent={(e) => {
                                                const inputValue = e.target.value;
                                                const selectedCountry = form.getFieldValue('emergencyCountryCode') || 'IN';
                                                const digitsOnly = inputValue.replace(/\D/g, '');

                                                const formatter = new AsYouType(selectedCountry as CountryCode);
                                                let formatted = '';
                                                for (const char of digitsOnly) {
                                                    formatted = formatter.input(char);
                                                }

                                                return formatted;
                                            }}
                                        >
                                            <Input
                                                placeholder={formatString}
                                                maxLength={phoneMaxLength + 5}
                                                status={formErrors.emergencyPhoneNumber ? 'error' : ''}
                                                disabled={disabledsteps.includes(2)}
                                                onChange={() => {
                                                    if (formErrors.emergencyPhoneNumber) {
                                                        setFormErrors(prev => ({ ...prev, emergencyPhoneNumber: '' }));
                                                    }
                                                }}
                                            />
                                        </Form.Item>
                                    );
                                }}
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

                        {/* Bank Name */}
                        <Form.Item
                            name="bankName"
                            label="Bank Name"
                            rules={[
                                { required: true, message: 'Bank name is required' },
                                { min: 2, message: 'Bank name must be at least 2 characters' },
                                { max: 50, message: 'Bank name must not exceed 50 characters' },
                                { 
                                    pattern: /^[a-zA-Z\s]+$/, 
                                    message: 'Bank name can only contain letters.' 
                                  }
                            ]}
                        >
                            <Input
                                prefix={<BankOutlined />}
                                placeholder="e.g., State Bank of India"
                                disabled={disabledsteps.includes(3)}
                            />
                        </Form.Item>

                        {/* Bank Branch */}
                        <Form.Item
                            name="bankbranch"
                            label="Bank Branch Name"
                            rules={[
                                { required: true, message: 'Bank branch is required' },
                                { min: 2, message: 'Branch name must be at least 2 characters' },
                                { max: 100, message: 'Branch name must not exceed 100 characters' },
                                { pattern: /^[a-zA-Z0-9\s.,&\-()]+$/, message: 'Branch name contains invalid characters' }
                            ]}
                        >
                            <Input
                                placeholder="e.g., MG Road Branch"
                                disabled={disabledsteps.includes(3)}
                            />
                        </Form.Item>

                        {/* Account Number */}
                        <Form.Item
                            name="accountNumber"
                            label="Account Number"
                            validateTrigger={['onChange', 'onBlur']}  // Add this line
                            rules={[
                                { required: true, message: 'Account number is required' },
                                { pattern: /^\d{9,18}$/, message: 'Account number must be 9-18 digits' }
                            ]}
                        >
                            <Input
                                placeholder="Enter account number"
                                type="text"
                                inputMode="numeric"
                                maxLength={18}
                                disabled={disabledsteps.includes(3)}
                                onChange={(e) => {
                                    const onlyDigits = e.target.value.replace(/\D/g, '').slice(0, 18)
                                    form.setFieldValue('accountNumber', onlyDigits)
                                }}
                            />
                        </Form.Item>

                        {/* Account Holder Name */}
                        <Form.Item
                            name="accountHolder"
                            label="Account Holder Name"
                            validateTrigger={['onChange', 'onBlur']}  // Add this line
                            rules={[
                                { required: true, message: 'Account holder name is required' },
                                { min: 2, message: 'Name must be at least 2 characters' },
                                { max: 100, message: 'Name must not exceed 100 characters' },
                                {
                                    pattern: /^[a-zA-Z\s.]+$/,
                                    message: 'Name can only contain letters, spaces and periods'
                                }
                            ]}
                        >
                            <Input
                                placeholder="Enter account holder name as per bank records"
                                disabled={disabledsteps.includes(3)}
                                onChange={(e) => {
                                    // Optional: Prevent typing numbers/special chars
                                    const sanitized = e.target.value.replace(/[^a-zA-Z\s.]/g, '');
                                    if (sanitized !== e.target.value) {
                                        form.setFieldValue('accountHolder', sanitized);
                                    }
                                }}
                            />
                        </Form.Item>

                        {/* IFSC Code */}
                        <Form.Item
                            name="ifscCode"
                            label="IFSC Code"
                            rules={[
                                { required: true, message: 'IFSC code is required' },
                                {
                                    pattern: /^[A-Z]{4}0[A-Z0-9]{6}$/,
                                    message: 'IFSC code format: 4 letters + 0 + 6 alphanumeric (e.g., SBIN0001234)'
                                },
                                { len: 11, message: 'IFSC code must be exactly 11 characters' }
                            ]}
                        >
                            <Input
                                placeholder="e.g., SBIN0001234"
                                maxLength={11}
                                style={{ textTransform: 'uppercase' }}
                                disabled={disabledsteps.includes(3)}
                                onChange={(e) => {
                                    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11)
                                    form.setFieldValue('ifscCode', value)
                                }}
                            />
                        </Form.Item>

                        {/* Passbook Upload */}
                        <div className="mt-4">
                            <p className="text-sm font-medium text-gray-700 mb-2">
                                Passbook / Bank Statement <span className="text-red-500">*</span>
                            </p>
                            <Upload.Dragger
                                name="passbook"
                                multiple={false}
                                showUploadList={passbookFile ? true : false}
                                beforeUpload={(file) => {
                                    // Validate file type
                                    const isValidType = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'].includes(file.type)
                                    if (!isValidType) {
                                        showToast.error('You can only upload PDF, JPG, or PNG files!')
                                        return Upload.LIST_IGNORE
                                    }

                                    // Validate file size (5MB)
                                    const isLessThan5MB = file.size / 1024 / 1024 < 5
                                    if (!isLessThan5MB) {
                                        showToast.error('File must be smaller than 5MB!')
                                        return Upload.LIST_IGNORE
                                    }

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
                                            ? `${passbookFile?.name || 'Passbook'} uploaded ✓`
                                            : 'Click or drag passbook / bank statement'}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                    Supported formats: PDF, JPG, PNG (Max 5MB)
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
                                                    {isUploaded ? (existingDocuments.find(d => d.Document_Type__c === doc)?.FileName || 'Document Uploaded') : 'Click or drag file'}
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

    // if (publicMode && isExpired) {
    //     return (
    //         <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
    //             <div className="bg-white rounded-3xl shadow-xl border border-slate-100 max-w-lg w-full p-10 text-center">
    //                 <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-6" />
    //                 <h2 className="text-2xl font-bold text-gray-800 mb-4">Link Expired</h2>
    //                 <p className="text-gray-500 text-lg mb-8">This onboarding link is no longer valid or you have already completed the onboarding process.</p>

    //                 <div className="mt-8 flex justify-center items-center gap-3 border-t border-slate-100 pt-8 opacity-80">
    //                     <img src="/mv_logo1.png" alt="MV Clouds" className="h-8 drop-shadow-sm" />
    //                     <span className="font-bold text-slate-800 tracking-tight">MV Clouds</span>
    //                 </div>
    //             </div>
    //         </div>
    //     )
    // }

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
                            <Form form={form} layout="vertical" initialValues={{ emergencyCountryCode: 'IN' }}>
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