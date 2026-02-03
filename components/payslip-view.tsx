"use client"

import { useState, useEffect } from "react"
import { Spin, message, Button } from "antd"
import { PrinterOutlined, DownloadOutlined } from "@ant-design/icons"
import Image from "next/image"

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

export function PayslipView({ payrollId }: PayslipViewProps) {
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

  const handleDownload = async () => {
    try {
      message.loading({ content: "Generating PDF...", key: "pdf-download" })
      
      const response = await fetch(`/api/payroll/payslips/${payrollId}/download`)
      
      if (!response.ok) {
        throw new Error("Failed to download PDF")
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      
      // Extract filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get("Content-Disposition")
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/)
      const filename = filenameMatch ? filenameMatch[1] : `Payslip_${payslip?.payrollMonth}_${payslip?.payrollYear}.pdf`
      
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      message.success({ content: "PDF downloaded successfully!", key: "pdf-download" })
    } catch (error) {
      console.error("Error downloading PDF:", error)
      message.error({ content: "Failed to download PDF", key: "pdf-download" })
    }
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
            <div className="w-16 h-16 flex items-center justify-center">
              <Image
                src="/mv_logo.png"
                alt="MV Clouds Logo"
                width={70}
                height={60}
                className="object-contain"
              />
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
                  <span className="text-gray-900">: {payslip.employeeId}</span>
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

