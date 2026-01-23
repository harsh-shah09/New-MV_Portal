"use client"

import { useState } from "react"
import { Button, message } from "antd"
import { PlusOutlined, ArrowLeftOutlined } from "@ant-design/icons"
import { useQuery } from "@tanstack/react-query"

import { PayrollSummaryList } from "./components/payroll-summary-list"
import { PayrollEmployeeList } from "./components/payroll-employee-list"
import { PayrollEmployeeDetailView } from "./components/payroll-employee-detail"
import { GeneratePayrollModal } from "./components/generate-payroll-modal"
import type { PayrollSummary, PayrollEmployeeDetail } from "@/types"

// Mock data for payroll summaries
const mockPayrollSummaries: PayrollSummary[] = [
  {
    id: "sum-1",
    month: "January",
    year: 2026,
    totalEmployees: 45,
    netTotalSalary: 425000,
    status: "paid",
    createdAt: "2026-01-31",
  },
  {
    id: "sum-2",
    month: "December",
    year: 2025,
    totalEmployees: 43,
    netTotalSalary: 398500,
    status: "paid",
    createdAt: "2025-12-31",
  },
  {
    id: "sum-3",
    month: "November",
    year: 2025,
    totalEmployees: 42,
    netTotalSalary: 389000,
    status: "paid",
    createdAt: "2025-11-30",
  },
]

// Mock data for employee payroll details
const mockEmployeePayrolls: PayrollEmployeeDetail[] = [
  {
    id: "emp-pay-1",
    employeeId: "1",
    employeeName: "John Doe",
    payrollMonth: "January",
    year: 2026,
    basicSalary: 120000,
    totalAdditions: 15000,
    totalDeductions: 5000,
    bonus: 10000,
    netSalary: 140000,
  },
  {
    id: "emp-pay-2",
    employeeId: "2",
    employeeName: "Jane Smith",
    payrollMonth: "January",
    year: 2026,
    basicSalary: 95000,
    totalAdditions: 12000,
    totalDeductions: 4000,
    bonus: 5000,
    netSalary: 108000,
  },
  {
    id: "emp-pay-3",
    employeeId: "3",
    employeeName: "Mike Johnson",
    payrollMonth: "January",
    year: 2026,
    basicSalary: 75000,
    totalAdditions: 8000,
    totalDeductions: 3000,
    bonus: 3000,
    netSalary: 83000,
  },
]

export default function PayrollPage() {
  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await fetch("/api/me")
      if (!res.ok) return null
      return res.json()
    },
  })

  console.log("Current User 1234:", user)
  console.log("User Role:", user?.role)
  console.log("Role type:", typeof user?.role)

  // State for HR/Admin view
  const [view, setView] = useState<"summary" | "employees" | "detail">("summary")
  const [payrollSummaries, setPayrollSummaries] = useState<PayrollSummary[]>(mockPayrollSummaries)
  const [selectedSummary, setSelectedSummary] = useState<PayrollSummary | null>(null)
  const [employeePayrolls, setEmployeePayrolls] = useState<PayrollEmployeeDetail[]>([])
  const [selectedEmployee, setSelectedEmployee] = useState<PayrollEmployeeDetail | null>(null)
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false)

  const isHROrAdmin = user?.role === "admin" || user?.role === "HR"
  console.log("isHROrAdmin:", isHROrAdmin)

  const handleSelectSummary = (summary: PayrollSummary) => {
    setSelectedSummary(summary)
    // Filter employee payrolls for this summary
    const filteredPayrolls = mockEmployeePayrolls.filter(
      (emp) => emp.payrollMonth === summary.month && emp.year === summary.year,
    )
    setEmployeePayrolls(filteredPayrolls)
    setView("employees")
  }

  const handleSelectEmployee = (employee: PayrollEmployeeDetail) => {
    setSelectedEmployee(employee)
    setView("detail")
  }

  const handleBackToEmployees = () => {
    setSelectedEmployee(null)
    setView("employees")
  }

  const handleBackToSummary = () => {
    setSelectedSummary(null)
    setEmployeePayrolls([])
    setView("summary")
  }

  const handleGeneratePayroll = (month: string, year: number) => {
    // TODO: Implement actual payroll generation logic
    message.success(`Generating payroll for ${month} ${year}...`)
    console.log("Generate payroll for:", month, year)

    // Mock: Add a new summary
    const newSummary: PayrollSummary = {
      id: `sum-${Date.now()}`,
      month,
      year,
      totalEmployees: 0,
      netTotalSalary: 0,
      status: "draft",
      createdAt: new Date().toISOString(),
    }
    setPayrollSummaries([newSummary, ...payrollSummaries])
  }

  // Show appropriate message if not HR/Admin
  if (!isHROrAdmin) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Payroll Management</h1>
          <p className="text-gray-600">Access restricted to HR and Admin users only.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Payroll Management</h1>
            <p className="text-gray-600 mt-1">Manage employee payrolls and generate monthly summaries</p>
          </div>
          {view === "summary" && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsGenerateModalOpen(true)} size="large">
              Generate Payroll
            </Button>
          )}
        </div>
      </div>

      {view === "summary" && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Payroll Summaries</h2>
          <PayrollSummaryList summaries={payrollSummaries} onSelectSummary={handleSelectSummary} />
        </div>
      )}

      {view === "employees" && selectedSummary && (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button icon={<ArrowLeftOutlined />} onClick={handleBackToSummary}>
              Back to Summaries
            </Button>
            <h2 className="text-2xl font-bold text-gray-900">
              {selectedSummary.month} {selectedSummary.year} - Employee Payrolls
            </h2>
          </div>
          <PayrollEmployeeList
            employees={employeePayrolls}
            month={selectedSummary.month}
            year={selectedSummary.year}
            onSelectEmployee={handleSelectEmployee}
          />
        </div>
      )}

      {view === "detail" && selectedEmployee && (
        <PayrollEmployeeDetailView employee={selectedEmployee} onBack={handleBackToEmployees} />
      )}

      <GeneratePayrollModal
        open={isGenerateModalOpen}
        onClose={() => setIsGenerateModalOpen(false)}
        onGenerate={handleGeneratePayroll}
      />
    </div>
  )
}
