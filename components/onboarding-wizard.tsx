
"use client"

import { useState, useEffect } from "react"
import { Modal, Steps, Form,Grid, Input, Button, Upload, message, Collapse ,Checkbox , Divider , Card} from "antd"
import { UploadOutlined, BankOutlined, UserOutlined, FileTextOutlined, CheckCircleOutlined, CameraOutlined, GoogleOutlined, CheckCircleFilled } from "@ant-design/icons"
import { useQueryClient } from "@tanstack/react-query"
import Confetti from "react-confetti"
import { motion, AnimatePresence } from "framer-motion"
import { Check, AlertCircle, Loader2, Trash2 } from "lucide-react"
import ImgCrop from "antd-img-crop"

export function OnboardingWizard() {
    const [open, setOpen] = useState(false)
    const [currentStep, setCurrentStep] = useState(0)
    const [loading, setLoading] = useState(false)
    const [form] = Form.useForm()
    const phonePattern = /^(\+91|91)?[6-9]\d{9}$|^[6-9]\d{9}$/
    const [formErrors, setFormErrors] = useState<Record<string, string>>({})
    console.log(form.getFieldsValue())
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
    const {useBreakpoint} = Grid;
    const screens = useBreakpoint();
    useEffect(() => {
        // Check status on mount
        fetch('/api/auth/onboarding-status')
            .then(res => res.json())
            .then(data => {
                if (data.showOnboarding) {
                    setOpen(true)
                    setCurrentStep(data.currentStep || 1)
                }
            })
            .catch(err => console.error(err))
    }, [])

    useEffect(() => {
        // Fetch documents configuration
        setDocumentsLoading(true)
        fetch('/api/admin/configurations?types=documents')
            .then(res => res.json())
            .then(data => {
                if (data.documents && Array.isArray(data.documents)) {
                    const docNames = data.documents.map((doc: any) => ({
                        value: doc.Value__c,
                        label: doc.MasterLabel
                    }));                    
                    const common = docNames[0].value?.split(',');
                    setDocuments(common)
                }
            })
            .catch(err => console.error('Failed to fetch documents:', err))
            .finally(() => setDocumentsLoading(false))
    }, [])

    useEffect(() => {
        if (open) {
            checkGoogleStatus()
        }
    }, [open])

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
        { title: 'Google Sync', icon: <GoogleOutlined /> },
        { title: 'Documents', icon: <FileTextOutlined /> },
    ]

    const validateEmergencyPhone = (value: string) => {
        if (!value) return true
        const normalized = value.replace(/[\s-]/g, "")
        return phonePattern.test(normalized)
    }

    const handlePassbookUpload = async (file: File) => {        
        if (!file) return
        if (file.size > 10 * 1024 * 1024) {
            message.error("File size exceeds 10MB limit.")
            return
        }
        setPassbookUploading(true)
        const formData = new FormData()
        formData.append('file', file)
        formData.append('type', 'Passbook')
        formData.append('step', '3_passbook')
        console.log(formData)
        try {
            const res = await fetch('/api/auth/onboarding-status', {
                method: 'POST',
                body: formData
            })
            console.log(res)
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
        try {
            setLoading(true)
            setFormErrors({}) // Clear previous errors
            
            if (currentStep === 1) {
                 // Profile Photo Upload (Step 1 in API)
                 if (profileFile) {
                     const formData = new FormData()
                     formData.append('file', profileFile)
                     formData.append('step', '1')
                     const res = await fetch('/api/auth/onboarding-status', {
                         method: 'POST',
                         body: formData
                     })
                     if (!res.ok) throw new Error('Upload Failed')
                 } else {
                     // Just advance step
                     await fetch('/api/auth/onboarding-status', {
                         method: 'POST',
                         headers: { 'Content-Type': 'application/json' },
                         body: JSON.stringify({ step: 1, data: {} })
                     })
                 }
            } else if (currentStep === 4) {
                // Google Integration step — just advance, no mandatory action
                await fetch('/api/auth/onboarding-status', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ step: 4, data: {} })
                })
            } else if (currentStep === 2) {
                // Validate emergency phone for personal info step
                const values = await form.validateFields()
                const emergencyPhone = values.emergencyPhone?.trim()
                
                if (emergencyPhone && !validateEmergencyPhone(emergencyPhone)) {
                    setFormErrors({ emergencyPhone: 'Emergency contact must be 10 digits or +91 followed by 10 digits' })
                    setLoading(false)
                    return
                }
                
                const res = await fetch('/api/auth/onboarding-status', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        step: currentStep, 
                        data: values 
                    })
                })
                if (!res.ok) throw new Error('Failed')
            } else {
                // Standard JSON steps
                const values = await form.validateFields()
                const res = await fetch('/api/auth/onboarding-status', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        step: currentStep, 
                        data: values 
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

    const handleDocumentUpload = async (options: any , doc : any) => {
        const { file, onSuccess, onError } = options
        const formData = new FormData()
        formData.append('file', file)
        formData.append('type', doc)
        formData.append('step', '5') // Docs step (was 4, now 5)

        try {
            const res = await fetch('/api/auth/onboarding-status', {
                method: 'POST',
                body: formData
            })
            if (!res.ok) throw new Error('Upload Failed')
            onSuccess("Ok")
            message.success('Uploaded successfully')
        } catch (err) {
            onError({ err })
            message.error('Upload failed')
        }
    }

    const handleFinish = async () => {
        try {
            setLoading(true)
            await fetch('/api/auth/onboarding-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'complete' })
            })
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
            setShowConfetti(true)
            message.success("Onboarding Completed! Starting your portal tour... 🎉")
            // Start tour globally after confetti delay
            setTimeout(() => {
                setShowConfetti(false)
                window.dispatchEvent(new CustomEvent('mv:tour:autostart'))
            }, 3000)
        } catch (e) {
             setLoading(false)
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
                            <Input placeholder="123 Main St" />
                        </Form.Item>
                        <div className="grid grid-cols-2 gap-4">
                            <Form.Item name="city" label="City" rules={[{ required: true }]}>
                                <Input />
                            </Form.Item>
                            <Form.Item name="state" label="State" rules={[{ required: true }]}>
                                <Input />
                            </Form.Item>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                             <Form.Item name="postalCode" label="Postal Code" rules={[{ required: true }]}>
                                <Input />
                            </Form.Item>
                            <Form.Item name="country" label="Country" rules={[{ required: true }]}>
                                <Input />
                            </Form.Item>
                        </div>
                        <Divider/>
                          <p className="mb-4 text-gray-500">Permanent Address</p>
                         <Form.Item
                            name="sameAsCurrent"
                            valuePropName="checked"
                            className="mb-3"
                            >
                            <Checkbox>
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
                                    <Input placeholder="123 Main St" />
                                    </Form.Item>

                                    <div className="grid grid-cols-2 gap-4">
                                    <Form.Item name="permanentcity" label="City" rules={[{ required: true }]}>
                                        <Input />
                                    </Form.Item>
                                    <Form.Item name="permanentstate" label="State" rules={[{ required: true }]}>
                                        <Input />
                                    </Form.Item>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                    <Form.Item name="permanentpostalCode" label="Postal Code" rules={[{ required: true }]}>
                                        <Input />
                                    </Form.Item>
                                    <Form.Item name="permanentcountry" label="Country" rules={[{ required: true }]}>
                                        <Input />
                                    </Form.Item>
                                    </div>

                                </>
                                );
                            }}
                            </Form.Item>
                             <Divider />
                            <Form.Item name="emergencyContact" label="Emergency Contact Name" rules={[{ required: true }]}>
                            <Input />
                            </Form.Item>
                            <Form.Item name="emergencyPhone" label="Emergency Contact Phone" rules={[{ required: true }]}>
                            <Input 
                                status={formErrors.emergencyPhone ? 'error' : ''}
                                className={formErrors.emergencyPhone ? 'border-red-500' : ''}
                            />
                            </Form.Item>
                            {formErrors.emergencyPhone && (
                                <div className='text-red-500 text-sm mb-4 flex items-center gap-1'>
                                    <AlertCircle className='w-4 h-4' />
                                    {formErrors.emergencyPhone}
                                </div>
                            )}
                    </div>
                )
            case 3:
                return (
                     <div className="py-4">
                        <p className="mb-4 text-gray-500">We need your bank details for payroll processing.</p>
                        <Form.Item name="bankName" label="Bank Name" rules={[{ required: true }]}>
                            <Input prefix={<BankOutlined />} />
                        </Form.Item>
                        <Form.Item name="bankbranch" label="Bank Branch Name" rules={[{ required: true }]}>
                            <Input />
                        </Form.Item>
                        <Form.Item name="accountNumber" label="Account Number" rules={[{ required: true }]}>
                            <Input />
                        </Form.Item>
                        <Form.Item name="accountHolder" label="Account Holder Name" rules={[{ required: true }]}>
                            <Input />
                        </Form.Item>
                        <Form.Item name="ifscCode" label="IFSC / Routing Code" rules={[{ required: true }]}>
                            <Input />
                        </Form.Item>

                        {/* Passbook Upload */}
                        <div className="mt-4">
                            <p className="text-sm font-medium text-gray-700 mb-2">Passbook / Bank Statement <span className="text-gray-400">(Optional)</span></p>
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
                                disabled={passbookUploading}
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
                // Google Integration
                return (
                    <div className="py-4">
                        <p className="mb-6 text-gray-500 text-center">
                            Connect your Google account to receive leave notifications via Gmail and sync approved leaves to your calendar. This step is optional.
                        </p>

                        {googleNotification && (
                            <div className={`mb-4 px-4 py-3 rounded-lg flex items-center gap-2 text-sm font-medium ${
                                googleNotification.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
                            }`}>
                                {googleNotification.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                                {googleNotification.message}
                                <button onClick={() => setGoogleNotification(null)} className="ml-auto opacity-60 hover:opacity-100">✕</button>
                            </div>
                        )}

                        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm max-w-md mx-auto">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-12 h-12 bg-white border border-slate-100 rounded-xl flex items-center justify-center p-2 shadow-sm">
                                    <svg viewBox="0 0 24 24" className="w-8 h-8">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800">Google Workspace</h3>
                                    <p className="text-sm text-slate-500">Gmail &amp; Calendar Sync</p>
                                </div>
                                <div className={`ml-auto px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 border ${
                                    googleConnected
                                    ? "bg-green-50 text-green-700 border-green-100"
                                    : "bg-slate-50 text-slate-500 border-slate-100"
                                }`}>
                                    {googleConnected ? (
                                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block" />
                                    ) : (
                                        <span className="w-2 h-2 rounded-full bg-slate-300 inline-block" />
                                    )}
                                    {googleConnected ? "Connected" : "Not Connected"}
                                </div>
                            </div>

                            <p className="text-sm text-slate-600 mb-5 leading-relaxed">
                                Seamlessly integrate with your Google account to enable automatic leave notifications and sync approved leaves directly to your calendar.
                            </p>

                            {googleChecking ? (
                                <div className="h-10 bg-slate-100 rounded-xl animate-pulse" />
                            ) : !googleConnected ? (
                                <button
                                    onClick={handleGoogleConnect}
                                    disabled={googleLoading}
                                    className="w-full bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 text-slate-700 hover:text-blue-600 font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
                                >
                                    {googleLoading ? (
                                        <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                                    ) : (
                                        <>
                                            <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" />
                                            Connect Google Account
                                        </>
                                    )}
                                </button>
                            ) : (
                                <button
                                    onClick={handleGoogleDisconnect}
                                    disabled={googleLoading}
                                    className="w-full bg-slate-50 border border-slate-200 hover:bg-red-50 hover:border-red-200 text-slate-600 hover:text-red-600 font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {googleLoading ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <><Trash2 className="w-4 h-4" /> Disconnect</>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                )

            case 5:
                // Documents (was case 4)
                return (
                     <div className="py-4 text-center">
                        <p className="mb-6 text-gray-500">Please upload your ID proof and other relevant documents (Optional).</p>
                        {documentsLoading ? (
                            <div className="flex flex-col items-center justify-center py-12">
                                <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-3" />
                                <p className="text-gray-500">Loading documents...</p>
                            </div>
                        ) : (
                       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {documents && documents.length > 0 ? documents.map((doc) => (
                        <Card
                            key={doc}
                            className="rounded-xl shadow-sm hover:shadow-md transition"
                            bodyStyle={{ padding: '16px' }}
                        >
                            {/* Title */}
                            <p className="text-sm font-medium text-gray-700 mb-3">
                            {doc}
                            </p>

                            {/* Upload Box */}
                            <Upload.Dragger
                            name={doc}
                            customRequest={(opts) => handleDocumentUpload(opts, doc)}
                            multiple={false}
                            showUploadList={true}
                            className="!bg-gray-50 hover:!bg-blue-50 transition rounded-lg"
                            >
                            <p className="ant-upload-drag-icon">
                                <UploadOutlined className="text-xl text-blue-500" />
                            </p>
                            <p className="text-xs text-gray-500">
                                Click or drag file
                            </p>
                            </Upload.Dragger>
                        </Card>
                        )) : (
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

    if (!open && !showConfetti) return null;

    return (
        <>
            {showConfetti && <Confetti recycle={false} numberOfPieces={500} />}
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
                styles={ { body :{ padding: '24px' ,
                    maxHeight: '86vh',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',},
                    mask:{ backdropFilter: 'blur(8px)', backgroundColor: 'rgba(0,0,0,0.6)' }
                 }}
                className="onboarding-modal"
            >
                {!screens.md ? (
                    <div className="mb-6 md:mb-8">
                        <div className="flex items-center justify-center gap-3 py-4 px-2">
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

                <div className="min-h-[300px]" style={{    height: '100%',
    flex: 1,
    overflowY: 'auto'}}>
                    <Form form={form} layout="vertical">
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
                </div>

                <div className="flex flex-col sm:flex-row justify-between pt-6 border-t border-gray-100 mt-6 gap-3">
                    <div className="flex gap-2 sm:gap-3 order-2 sm:order-1">
                        <Button onClick={() => setOpen(false)} className="flex-1 sm:flex-initial">
                            Skip for Now
                        </Button>
                    </div>
                    
                    {currentStep <= stepItems.length && (
                        <div className="flex gap-2 sm:gap-3 order-1 sm:order-2 w-full sm:w-auto">
                        {currentStep > 1 && currentStep <= stepItems.length && (
                            <Button type="primary" size="large" onClick={handlePrevious} className="flex-1 sm:flex-initial">
                                ← Previous
                            </Button>
                        )}
                        <Button type="primary" size="large" onClick={handleNext} loading={loading} className="flex-1 sm:flex-initial">
                            Next Step
                        </Button>
                        </div>
                    )}
                     {currentStep > stepItems.length && (
                         <Button type="primary" size="large" onClick={handleFinish} loading={loading} className="bg-green-600 hover:bg-green-700 w-full sm:w-auto order-1 sm:order-2">
                            Get Started
                        </Button>
                    )}
                </div>
            </Modal>
        </>
    )
}
