"use client"

import { useState, useEffect } from "react"
import { Modal, Form, Input, Select, DatePicker, message, Button, Tooltip } from "antd"
import dayjs from "dayjs"
import { toast } from "sonner"
import type { LeaveRequest } from "@/types"
import type { Dayjs } from "dayjs"

interface LeaveRequestFormProps {
  onSubmit: (data: Partial<LeaveRequest>) => void
  onCancel: () => void
  employeeId?: string
  employeeName?: string
}

interface Holiday {
  id: string
  name: string
  date: string
  day: string
  year: string
}

const { Option } = Select
const { TextArea } = Input

const controlSize = "large" as const

const sessionOptions = [
  { value: "Session-1", label: "Session-1 (1st Half)" },
  { value: "Session-2", label: "Session-2 (2nd Half)" },
]

export function LeaveRequestForm({ onSubmit, onCancel, employeeId, employeeName }: LeaveRequestFormProps) {
  const [form] = Form.useForm()
  const [duration, setDuration] = useState(0)
  const [leaveCategory, setLeaveCategory] = useState<string>("")
  const [selectedLeaveType, setSelectedLeaveType] = useState<string>("")
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [holidayMap, setHolidayMap] = useState<Map<string, string>>(new Map())

  const calculateDuration = (start?: Dayjs, end?: Dayjs, startSession?: string, endSession?: string) => {
    if (!start || !end) {
      return 0
    }

    if (end.isBefore(start, "day")) {
      return 0
    }

    const sameDay = start.isSame(end, "day")

    if (sameDay) {
      if (startSession === "Session-2" && endSession === "Session-1") {
        return 0
      }

      if (startSession === endSession && (startSession === "Session-1" || startSession === "Session-2")) {
        return 0.5
      }

      if (startSession === "Session-1" && endSession === "Session-2") {
        return 1
      }

      return 1
    }

    let days = end.diff(start, "day") + 1

    if (startSession === "Session-2") {
      days -= 0.5
    }

    if (endSession === "Session-1") {
      days -= 0.5
    }

    return days > 0 ? days : 0
  }

  // Fetch holidays on component mount
  useEffect(() => {
    const fetchHolidays = async () => {
      try {
        const response = await fetch('/api/holidays')
        if (response.ok) {
          const data = await response.json()
          setHolidays(data.holidays || [])

          // Create a map for quick lookup: date -> holiday name
          const map = new Map<string, string>()
          data.holidays?.forEach((holiday: Holiday) => {
            map.set(holiday.date, holiday.name)
          })
          setHolidayMap(map)
        }
      } catch (error) {
        console.error('Error fetching holidays:', error)
      }
    }

    fetchHolidays()
  }, [])

  // Recalculate duration when dates change
  const onValuesChange = (changedValues: any, allValues: any) => {
    if (Object.prototype.hasOwnProperty.call(changedValues, 'leaveCategory')) {
      setLeaveCategory(changedValues.leaveCategory)
      setSelectedLeaveType("")
      setDuration(0)
      // Reset fields when category changes
      form.setFieldsValue({
        leaveType: undefined,
        sessionStart: undefined,
        sessionEnd: undefined,
        reason: undefined,
      })
    }

    if (Object.prototype.hasOwnProperty.call(changedValues, 'leaveType')) {
      setSelectedLeaveType(changedValues.leaveType || "")
    }

    // Always recalculate duration when dates or sessions change
    const start = allValues.startDate
    const end = allValues.endDate
    const sessionStart = allValues.sessionStart
    const sessionEnd = allValues.sessionEnd

    if (start && end) {
      setDuration(calculateDuration(start, end, sessionStart, sessionEnd))
    }
  }

  // Custom date cell render to highlight holidays
  const dateFullCellRender = (current: Dayjs) => {
    const dateStr = current.format('YYYY-MM-DD')
    const holidayName = holidayMap.get(dateStr)

    if (holidayName) {
      return (
        <Tooltip title={holidayName} placement="top">
          <div className="ant-picker-cell-inner" style={{
            background: '#fee2e2',
            color: '#dc2626',
            fontWeight: 'bold',
            borderRadius: '4px'
          }}>
            {current.date()}
          </div>
        </Tooltip>
      )
    }

    return (
      <div className="ant-picker-cell-inner">
        {current.date()}
      </div>
    )
  }

  // Disable dates function for loss-of-pay category
  const shouldRestrictToBackdateWindow = () => {
    const leaveType = selectedLeaveType || form.getFieldValue('leaveType')
    const isSickLeave = leaveType === 'Sick Leave'
    const isEmergencyLeave = leaveType === 'Emergency Leave'
    const isEarnedLeave = leaveType === 'Earned Leave' || leaveCategory === 'extra-day-pay'

    return isSickLeave || isEmergencyLeave || isEarnedLeave
  }

  const isOutsideAllowedBackdateWindow = (current: Dayjs) => {
    const today = dayjs().startOf('day')
    const date = current.startOf('day')

    if (date.isAfter(today, 'day')) {
      return true
    }

    const currentMonthStart = today.startOf('month')
    const previousMonthStart = today.subtract(1, 'month').startOf('month')
    const previousMonthEnd = today.subtract(1, 'month').endOf('month')
    const canApplyPreviousMonth = today.date() <= 7

    const isInCurrentMonthPastOrToday = !date.isBefore(currentMonthStart, 'day')
    const isInPreviousMonth = canApplyPreviousMonth
      && !date.isBefore(previousMonthStart, 'day')
      && !date.isAfter(previousMonthEnd, 'day')

    return !(isInCurrentMonthPastOrToday || isInPreviousMonth)
  }

  const disabledDate = (current: Dayjs) => {
    if (!current || leaveCategory !== 'loss-of-pay') {
      return false
    }

    if (shouldRestrictToBackdateWindow()) {
      return isOutsideAllowedBackdateWindow(current)
    }

    // Check if it's a weekend (Saturday or Sunday)
    const isWeekend = current.day() === 0 || current.day() === 6

    // Check if it's a holiday
    const dateStr = current.format('YYYY-MM-DD')
    const isHoliday = holidayMap.has(dateStr)

    // Disable if it's a weekend or holiday for loss-of-pay
    return isWeekend || isHoliday
  }

  const disabledDateForExtraDayPay = (current: Dayjs) => {
    if (!current || leaveCategory !== 'extra-day-pay') {
      return false
    }

    return isOutsideAllowedBackdateWindow(current)
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

    if (!values.reason.trim()) {
      toast.error("Please provide a reason for leave")
      return
    }

    if (!values.startDate || !values.endDate) {
      toast.error("Please select start and end dates")
      return
    }

    if (!values.sessionStart || !values.sessionEnd) {
      toast.error("Please select both start and end sessions")
      return
    }

    if (values.startDate.isSame(values.endDate, 'day') && values.sessionStart === 'Session-2' && values.sessionEnd === 'Session-1') {
      toast.error("For the same day, the start session must be before the end session")
      return
    }

    const startDate = values.startDate
    const endDate = values.endDate
    const leaveType = values.leaveType
    const sessionStart = values.sessionStart
    const sessionEnd = values.sessionEnd
    const today = dayjs()
    const computedDuration = calculateDuration(startDate, endDate, sessionStart, sessionEnd)
    let totalDeduction = computedDuration
    let penaltyDays = 0

    // Check if it's a planned leave and calculate penalties day by day
    if (leaveType === 'Planned Leave' && startDate && endDate) {

      let daysWithPenalty = 0

      // Helper to check if a day is a weekend
      const isWeekend = (date: dayjs.Dayjs) => {
        const day = date.day()
        return day === 0 || day === 6 // Sunday or Saturday
      }

      // Helper to check if a day is a holiday
      const isHoliday = (date: dayjs.Dayjs) => {
        const dateStr = date.format('YYYY-MM-DD')
        return holidayMap.has(dateStr)
      }

      // Helper to check if a day is a non-working day
      const isNonWorkingDay = (date: dayjs.Dayjs) => {
        return isWeekend(date) || isHoliday(date)
      }

      // Count working days between two dates
      const countWorkingDaysBetween = (fromDate: dayjs.Dayjs, toDate: dayjs.Dayjs) => {
        let workingDaysCount = 0
        let checkDate = fromDate.clone()

        while (checkDate.isBefore(toDate)) {
          if (!isNonWorkingDay(checkDate)) {
            workingDaysCount++
          }
          checkDate = checkDate.add(1, 'day')
        }

        return workingDaysCount
      }

      // Calculate penalty ONLY for WORKING days in leave range
      let currentDate = startDate.clone()
      while (currentDate.isBefore(endDate) || currentDate.isSame(endDate, 'day')) {
        // Only check penalty for working days
        if (!isNonWorkingDay(currentDate)) {
          // Count only working days between today and this leave day
          const workingDaysInAdvance = countWorkingDaysBetween(today, currentDate)

          if (workingDaysInAdvance < 5) {
            penaltyDays += 2 // Add 2 penalty days for this working day
            daysWithPenalty++
          }
        }

        currentDate = currentDate.add(1, 'day')
      }

      if (penaltyDays > 0) {
        totalDeduction = computedDuration + penaltyDays
      }
    }

    console.log("Submitting leave request:", { ...values, duration: computedDuration, totalDeduction, penaltyDays })

    onSubmit({
      ...values,
      startDate: values.startDate ? values.startDate.format("YYYY-MM-DD") : undefined,
      endDate: values.endDate ? values.endDate.format("YYYY-MM-DD") : undefined,
      duration: computedDuration,
      totalDeduction,
      status: "pending",
      session: undefined,
      sessionStart: values.sessionStart,
      sessionEnd: values.sessionEnd,
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
          leaveType: undefined,
          sessionStart: undefined,
          sessionEnd: undefined,
          startDate: undefined,
          endDate: undefined
        }}
        className="mt-4"
      >

        {/* {employeeName && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg text-blue-900 border border-blue-100">
               <span className="font-semibold">Requesting for:</span> {employeeName}
            </div>
          )} */}

        {/* Leave Category Selection */}
        <Form.Item name="leaveCategory" label="Leave Category" rules={[{ required: true }]}>
          <Select size={controlSize} placeholder="Select leave category">
            <Option value="" disabled>Select leave category</Option>
            <Option value="loss-of-pay">Loss of Pay</Option>
            <Option value="extra-day-pay">Extra Day Pay</Option>
          </Select>
        </Form.Item>

        {/* Conditional Fields based on Leave Category */}
        {leaveCategory === "loss-of-pay" && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-3 gap-y-0">
              <Form.Item name="leaveType" label="Leave Type" rules={[{ required: true }]} className="mb-0"> 
                <Select size={controlSize} placeholder="Select leave type">
                  <Option value="" disabled>Select leave type</Option>
                  <Option value="Planned Leave">Planned Leave</Option>
                  <Option value="Sick Leave">Sick Leave</Option>
                  <Option value="Emergency Leave">Emergency Leave</Option>
                </Select>
              </Form.Item>

              <Form.Item label="Duration" className="md:col-span-2 mb-0">
                <Input value={`${duration} days`} disabled className="w-full bg-gray-50 text-gray-600 font-medium" />
              </Form.Item>

              <Form.Item name="startDate" label="Start Date" rules={[{ required: true }]} className="mb-0"> 
                <DatePicker size={controlSize} className="w-full" placeholder="DD-MM-YYYY" format="DD-MM-YYYY" dateRender={dateFullCellRender} disabledDate={disabledDate} />
              </Form.Item>

              <Form.Item name="sessionStart" label="Start Session" rules={[{ required: true }]} className="mb-0"> 
                <Select size={controlSize} placeholder="Select start session">
                  <Option value="" disabled>Please select session</Option>
                  {sessionOptions.map((option) => (
                    <Option key={option.value} value={option.value}>{option.label}</Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item name="endDate" label="End Date" rules={[{ required: true }]} className="mb-0"> 
                <DatePicker size={controlSize} className="w-full" placeholder="DD-MM-YYYY" format="DD-MM-YYYY" dateRender={dateFullCellRender} disabledDate={disabledDate} />
              </Form.Item>

              <Form.Item name="sessionEnd" label="End Session" rules={[{ required: true }]} className="mb-0"> 
                <Select size={controlSize} placeholder="Select end session">
                  <Option value="" disabled>Please select session</Option>
                  {sessionOptions.map((option) => (
                    <Option key={option.value} value={option.value}>{option.label}</Option>
                  ))}
                </Select>
              </Form.Item>
            </div>

            <Form.Item
              name="reason"
              label="Leave Reason"
              rules={[
                { required: true, message: 'Please provide reason for leave' },
                {
                  validator: (_, value) => {
                    if (!value) return Promise.resolve()
                    const trimmedValue = value.trim()
                    if (trimmedValue.length === 0) {
                      return Promise.reject('Reason cannot be only spaces')
                    }
                    if (trimmedValue.length < 10) {
                      return Promise.reject('Reason must be at least 10 characters')
                    }
                    return Promise.resolve()
                  }
                }
              ]}
            >
              <TextArea rows={3} placeholder="Explain the reason for your leave (minimum 10 characters)..." />
            </Form.Item>
          </>
        )}

        {leaveCategory === "extra-day-pay" && (
          <>
            <Form.Item label="Duration" className="md:col-span-2 mb-0">
              <Input value={`${duration} days`} disabled className="w-full bg-gray-50 text-gray-600 font-medium" />
            </Form.Item>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-3 gap-y-0">
              <Form.Item name="startDate" label="Start Date" rules={[{ required: true }]} className="mb-0"> 
                <DatePicker size={controlSize} className="w-full" placeholder="DD-MM-YYYY" format="DD-MM-YYYY" dateRender={dateFullCellRender} disabledDate={disabledDateForExtraDayPay} />
              </Form.Item>

              <Form.Item name="endDate" label="End Date" rules={[{ required: true }]} className="mb-0"> 
                <DatePicker size={controlSize} className="w-full" placeholder="DD-MM-YYYY" format="DD-MM-YYYY" dateRender={dateFullCellRender} disabledDate={disabledDateForExtraDayPay} />
              </Form.Item>

              <Form.Item name="sessionStart" label="Start Session" rules={[{ required: true }]} className="mb-0"> 
                <Select size={controlSize} placeholder="Select start session">
                  <Option value="" disabled>Please select session</Option>
                  {sessionOptions.map((option) => (
                    <Option key={option.value} value={option.value}>{option.label}</Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item name="sessionEnd" label="End Session" rules={[{ required: true }]} className="mb-0"> 
                <Select size={controlSize} placeholder="Select end session">
                  <Option value="" disabled>Please select session</Option>
                  {sessionOptions.map((option) => (
                    <Option key={option.value} value={option.value}>{option.label}</Option>
                  ))}
                </Select>
              </Form.Item>
            </div>

            <Form.Item
              name="reason"
              label="Reason"
              rules={[
                { required: true, message: 'Please provide reason for extra day pay' },
                {
                  validator: (_, value) => {
                    if (!value) return Promise.resolve()
                    const trimmedValue = value.trim()
                    if (trimmedValue.length === 0) {
                      return Promise.reject('Reason cannot be only spaces')
                    }
                    if (trimmedValue.length < 10) {
                      return Promise.reject('Reason must be at least 10 characters')
                    }
                    return Promise.resolve()
                  }
                }
              ]}
            >
              <TextArea rows={3} placeholder="Explain why you need extra day pay (minimum 10 characters)..." />
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