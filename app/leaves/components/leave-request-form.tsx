"use client"

import { useState } from "react"
import { Modal, Form, Input, Select, DatePicker, message , Button} from "antd"
import dayjs from "dayjs"
import { toast } from "sonner"
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
  const [leaveCategory, setLeaveCategory] = useState<string>("")

  // Recalculate duration when dates change
  const onValuesChange = (changedValues: any, allValues: any) => {
      if (changedValues.leaveCategory) {
          setLeaveCategory(changedValues.leaveCategory)
          // Reset fields when category changes
          form.setFieldsValue({
            leaveType: undefined,
            extraDayReason: undefined,
          })
      }
      
      // Always recalculate duration when dates change or session changes
      const start = allValues.startDate
      const end = allValues.endDate
      const session = allValues.session
      
      if (start && end) {
           let diff = end.diff(start, 'day') + 1
           diff = diff > 0 ? diff : 0
           
           // If session is Session-1 or Session-2, count as half day
           if ((session === 'Session-1' || session === 'Session-2') && diff === 1) {
               setDuration(0.5)
           } else {
               setDuration(diff)
           }
      }
  }

  const handleFinish = (values: any) => {
    // Validation: Check required fields
    if (!values.leaveCategory) {
      toast.error("Please select a leave category")
      return
    }

    if (values.leaveCategory === 'loss-of-pay' && !values.leaveType) {
      toast.error("Please select a leave type")
      return
    }

    if (values.leaveCategory === 'extra-day-pay' && !values.extraDayReason) {
      toast.error("Please provide a reason for extra day pay")
      return
    }

    if (!values.startDate || !values.endDate) {
      toast.error("Please select start and end dates")
      return
    }

    const startDate = values.startDate
    const endDate = values.endDate
    const leaveType = values.leaveType
    const today = dayjs()
    let totalDeduction = duration
    let penaltyDays = 0
    
    // Check if it's a planned leave and calculate penalties day by day
    if (leaveType === 'Planned Leave' && startDate && endDate) {
      
      let daysWithPenalty = 0
      
      // Helper to check if a day is a weekend
      const isWeekend = (date: dayjs.Dayjs) => {
        const day = date.day()
        return day === 0 || day === 6 // Sunday or Saturday
      }
      
      // Count working days backward from leave start date
      const countWorkingDaysBackward = (fromDate: dayjs.Dayjs, targetWorkingDays: number) => {
        let workingDaysCount = 0
        let checkDate = today.clone()
        
        while (checkDate.isBefore(fromDate) && workingDaysCount < targetWorkingDays) {
          if (!isWeekend(checkDate)) {
            workingDaysCount++
          }
          checkDate = checkDate.add(1, 'day')
        }
        
        return workingDaysCount
      }
      
      // Calculate penalty for each day of leave
      let currentDate = startDate.clone()
      while (currentDate.isBefore(endDate) || currentDate.isSame(endDate, 'day')) {
        // Count only working days between today and this leave day
        const workingDaysInAdvance = countWorkingDaysBackward(currentDate, 5)
        
        if (workingDaysInAdvance < 5) {
          penaltyDays += 2 // Add 2 penalty days for this leave day
          daysWithPenalty++
        }
        
        currentDate = currentDate.add(1, 'day')
      }
      
      if (penaltyDays > 0) {
        totalDeduction = duration + penaltyDays
      }
    }

    console.log("Submitting leave request:", { ...values, duration, totalDeduction, penaltyDays })
    
    onSubmit({
      ...values,
      startDate: values.startDate ? values.startDate.format("YYYY-MM-DD") : undefined,
      endDate: values.endDate ? values.endDate.format("YYYY-MM-DD") : undefined,
      duration,
      totalDeduction,
      status: "pending",
      onePlusTwoApplied: penaltyDays > 0 ? true : false,
    })
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
            leaveCategory: '',
            leaveType: 'Planned Leave',
            session: 'Full Day',
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

          {/* Leave Category Selection */}
          <Form.Item name="leaveCategory" label="Leave Category" rules={[{ required: true }]}>
              <Select placeholder="Select leave category">
                  <Option value="loss-of-pay">Loss of Pay</Option>
                  <Option value="extra-day-pay">Extra Day Pay</Option>
              </Select>
          </Form.Item>

          {/* Conditional Fields based on Leave Category */}
          {leaveCategory === "loss-of-pay" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Form.Item name="leaveType" label="Leave Type" rules={[{ required: true }]}>
                  <Select>
                      <Option value="Planned Leave">Planned Leave</Option>
                      <Option value="Sick Leave">Sick Leave</Option>
                      <Option value="Emergency Leave">Emergency Leave</Option>
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
              
              <Form.Item name="session" label="Session" rules={[{ required: true }]}>
                  <Select>
                      <Option value="Session-1">Session-1</Option>
                      <Option value="Session-2">Session-2</Option>
                      <Option value="Full Day">Full Day</Option>
                  </Select>
              </Form.Item>
            </div>
          )}

          {leaveCategory === "extra-day-pay" && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Form.Item name="startDate" label="Start Date" rules={[{ required: true }]}>
                     <DatePicker className="w-full" format="YYYY-MM-DD" />
                </Form.Item>
                
                <Form.Item name="endDate" label="End Date" rules={[{ required: true }]}>
                     <DatePicker className="w-full" format="YYYY-MM-DD" />
                </Form.Item>
                
                <Form.Item label="Duration">
                    <Input value={`${duration} days`} disabled className="bg-gray-50 text-gray-600 font-medium" />
                </Form.Item>
                
                <Form.Item name="session" label="Session" rules={[{ required: true }]}>
                    <Select>
                        <Option value="Session-1">Session-1</Option>
                        <Option value="Session-2">Session-2</Option>
                        <Option value="Full Day">Full Day</Option>
                    </Select>
                </Form.Item>
              </div>
              
              <Form.Item 
                name="extraDayReason" 
                label="Extra Day Reason" 
                rules={[{ required: true, message: 'Please provide reason for extra day' }]}
              >
                  <TextArea rows={3} placeholder="Explain why you need extra day pay..." />
              </Form.Item>
            </>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
             <Button onClick={onCancel}>Cancel</Button>
             <Button type="primary" htmlType="submit">Submit Request</Button>
          </div>
      </Form>
    </Modal>
  )
}