"use client"

import { useState, useEffect } from "react"
import { Card, Descriptions, Table, Divider, Spin, message, Button } from "antd"
import { PrinterOutlined, DownloadOutlined } from "@ant-design/icons"
import type { ColumnsType } from "antd/es/table"

interface Leave {
  id: string
  leaveType: string
  leaveCategory: string
  startDate: string
  endDate: string
  totalDays: number
  totalDaysAfterRule: number
  daysInSelectedMonth: number
  daysAfterRuleInMonth: number
  actualDeduction: number
  afterRuleDeduction: number
  status: string
  onePlusTwoRuleApplied?: boolean
  sandwichRuleApplied?: boolean
}

interface Adjustment {
  id: string
  adjustmentType: "Addition" | "Deduction"
  adjustmentAmount: number
  adjustmentDescription: string
}

interface PayslipData {
  id: string
  employeeId: string
  employeeName: string
  email: string
  department: string
  role: string
  payrollMonth: string
  payrollYear: number
  basicSalary: number
  bonus: number
  totalAdditions: number
  totalDeductions: number
  netSalary: number
  totalLeaveDays: number
  totalLeaveDaysAfterRule: number
  totalLeaveDeductions: number
  leaves: Leave[]
  adjustments: Adjustment[]
  daysInMonth: number
  dailySalary: number
}

interface PayslipViewProps {
  payrollId: string
  onClose?: () => void
}

export function PayslipView({ payrollId, onClose }: PayslipViewProps) {
  const [payslip, setPayslip] = useState<PayslipData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPayslip()
  }, [payrollId])

  const fetchPayslip = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/payroll/payslips/${payrollId}`)
      if (!res.ok) throw new Error("Failed to fetch payslip")
      
      const data = await res.json()
      setPayslip(data.payslip)
    } catch (error) {
      console.error("Error fetching payslip:", error)
      message.error("Failed to load payslip")
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleDownload = () => {
    message.info("PDF download functionality coming soon")
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Spin size="large" tip="Loading payslip..." />
      </div>
    )
  }

  if (!payslip) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Payslip not found</p>
      </div>
    )
  }

  // Leave columns
  const leaveColumns: ColumnsType<Leave> = [
    {
      title: "Leave Type",
      dataIndex: "leaveType",
      key: "leaveType",
    },
    {
      title: "Category",
      dataIndex: "leaveCategory",
      key: "leaveCategory",
    },
    {
      title: "Start Date",
      dataIndex: "startDate",
      key: "startDate",
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: "End Date",
      dataIndex: "endDate",
      key: "endDate",
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: "Days in Month",
      dataIndex: "daysInSelectedMonth",
      key: "daysInSelectedMonth",
      align: "center",
    },
    {
      title: "Days After Rules",
      dataIndex: "daysAfterRuleInMonth",
      key: "daysAfterRuleInMonth",
      align: "center",
      render: (days: number, record: Leave) => (
        <span>
          {days.toFixed(1)}
          {(record.onePlusTwoRuleApplied || record.sandwichRuleApplied) && (
            <span className="text-xs text-orange-600 ml-1">
              ({record.sandwichRuleApplied && '🥪'}
              {record.onePlusTwoRuleApplied && '1+2'})
            </span>
          )}
        </span>
      ),
    },
    {
      title: "Deduction",
      dataIndex: "afterRuleDeduction",
      key: "afterRuleDeduction",
      align: "right",
      render: (amount: number) => `₹${amount.toLocaleString()}`,
    },
  ]

  // Adjustment columns
  const adjustmentColumns: ColumnsType<Adjustment> = [
    {
      title: "Type",
      dataIndex: "adjustmentType",
      key: "adjustmentType",
      render: (type: string) => (
        <span className={type === "Addition" ? "text-green-600" : "text-red-600"}>
          {type}
        </span>
      ),
    },
    {
      title: "Description",
      dataIndex: "adjustmentDescription",
      key: "adjustmentDescription",
    },
    {
      title: "Amount",
      dataIndex: "adjustmentAmount",
      key: "adjustmentAmount",
      align: "right",
      render: (amount: number, record: Adjustment) => (
        <span className={record.adjustmentType === "Addition" ? "text-green-600" : "text-red-600"}>
          {record.adjustmentType === "Addition" ? "+" : "-"}₹{Math.abs(amount).toLocaleString()}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex justify-between items-center print:hidden">
        <h2 className="text-2xl font-bold text-gray-900">Payslip</h2>
        <div className="flex gap-2">
          <Button icon={<PrinterOutlined />} onClick={handlePrint}>
            Print
          </Button>
          <Button icon={<DownloadOutlined />} onClick={handleDownload}>
            Download PDF
          </Button>
        </div>
      </div>

      {/* Payslip Container */}
      <div className="bg-white shadow-lg rounded-lg print:shadow-none" style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Company Header */}
        <div className="flex justify-between items-start p-8 pb-6 border-b">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-2xl">
              MV
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">MV Clouds</h1>
              <p className="text-sm text-gray-600">D-404 Systhesis the first Ahmedabad India</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Payslip For the Month</p>
            <p className="text-2xl font-bold text-gray-900">{payslip.payrollMonth} {payslip.payrollYear}</p>
          </div>
        </div>

        <div className="p-8">
          {/* Employee Summary and Net Pay */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Employee Summary */}
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-4">EMPLOYEE SUMMARY</h2>
              <div className="space-y-3">
                <div className="flex">
                  <span className="text-gray-600 w-40">Employee Name</span>
                  <span className="text-gray-900">: {payslip.employeeName}</span>
                </div>
                <div className="flex">
                  <span className="text-gray-600 w-40">Employee ID</span>
                  <span className="text-gray-900">: {payslip.employeeId.slice(0, 15)}</span>
                </div>
                <div className="flex">
                  <span className="text-gray-600 w-40">Department</span>
                  <span className="text-gray-900">: {payslip.department || 'N/A'}</span>
                </div>
                <div className="flex">
                  <span className="text-gray-600 w-40">Pay Period</span>
                  <span className="text-gray-900">: {payslip.payrollMonth} {payslip.payrollYear}</span>
                </div>
              </div>
            </div>

            {/* Net Pay Card */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="text-4xl font-bold text-gray-900 mb-2">₹{payslip.netSalary.toLocaleString()}</div>
              <div className="text-sm text-gray-600 mb-4">Total Net Pay</div>
              <div className="border-t border-blue-200 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Paid Days</span>
                  <span className="text-gray-900">: {payslip.daysInMonth}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">LOP Days</span>
                  <span className="text-gray-900">: {payslip.totalLeaveDaysAfterRule?.toFixed(1) || payslip.totalLeaveDays || 0}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Earnings and Deductions Table */}
          <div className="border rounded-lg overflow-hidden mb-8">
            <div className="grid grid-cols-2 bg-gray-100 border-b">
              <div className="p-4 border-r">
                <h3 className="font-bold text-gray-900 text-center">EARNINGS</h3>
              </div>
              <div className="p-4">
                <h3 className="font-bold text-gray-900 text-center">DEDUCTIONS</h3>
              </div>
            </div>

            <div className="grid grid-cols-2">
              {/* Earnings Column */}
              <div className="border-r">
                <div className="flex justify-between p-4 border-b">
                  <div className="text-gray-900">Basic</div>
                  <div className="text-gray-900">₹{payslip.basicSalary.toLocaleString()}</div>
                </div>
                {payslip.bonus > 0 && (
                  <div className="flex justify-between p-4 border-b">
                    <div className="text-gray-900">Bonus</div>
                    <div className="text-gray-900">₹{payslip.bonus.toLocaleString()}</div>
                  </div>
                )}
                {/* Show Extra Day Pay separately */}
                {(() => {
                  const adjustmentAdditions = payslip.adjustments?.filter(a => a.adjustmentType === 'Addition').reduce((sum, a) => sum + a.adjustmentAmount, 0) || 0
                  const extraDayPay = payslip.totalAdditions - payslip.bonus - adjustmentAdditions
                  return extraDayPay > 0 && (
                    <div className="flex justify-between p-4 border-b">
                      <div className="text-gray-900">Extra Day Pay</div>
                      <div className="text-gray-900">₹{extraDayPay.toLocaleString()}</div>
                    </div>
                  )
                })()}
                {payslip.adjustments?.filter(a => a.adjustmentType === 'Addition').map((adj, idx) => (
                  <div key={idx} className="flex justify-between p-4 border-b">
                    <div className="text-gray-900">{adj.adjustmentDescription || 'Allowance'}</div>
                    <div className="text-gray-900">₹{adj.adjustmentAmount.toLocaleString()}</div>
                  </div>
                ))}
                <div className="flex justify-between p-4 bg-gray-100 font-bold">
                  <div className="text-gray-900">Gross Earnings</div>
                  <div className="text-gray-900">₹{(payslip.basicSalary + (payslip.totalAdditions || 0)).toLocaleString()}</div>
                </div>
              </div>

              {/* Deductions Column */}
              <div>
                {payslip.totalLeaveDeductions > 0 && (
                  <div className="flex justify-between p-4 border-b">
                    <div className="text-gray-900">Leave Deduction</div>
                    <div className="text-gray-900">₹{payslip.totalLeaveDeductions.toLocaleString()}</div>
                  </div>
                )}
                {payslip.adjustments?.filter(a => a.adjustmentType === 'Deduction').map((adj, idx) => (
                  <div key={idx} className="flex justify-between p-4 border-b">
                    <div className="text-gray-900">{adj.adjustmentDescription || 'Deduction'}</div>
                    <div className="text-gray-900">₹{adj.adjustmentAmount.toLocaleString()}</div>
                  </div>
                ))}
                <div className="flex justify-between p-4 bg-gray-100 font-bold">
                  <div className="text-gray-900">Total Deductions</div>
                  <div className="text-gray-900">₹{payslip.totalDeductions.toLocaleString()}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Total Net Payable */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-gray-900">TOTAL NET PAYABLE</h3>
                <p className="text-sm text-gray-600">Gross Earnings - Total Deductions</p>
              </div>
              <div className="text-3xl font-bold text-gray-900">₹{payslip.netSalary.toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t text-center text-sm text-gray-600">
          <p>This is a computer-generated payslip and does not require a signature.</p>
          <p className="mt-2">For queries, please contact HR department.</p>
        </div>
      </div>
    </div>
  )
}

