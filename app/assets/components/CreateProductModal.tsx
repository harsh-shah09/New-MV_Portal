"use client"

import { useState } from 'react';
import { Modal, Form, Input, Checkbox, Button, message } from 'antd';
import { createProduct } from '../actions';

interface CreateProductModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
}

export function CreateProductModal({ visible, onCancel, onSuccess }: CreateProductModalProps) {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);

    const handleFinish = async (values: any) => {
        setLoading(true);
        try {
            await createProduct(values);
            message.success("Product created successfully!");
            onSuccess();
            form.resetFields();
        } catch (e: any) {
            message.error(e.message);
        } finally {
            setLoading(false);
        }
    }

    return (
         <Modal
            title="Create New Product"
            open={visible}
            onCancel={onCancel}
            footer={null}
            destroyOnClose
        >
            <Form form={form} layout="vertical" onFinish={handleFinish} initialValues={{ IsActive: true }}>
                <Form.Item name="Name" label="Product Name" rules={[{ required: true }]}>
                    <Input placeholder="e.g. MacBook Pro M3" />
                </Form.Item>
                <div className="grid grid-cols-2 gap-4">
                     <Form.Item name="AMS_Model_Number__c" label="Model Number" rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>
                     <Form.Item name="AMS_Category__c" label="Category" rules={[{ required: true }]}>
                        <Input placeholder="e.g. Laptop" />
                    </Form.Item>
                </div>
                 <Form.Item name="AMS_Specifications__c" label="Specifications">
                    <Input.TextArea rows={3} />
                </Form.Item>
                 <Form.Item name="AMS_Description__c" label="Description">
                    <Input.TextArea rows={2} />
                </Form.Item>
                 <Form.Item name="IsActive" valuePropName="checked">
                    <Checkbox>Active</Checkbox>
                </Form.Item>

                 <div className="flex justify-end gap-2 pt-4">
                    <Button onClick={onCancel}>Cancel</Button>
                    <Button type="primary" htmlType="submit" loading={loading}>
                        Create Product
                    </Button>
                </div>
            </Form>
        </Modal>
    )
}
