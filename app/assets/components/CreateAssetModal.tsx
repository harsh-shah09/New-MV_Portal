"use client"

import { useState, useEffect } from 'react';
import { Modal, Form, Select, DatePicker, Input, Button } from 'antd';
import { createAsset, getProducts } from '../actions';
import { SalesforceProduct } from '../types';
import dayjs from 'dayjs';
import { showToast } from './toast';

interface CreateAssetModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
}

export function CreateAssetModal({ visible, onCancel, onSuccess }: CreateAssetModalProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<SalesforceProduct[]>([]);

  useEffect(() => {
    if (visible) {
      loadProducts();
      form.resetFields();
    }
  }, [visible]);

  const loadProducts = async () => {
    try {
      const data = await getProducts();
      setProducts(data);
    } catch (e) {
      console.error("Failed to load products", e);
    }
  };

  const handleFinish = async (values: any) => {
    setLoading(true);
    try {
        await createAsset({
            AMS_Product__c: values.AMS_Product__c,
            AMS_Category__c: values.AMS_Category__c,
            AMS_Asset_Serial_Number__c: values.AMS_Asset_Serial_Number__c,
            AMS_Purchase_Date__c: values.AMS_Purchase_Date__c ? values.AMS_Purchase_Date__c.format('YYYY-MM-DD') : undefined,
            AMS_Warranty_Expiry_Date__c: values.AMS_Warranty_Expiry_Date__c ? values.AMS_Warranty_Expiry_Date__c.format('YYYY-MM-DD') : undefined,
            AMS_Purchase_Condition__c: values.AMS_Purchase_Condition__c,
        });
        showToast.success("Asset Created", { description: "Asset created successfully!" });
        onSuccess();
    } catch (err: any) {
        showToast.error("Creation Failed", { description: err.message.includes('duplicate') ? 'Serial number should be unique'  : 'Check inputs and try again' });
    } finally {
        setLoading(false);
    }
  };

  const handleProductChange = (productId: string) => {
      const prod = products.find(p => p.Id === productId);
      if (prod) {
          form.setFieldsValue({
              AMS_Category__c: prod.AMS_Category__c
          });
      }
  }

  return (
    <Modal
      title="Register New Asset"
      open={visible}
      onCancel={onCancel}
      footer={null}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        initialValues={{
            AMS_Purchase_Condition__c: 'New'
        }}
      >
        <Form.Item 
            name="AMS_Product__c" 
            label="Product Model" 
            rules={[{ required: true, message: 'Product is required' }]}
        >
            <Select 
                showSearch 
                placeholder="Select Product"
                optionFilterProp="children"
                onChange={handleProductChange}
            >
                {products.map(p => (
                    <Select.Option key={p.Id} value={p.Id}>
                        {p.Name} - {p.AMS_Model_Number__c}
                    </Select.Option>
                ))}
            </Select>
        </Form.Item>

        <div className="grid grid-cols-2 gap-4">
             <Form.Item name="AMS_Category__c" label="Category">
                <Input placeholder="Auto-filled from Product" />
            </Form.Item>
             <Form.Item 
                name="AMS_Asset_Serial_Number__c" 
                label="Serial Number"
                rules={[
                    { required: true, message: 'Required' },
                    { pattern: /^[0-9]+$/, message: 'Only numbers are allowed',},
                ]}
            >
                <Input placeholder='Enter Serial Number'/>
            </Form.Item>
        </div>

        <div className="grid grid-cols-2 gap-4">
            <Form.Item 
                name="AMS_Purchase_Date__c" 
                label="Purchase Date"
                rules={[{ required: true, message: 'Purchase Date is required' }]}
            >
                <DatePicker 
                    className="w-full" 
                    disabledDate={(current) => current && current > dayjs().endOf('day')}
                />
            </Form.Item>
             <Form.Item 
                name="AMS_Warranty_Expiry_Date__c" 
                label="Warranty Expiry"
                dependencies={['AMS_Purchase_Date__c']}
                rules={[
                    { required: true, message: 'Warranty Expiry Date is required' },
                    ({ getFieldValue }) => ({
                        validator(_, value) {
                            if (!value || !getFieldValue('AMS_Purchase_Date__c')) {
                                return Promise.resolve();
                            }
                            if (value.isBefore(getFieldValue('AMS_Purchase_Date__c'))) {
                                return Promise.reject(new Error('Warranty Expiry cannot be before Purchase Date!'));
                            }
                            return Promise.resolve();
                        },
                    }),
                ]}
            >
                <DatePicker className="w-full" />
            </Form.Item>
        </div>

        <Form.Item name="AMS_Purchase_Condition__c" label="Purchase Condition">
             <Select>
                <Select.Option value="New">New</Select.Option>
                <Select.Option value="Second-hand">Second hand</Select.Option>
            </Select>
        </Form.Item>

        <div className="flex justify-end gap-2 pt-4">
            <Button onClick={onCancel}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={loading}>
                Register Asset
            </Button>
        </div>
      </Form>
    </Modal>
  );
}
