
"use client"

import { useState, useEffect } from "react"
import { Modal, Steps, Form, Input, Button, Upload, message, Result } from "antd"
import { UploadOutlined, BankOutlined, UserOutlined, FileTextOutlined, CheckCircleOutlined, CameraOutlined } from "@ant-design/icons"
import { useQueryClient } from "@tanstack/react-query"
import Confetti from "react-confetti"
import { motion, AnimatePresence } from "framer-motion"

export function OnboardingWizard() {
    const [open, setOpen] = useState(false)
    const [currentStep, setCurrentStep] = useState(0)
    const [loading, setLoading] = useState(false)
    const [form] = Form.useForm()
    const queryClient = useQueryClient()
    const [showConfetti, setShowConfetti] = useState(false)
    const [profileFile, setProfileFile] = useState<File | null>(null)

    useEffect(() => {
        // Check status on mount
        fetch('/api/auth/onboarding-status')
            .then(res => res.json())
            .then(data => {
                if (data.showOnboarding) {
                    setOpen(true)
                    setCurrentStep(data.currentStep || 0)
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
            
            if (currentStep === 0) {
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
                     // If skipped or no file, just advance step via JSON or API call?
                     // Assuming API handles 'skip' if we send json step=1 with no data?
                     // Or force upload? Let's assume optional or basic skip.
                     // The backend update for step 1 only runs if multipart. 
                     // We need to tell backend to advance step if no file.
                     // I'll send a JSON request to advance step if no file.
                     await fetch('/api/auth/onboarding-status', {
                         method: 'POST',
                         headers: { 'Content-Type': 'application/json' },
                         body: JSON.stringify({ step: 1, data: {} }) // Just to advance
                     })
                 }
            } else {
                // Standard JSON steps
                const values = await form.validateFields()
                const res = await fetch('/api/auth/onboarding-status', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        step: currentStep + 1, // matches API expectation
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

    const handleDocumentUpload = async (options: any) => {
        const { file, onSuccess, onError } = options
        const formData = new FormData()
        formData.append('file', file)
        formData.append('type', 'ID Proof') // Default or ask user
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
                // Personal Info (Previously 0)
                return (
                    <div className="py-4">
                        <p className="mb-4 text-gray-500">Please verify your personal details.</p>
                        <Form.Item name="address" label="Address" rules={[{ required: true }]}>
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
                             <Form.Item name="zipCode" label="Zip Code" rules={[{ required: true }]}>
                                <Input />
                            </Form.Item>
                            <Form.Item name="nationality" label="Nationality" rules={[{ required: true }]}>
                                <Input />
                            </Form.Item>
                        </div>
                        <Form.Item name="emergencyContact" label="Emergency Contact Name" rules={[{ required: true }]}>
                            <Input />
                        </Form.Item>
                        <Form.Item name="emergencyPhone" label="Emergency Contact Phone" rules={[{ required: true }]}>
                            <Input />
                        </Form.Item>
                    </div>
                )
            case 3:
                // Bank (Previously 1)
                return (
                     <div className="py-4">
                        <p className="mb-4 text-gray-500">We need your bank details for payroll processing.</p>
                        <Form.Item name="bankName" label="Bank Name" rules={[{ required: true }]}>
                            <Input prefix={<BankOutlined />} />
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
                     </div>
                )
            case 4:
                // Documents (Previously 2)
                return (
                     <div className="py-4 text-center">
                        <p className="mb-6 text-gray-500">Please upload your ID proof and other relevant documents (Optional).</p>
                        <Upload.Dragger 
                            customRequest={(opts) => handleDocumentUpload(opts)} 
                            multiple={true}
                            listType="picture"
                        >
                            <p className="ant-upload-drag-icon">
                                <UploadOutlined />
                            </p>
                            <p className="ant-upload-text">Click or drag file to this area to upload</p>
                        </Upload.Dragger>
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
                            {currentStep < stepItems.length ? (
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
                    
                    {currentStep < stepItems.length - 1 && (
                        <Button type="primary" size="large" onClick={handleNext} loading={loading}>
                            Next Step
                        </Button>
                    )}
                    {currentStep === stepItems.length - 1 && (
                         <Button type="primary" size="large" onClick={() => setCurrentStep(prev => prev + 1)}>
                            Continue
                        </Button>
                    )}
                     {currentStep >= stepItems.length && (
                         <Button type="primary" size="large" onClick={handleFinish} loading={loading} className="bg-green-600 hover:bg-green-700">
                            Get Started
                        </Button>
                    )}
                </div>
            </Modal>
        </>
    )
}
