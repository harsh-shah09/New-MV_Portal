"use client"

import { useState } from "react"
import { Modal, Form, Input, Select, DatePicker, message , Button} from "antd"
import dayjs from "dayjs"
import type { LeaveRequest } from "@/types"

interface LeaveRequestFormProps {
  onSubmit: (data: Partial<LeaveRequest>) => void
  onCancel: () => void
  employeeId?: string
  employeeName?: string
}

const { Option } = Select
const { TextArea } = Input

export function LeaveRequestForm({ onSubmit, onCancel, employeeId, employeeName }: LeaveRequestFormProps) {
  const [form] = Form.useForm()
  const [duration, setDuration] = useState(0)

  // Recalculate duration when dates change
  const onValuesChange = (changedValues: any, allValues: any) => {
      if (changedValues.startDate || changedValues.endDate) {
          const start = allValues.startDate
          const end = allValues.endDate
          if (start && end) {
               const diff = end.diff(start, 'day') + 1
               setDuration(diff > 0 ? diff : 0)
          }
      }
  }

  const handleFinish = (values: any) => {
    onSubmit({
      ...values,
      startDate: values.startDate ? values.startDate.format("YYYY-MM-DD") : undefined,
      endDate: values.endDate ? values.endDate.format("YYYY-MM-DD") : undefined,
      duration,
      status: "pending",
    })
    message.success("Leave request submitted successfully!")
  }

  return (
    <Modal
      title="Request Leave"
      open={true}
      onCancel={onCancel}
      footer={null}
      centered
      width={600}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        onValuesChange={onValuesChange}
        initialValues={{
            leaveType: 'annual',
            startDate: dayjs().add(1, 'day'),
            endDate: dayjs().add(1, 'day')
        }}
        className="mt-4"
      >
          {employeeName && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg text-blue-900 border border-blue-100">
               <span className="font-semibold">Requesting for:</span> {employeeName}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Form.Item name="leaveType" label="Leave Type" rules={[{ required: true }]}>
                  <Select>
                      <Option value="annual">Annual</Option>
                      <Option value="sick">Sick</Option>
                      <Option value="personal">Personal</Option>
                      <Option value="maternity">Maternity</Option>
                      <Option value="sabbatical">Sabbatical</Option>
                  </Select>
              </Form.Item>
              <Form.Item label="Duration">
                  <Input value={`${duration} days`} disabled className="bg-gray-50 text-gray-600 font-medium" />
              </Form.Item>
              <Form.Item name="startDate" label="Start Date" rules={[{ required: true }]}>
                   <DatePicker className="w-full" format="YYYY-MM-DD" />
              </Form.Item>
              <Form.Item name="endDate" label="End Date" rules={[{ required: true }]}>
                   <DatePicker className="w-full" format="YYYY-MM-DD" />
              </Form.Item>
          </div>

          <Form.Item name="reason" label="Reason for Leave" rules={[{ required: true, message: 'Please provide a reason' }]}>
              <TextArea rows={4} placeholder="Providing a detailed reason increases approval chances..." />
          </Form.Item>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
             <Button onClick={onCancel}>Cancel</Button>
             <Button type="primary" htmlType="submit">Submit Request</Button>
          </div>
      </Form>
    </Modal>
  )
}
