"use client"
import { useState, useEffect } from 'react';
import { Modal, Form, Input, Checkbox, Button, Select } from 'antd';
import { createProduct, getProductCategories } from '../actions';
import { showToast } from './toast';

interface CreateProductModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
}

export function CreateProductModal({ visible, onCancel, onSuccess }: CreateProductModalProps) {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState<{ label: string, value: string }[]>([]);

    useEffect(() => {
        if (visible) {
            getProductCategories()
                .then(setCategories)
                .catch(console.error);
        }
    }, [visible]);

    const handleFinish = async (values: any) => {
        setLoading(true);
        try {
            await createProduct(values);
            showToast.success("Product Created", { description: "Product created successfully!" });
            onSuccess();
            form.resetFields();
        } catch (e: any) {
            showToast.error("Creation Failed", { description: e.message });
        } finally {
            setLoading(false);
        }
    }

    return (
         <Modal
            title="Create New Product"
            open={visible}
            onCancel={onCancel}
            destroyOnClose
            centered
            width={600}
            footer={[
                <Button key="cancel" onClick={onCancel}>
                    Cancel
                </Button>,
                <Button key="submit" type="primary" loading={loading} onClick={() => form.submit()}>
                    Create Product
                </Button>
            ]}
        >
            <Form 
                form={form} 
                layout="vertical" 
                onFinish={handleFinish} 
                initialValues={{ IsActive: true }}
                className="pt-2"
            >
                <Form.Item name="Name" label="Product Name" rules={[{ required: true, message: 'Please enter product name' }]}>
                    <Input placeholder="e.g. MacBook Pro M3" />
                </Form.Item>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <Form.Item name="AMS_Model_Number__c" label="Model Number" rules={[{ required: true, message: 'Model Number is required' }]}>
                        <Input placeholder="e.g. A2992" />
                    </Form.Item>
                     <Form.Item name="AMS_Category__c" label="Category" rules={[{ required: true, message: 'Please select category' }]}>
                        <Select placeholder="Select Category" options={categories} />
                    </Form.Item>
                </div>
                 <Form.Item name="AMS_Specifications__c" label="Specifications">
                    <Input.TextArea rows={3} placeholder="e.g. M3 Pro Chip, 18GB RAM, 512GB SSD" />
                </Form.Item>
                 <Form.Item name="AMS_Description__c" label="Description">
                    <Input.TextArea rows={2} placeholder="e.g. Standard issue for Engineering team" />
                </Form.Item>
                 <Form.Item name="IsActive" valuePropName="checked">
                    <Checkbox>Active</Checkbox>
                </Form.Item>
            </Form>
        </Modal>
    )
}
