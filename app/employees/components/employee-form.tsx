import { useState } from "react"
import { Modal, Form, Input, Select, DatePicker, Upload, Button, Tabs, message } from "antd"
import { UploadOutlined, InboxOutlined } from "@ant-design/icons"
import type { UploadFile } from "antd/es/upload/interface"
import dayjs from "dayjs"
import type { Employee } from "@/types"

interface EmployeeFormProps {
  employee?: Employee
  onSubmit: (data: Employee) => void
  onCancel: () => void
}

const { Option } = Select
const { Dragger } = Upload

export function EmployeeForm({ employee, onSubmit, onCancel }: EmployeeFormProps) {
  const [form] = Form.useForm()
  const [activeTab, setActiveTab] = useState("basic")
  
  // Initialize form values
  const initialValues = employee ? {
    ...employee,
    joinDate: employee.joinDate ? dayjs(employee.joinDate) : undefined,
  } : {
    status: "active",
    joinDate: dayjs(),
    documents: [] as UploadFile[],
  }

  const handleFinish = (values: any) => {
    // Transform values back to expected format
    const formattedData: Employee = {
      ...values,
      id: employee?.id || Math.random().toString(36).substr(2, 9),
      joinDate: values.joinDate ? values.joinDate.format("YYYY-MM-DD") : undefined,
    }

    if(values.documents) {
         formattedData.documents = values.documents.fileList ? values.documents.fileList.map((f: any) => ({
             id: f.uid,
             name: f.name,
             type: 'other',
             url: f.url || '', // Mock
             uploadDate: new Date().toISOString().split('T')[0],
             verified: false
         })) : []
    }

    onSubmit(formattedData)
  }

  const items = [
    {
      key: "basic",
      label: "Basic Info",
      children: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Form.Item name="firstName" label="First Name" rules={[{ required: true, message: 'Required' }]}>
            <Input placeholder="John" />
          </Form.Item>
          <Form.Item name="lastName" label="Last Name" rules={[{ required: true, message: 'Required' }]}>
             <Input placeholder="Doe" />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
             <Input placeholder="john@company.com" />
          </Form.Item>
          <Form.Item name="phone" label="Phone" rules={[{ required: true }]}>
             <Input placeholder="+1-555-0101" />
          </Form.Item>
          <Form.Item name="department" label="Department" rules={[{ required: true }]}>
            <Select placeholder="Select Department">
              <Option value="IT">IT</Option>
              <Option value="Admin">Admin</Option>
              <Option value="HR">HR</Option>
              <Option value="Marketing">Marketing</Option>
              <Option value="Finance">Finance</Option>
            </Select>
          </Form.Item>
          <Form.Item name="position" label="Position" rules={[{ required: true }]}>
             <Input placeholder="Senior Developer" />
          </Form.Item>
          <Form.Item name="joinDate" label="Join Date" rules={[{ required: true }]}>
             <DatePicker className="w-full" format="YYYY-MM-DD" />
          </Form.Item>
          <Form.Item name="salary" label="Salary" rules={[{ required: true }]}>
             <Input type="number" prefix="$" placeholder="120000" />
          </Form.Item>
          <Form.Item name="status" label="Status" className="md:col-span-2">
            <Select>
              <Option value="active">Active</Option>
              <Option value="intern">Intern</Option>
              <Option value="on_notice">On Notice</Option>
              <Option value="resigned">Resigned</Option>
              <Option value="terminated">Terminated</Option>
            </Select>
          </Form.Item>
        </div>
      ),
    },
    {
      key: "personal",
      label: "Personal Details",
      children: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <Form.Item name={['personalDetails', 'address']} label="House / Street">
             <Input placeholder="123 Main St, Apt 4" />
           </Form.Item>
           <Form.Item name={['personalDetails', 'city']} label="City">
             <Input placeholder="New York" />
           </Form.Item>
           <Form.Item name={['personalDetails', 'state']} label="State">
             <Input placeholder="NY" />
           </Form.Item>
           <Form.Item name={['personalDetails', 'zipCode']} label="Zip Code">
             <Input placeholder="10001" />
           </Form.Item>
           <Form.Item name={['personalDetails', 'nationality']} label="Nationality">
             <Input placeholder="American" />
           </Form.Item>
           <Form.Item name={['personalDetails', 'emergencyContact']} label="Emergency Contact">
             <Input placeholder="Name" />
           </Form.Item>
           <Form.Item name={['personalDetails', 'emergencyPhone']} label="Emergency Phone">
             <Input placeholder="+1..." />
           </Form.Item>
        </div>
      ),
    },
    {
      key: "bank",
      label: "Bank Details",
      children: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <Form.Item name={['bankDetails', 'accountHolderName']} label="Account Holder">
             <Input />
           </Form.Item>
           <Form.Item name={['bankDetails', 'bankName']} label="Bank Name">
             <Input />
           </Form.Item>
           <Form.Item name={['bankDetails', 'accountNumber']} label="Account Number">
             <Input />
           </Form.Item>
           <Form.Item name={['bankDetails', 'ifscCode']} label="IFSC / Routing">
             <Input />
           </Form.Item>
        </div>
      ),
    },
    {
       key: "documents",
       label: "Documents",
       children: (
         <div className="space-y-4">
            <Form.Item name="documents" valuePropName="fileList" getValueFromEvent={(e: any) => {
                if (Array.isArray(e)) return e;
                return e && e.fileList;
            }}>
              <Dragger name="files" multiple={true} action="" beforeUpload={() => false}>
                <p className="ant-upload-drag-icon">
                  <InboxOutlined />
                </p>
                <p className="ant-upload-text">Click or drag file to this area to upload</p>
                <p className="ant-upload-hint">
                  Support for a single or bulk upload. Strict prohibit from uploading company data or other band files
                </p>
              </Dragger>
            </Form.Item>
         </div>
       )
    }
  ]

  return (
    <Modal
      title={employee ? "Edit Employee" : "Add New Employee"}
      open={true}
      onCancel={onCancel}
      footer={null}
      width={800}
      centered
      className="employee-modal"
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={initialValues}
        onFinish={handleFinish}
        className="flex flex-col h-[70vh]"
      >
        <div className="flex-1 overflow-y-auto px-1">
            <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={items}
            className="mb-6"
            />
        </div>
        
        <div className="flex justify-end gap-3 pt-4 border-t border-border bg-card z-10">
           <Button onClick={onCancel}>Cancel</Button>
           <Button type="primary" htmlType="submit">
             {employee ? "Update Employee" : "Create Employee"}
           </Button>
        </div>
      </Form>
    </Modal>
  )
}
