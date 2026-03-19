
"use client"

import { useState, useEffect } from "react"
import { Modal, Steps, Form, Input, Button, Upload, message, Collapse ,Checkbox , Divider , Card} from "antd"
import { UploadOutlined, BankOutlined, UserOutlined, FileTextOutlined, CheckCircleOutlined, CameraOutlined } from "@ant-design/icons"
import { useQueryClient } from "@tanstack/react-query"
import Confetti from "react-confetti"
import { motion, AnimatePresence } from "framer-motion"

export function OnboardingWizard() {
    const [open, setOpen] = useState(false)
    const [currentStep, setCurrentStep] = useState(0)
    const [loading, setLoading] = useState(false)
    const [form] = Form.useForm()
    console.log(form.getFieldsValue())
    const queryClient = useQueryClient()
    const [showConfetti, setShowConfetti] = useState(false)
    const [profileFile, setProfileFile] = useState<File | null>(null)
    const documents = ['Aadhar Card', 'PAN Card', 'Degree Certificate'];

    useEffect(() => {
        // Check status on mount
        fetch('/api/auth/onboarding-status')
            .then(res => res.json())
            .then(data => {
                if (data.showOnboarding) {
                    setOpen(true)
                    // If backend returns 0 or null, start at step 1
                    setCurrentStep(data.currentStep || 1)
                }
            })
            .catch(err => console.error(err))
    }, [])
    const stepItems = [
        { title: 'Profile Picture', icon: <CameraOutlined /> },
        { title: 'Personal Info', icon: <UserOutlined /> },
        { title: 'Bank Details', icon: <BankOutlined /> },
        { title: 'Documents', icon: <FileTextOutlined /> }
    ]
    const handleNext = async () => {
        try {
            setLoading(true)
            
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
                if (currentStep === 2) form.resetFields()
            }
            
            setCurrentStep(prev => prev + 1)
            setLoading(false)
        } catch (error) {
            console.error("Validation Failed:", error)
            setLoading(false)
        }
    }

    const handleDocumentUpload = async (options: any , doc : any) => {
        const { file, onSuccess, onError } = options
        const formData = new FormData()
        formData.append('file', file)
        formData.append('type', doc) // Default or ask user
        formData.append('step', '4') // Docs step

        try {
            const res = await fetch('/api/auth/onboarding-status', {
                method: 'POST',
                body: formData
            })
            if (!res.ok) throw new Error('Upload Failed')
            onSuccess("Ok")
            message.success(`${file.name} uploaded successfully`)
        } catch (err) {
            onError({ err })
            message.error(`${file.name} upload failed`)
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
            setLoading(false)
            setOpen(false)
            setShowConfetti(true)
            message.success("Onboarding Completed!")
            setTimeout(() => setShowConfetti(false), 5000)
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
                        <Upload 
                            listType="picture-card"
                            showUploadList={false}
                            beforeUpload={(file) => {
                                setProfileFile(file)
                                return false
                            }}
                            className="avatar-uploader"
                        >
                            {profileFile ? (
                                <img src={URL.createObjectURL(profileFile)} alt="avatar" style={{ width: '100%', borderRadius: '50%' }} />
                            ) : (
                                <div>
                                    <CameraOutlined />
                                    <div style={{ marginTop: 8 }}>Upload</div>
                                </div>
                            )}
                        </Upload>
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
                        {/* <Form.Item name="emergencyContact" label="Emergency Contact Name" rules={[{ required: true }]}>
                            <Input />
                        </Form.Item>
                        <Form.Item name="emergencyPhone" label="Emergency Contact Phone" rules={[{ required: true }]}>
                            <Input />
                        </Form.Item> */}
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
                            <Input />
                            </Form.Item>
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
                            <Input prefix={<svg id="Location--Streamline-Carbon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" height="16" width="16">
                                    <desc>
                                        Location Streamline Icon: https://streamlinehq.com
                                    </desc>
                                    <defs></defs>
                                    <title>location</title>
                                    <path d="M16 18a5 5 0 1 1 5-5 5.0057 5.0057 0 0 1-5 5Zm0-8a3 3 0 1 0 3 3 3.0033 3.0033 0 0 0-3-3Z" fill="#000000"></path>
                                    <path d="m16 30-8.4355-9.9487c-.0479-.0571-.3482-.4515-.3482-.4515A10.8888 10.8888 0 0 1 5 13a11 11 0 0 1 22 0 10.8844 10.8844 0 0 1-2.2148 6.5973l-.0015.0025s-.3.3944-.3447.4474ZM8.8125 18.395c.001.0007.2334.3082.2866.3744L16 26.9079l6.91-8.15c.0439-.0552.2783-.3649.2788-.3657A8.901 8.901 0 0 0 25 13a9 9 0 1 0-18 0 8.9054 8.9054 0 0 0 1.8125 5.395Z" fill="#000000"></path>
                                    <path id="_Transparent_Rectangle_" transform="rotate(-90 16 16)" d="M0 0h32v32H0Z" fill="none"></path>
                                    </svg>} />
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
                        <Form.Item name="passbook" label="IFSC / Routing Code" rules={[{ required: true }]}>
                            <Upload />
                        </Form.Item>
                     </div>
                )
            case 4:
                return (
                     <div className="py-4 text-center">
                        <p className="mb-6 text-gray-500">Please upload your ID proof and other relevant documents (Optional).</p>
                       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {documents.map((doc) => (
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
                        ))}
                    </div>
                        
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
                bodyStyle={{ padding: '24px' ,
                    maxHeight: '86vh',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                 }}
                className="onboarding-modal"
                maskStyle={{ backdropFilter: 'blur(8px)', backgroundColor: 'rgba(0,0,0,0.6)' }}
            >
                <div className="mb-8">
                     <Steps current={currentStep - 1} items={stepItems} />
                </div>

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

                <div className="flex justify-between pt-6 border-t border-gray-100 mt-6">
                    <Button onClick={() => setOpen(false)}>Skip for Now</Button>
                    
                    {currentStep <= stepItems.length && (
                        <Button type="primary" size="large" onClick={handleNext} loading={loading}>
                            Next Step
                        </Button>
                    )}
                     {currentStep > stepItems.length && (
                         <Button type="primary" size="large" onClick={handleFinish} loading={loading} className="bg-green-600 hover:bg-green-700">
                            Get Started
                        </Button>
                    )}
                </div>
            </Modal>
        </>
    )
}
