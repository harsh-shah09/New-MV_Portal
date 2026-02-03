"use client"

import { useState } from "react"
import { Modal, Form, Input, Select, DatePicker, InputNumber, Button } from "antd"
import dayjs from "dayjs"
import type { Asset } from "@/types"

interface AssetFormProps {
  asset?: Asset
  onSubmit: (data: Asset | Omit<Asset, "id">) => void
  onCancel: () => void
}

const { Option } = Select
const { TextArea } = Input

export function AssetForm({ asset, onSubmit, onCancel }: AssetFormProps) {
  const [form] = Form.useForm()
  
  const initialValues = asset ? {
      ...asset,
      purchaseDate: asset.purchaseDate ? dayjs(asset.purchaseDate) : undefined,
  } : {
      status: "available",
      purchaseDate: dayjs(),
      condition: "new"
  }

  const handleFinish = (values: any) => {
    const formattedData = {
        ...values,
        purchaseDate: values.purchaseDate ? values.purchaseDate.format("YYYY-MM-DD") : undefined,
        currentValue: values.purchasePrice, // Simple logic for now
        id: asset?.id // Pass existing ID if editing
    }
    onSubmit(formattedData)
  }

  return (
    <Modal
      title={asset ? "Edit Asset" : "Add New Asset"}
      open={true}
      onCancel={onCancel}
      footer={null}
      width={700}
      centered
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={initialValues}
        onFinish={handleFinish}
        className="mt-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <Form.Item name="name" label="Asset Name" rules={[{ required: true, message: 'Required' }]}>
                 <Input placeholder="Dell XPS 13" />
             </Form.Item>
             <Form.Item name="assetTag" label="Asset Tag" rules={[{ required: true, message: 'Required' }]}>
                 <Input placeholder="AST-001" />
             </Form.Item>
             <Form.Item name="category" label="Category" rules={[{ required: true }]}>
                 <Select placeholder="Select Category">
                     <Option value="IT Equipment">IT Equipment</Option>
                     <Option value="Mobile Devices">Mobile Devices</Option>
                     <Option value="Furniture">Furniture</Option>
                     <Option value="Other">Other</Option>
                 </Select>
             </Form.Item>
             <Form.Item name="type" label="Type" rules={[{ required: true }]}>
                 <Select placeholder="Select Type">
                     <Option value="laptop">Laptop</Option>
                     <Option value="mobile">Mobile</Option>
                     <Option value="headset">Headset</Option>
                     <Option value="monitor">Monitor</Option>
                     <Option value="furniture">Furniture</Option>
                     <Option value="other">Other</Option>
                 </Select>
             </Form.Item>
             <Form.Item name="serialNumber" label="Serial Number" rules={[{ required: true }]}>
                 <Input placeholder="SN-123456" />
             </Form.Item>
             <Form.Item name="vendor" label="Vendor">
                 <Input placeholder="Dell Inc." />
             </Form.Item>
             <Form.Item name="purchaseDate" label="Purchase Date" rules={[{ required: true }]}>
                 <DatePicker className="w-full" format="YYYY-MM-DD" />
             </Form.Item>
             <Form.Item name="purchasePrice" label="Purchase Price" rules={[{ required: true }]}>
                 <InputNumber 
                    className="w-full"
                    formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={value => value!.replace(/\$\s?|(,*)/g, '')}
                 />
             </Form.Item>
             <Form.Item name="status" label="Status" rules={[{ required: true }]}>
                 <Select>
                     <Option value="available">Available</Option>
                     <Option value="assigned">Assigned</Option>
                     <Option value="in_repair">In Repair</Option>
                     <Option value="lost">Lost</Option>
                     <Option value="disposed">Disposed</Option>
                 </Select>
             </Form.Item>
             <Form.Item name="condition" label="Condition">
                 <Select>
                     <Option value="new">New</Option>
                     <Option value="good">Good</Option>
                     <Option value="fair">Fair</Option>
                     <Option value="poor">Poor</Option>
                 </Select>
             </Form.Item>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-4">
           <Button onClick={onCancel}>Cancel</Button>
           <Button type="primary" htmlType="submit">
             {asset ? "Update Asset" : "Create Asset"}
           </Button>
        </div>
      </Form>
    </Modal>
  )
}
