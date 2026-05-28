"use client"
import { useState, useEffect } from 'react';
import { Modal, Form, Input, Checkbox, Button, Select } from 'antd';
import { updateProduct, getProductCategories } from '../actions';
import { showToast } from './toast';
import { SalesforceProduct } from '../types';

interface EditProductModalProps {
    visible: boolean;
    onCancel: () => void;
    onSuccess: () => void;
    product: SalesforceProduct | null;
}

export function EditProductModal({ visible, onCancel, onSuccess, product }: EditProductModalProps) {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState<{ label: string, value: string }[]>([]);

    useEffect(() => {
        if (visible) {
            getProductCategories()
                .then(setCategories)
                .catch(console.error);

            if (product) {
                form.setFieldsValue({
                    Name: product.Name,
                    AMS_Model_Number__c: product.AMS_Model_Number__c,
                    AMS_Category__c: product.AMS_Category__c,
                    AMS_Specifications__c: product.AMS_Specifications__c,
                    AMS_Description__c: product.AMS_Description__c,
                    IsActive: product.IsActive !== undefined ? product.IsActive : true,
                });
            } else {
                form.resetFields();
            }
        }
    }, [visible, product, form]);

    const handleFinish = async (values: any) => {
        if (!product) return;
        setLoading(true);
        try {
            await updateProduct(product.Id, values);
            showToast.success("Product Updated", { description: "Product updated successfully!" });
            onSuccess();
        } catch (e: any) {
            showToast.error("Update Failed", { description: "Product is already assigned." });
        } finally {
            setLoading(false);
        }
    }

    return (
        <Modal
            title="Edit Product"
            open={visible}
            onCancel={onCancel}
            destroyOnClose
            centered
            width={750}
            footer={[
                <Button key="cancel" onClick={onCancel}>
                    Cancel
                </Button>,
                <Button key="submit" type="primary" loading={loading} onClick={() => form.submit()}>
                    Save Changes
                </Button>
            ]}
        >
            <Form
                form={form}
                layout="vertical"
                onFinish={handleFinish}
                className="pt-2"
            >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Form.Item name="Name" label="Product Name" rules={[{ required: true, message: 'Please enter product name' }]}>
                        <Input placeholder="e.g. MacBook Pro M3" maxLength={80} />
                    </Form.Item>
                    <Form.Item name="AMS_Model_Number__c" label="Model Number" rules={[{ required: true, message: 'Model Number is required' }]}>
                        <Input placeholder="e.g. A2992" maxLength={50} />
                    </Form.Item>
                    <Form.Item name="AMS_Category__c" label="Category" rules={[{ required: true, message: 'Please select category' }]}>
                        <Select placeholder="Select Category" options={categories} disabled />
                    </Form.Item>
                </div>
                <Form.Item name="AMS_Specifications__c" label="Specifications">
                    <Input.TextArea rows={3} placeholder="e.g. M3 Pro Chip, 18GB RAM, 512GB SSD" maxLength={255} />
                </Form.Item>
                <Form.Item name="AMS_Description__c" label="Description">
                    <Input.TextArea rows={2} placeholder="e.g. Standard issue for Engineering team" maxLength={255} />
                </Form.Item>
                <Form.Item name="IsActive" valuePropName="checked">
                    <Checkbox>Active</Checkbox>
                </Form.Item>
            </Form>
        </Modal>
    )
}
