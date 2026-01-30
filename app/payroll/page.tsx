"use client"

import { useState, useEffect } from "react"
import { Button, message, Spin } from "antd"
import { PlusOutlined, ArrowLeftOutlined } from "@ant-design/icons"
import { useQuery } from "@tanstack/react-query"

import { PayrollSummaryList } from "./components/payroll-summary-list"
import { PayrollEmployeeList } from "./components/payroll-employee-list"
import { PayrollEmployeeDetailView } from "./components/payroll-employee-detail"
import { GeneratePayrollModal } from "./components/generate-payroll-modal"
import type { PayrollSummary, PayrollEmployeeDetail } from "@/types"

export default function PayrollPage() {
  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await fetch("/api/me")
      if (!res.ok) return null
      return res.json()
    },
  })

  // State for HR/Admin view
  const [view, setView] = useState<"summary" | "employees" | "detail">("summary")
  const [selectedSummary, setSelectedSummary] = useState<PayrollSummary | null>(null)
  const [employeePayrolls, setEmployeePayrolls] = useState<PayrollEmployeeDetail[]>([])
  const [selectedEmployee, setSelectedEmployee] = useState<PayrollEmployeeDetail | null>(null)
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false)
  const [loadingEmployees, setLoadingEmployees] = useState(false)

  // Fetch payroll summaries
  const { data: summariesData, isLoading: loadingSummaries, refetch: refetchSummaries } = useQuery({
    queryKey: ["payroll-summaries"],
    queryFn: async () => {
      const res = await fetch("/api/payroll/summaries")
      if (!res.ok) throw new Error("Failed to fetch payroll summaries")
      return res.json()
    },
    enabled: user?.role === "Admin" || user?.role === "HR",
  })

  const payrollSummaries = summariesData?.summaries || []

  const isHROrAdmin = user?.role === "Admin" || user?.role === "HR"

  const handleSelectSummary = async (summary: PayrollSummary) => {
    setSelectedSummary(summary)
    setLoadingEmployees(true)
    
    try {
      const res = await fetch(`/api/payroll/employees/${summary.id}`)
      if (!res.ok) throw new Error("Failed to fetch employee payrolls")
      
      const data = await res.json()
      setEmployeePayrolls(data.employees || [])
      setView("employees")
    } catch (error) {
      console.error("Error fetching employee payrolls:", error)
      message.error("Failed to load employee payrolls")
      setEmployeePayrolls([])
    } finally {
      setLoadingEmployees(false)
    }
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

  const handleGeneratePayroll = async (month: string, year: number, employees: PayrollEmployeeDetail[]) => {
    // Payroll is already saved by the modal, just refresh the list
    message.success(`Payroll saved for ${month} ${year} - ${employees.length} employees`)
    
    // Refetch summaries to show the newly created one
    await refetchSummaries()
    
    // If we're still on the summary view, the list will update automatically
    // If we had selected a summary, go back to summary view
    setView("summary")
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

      {loadingSummaries ? (
        <div className="flex justify-center items-center py-12">
          <Spin size="large" />
        </div>
      ) : (
        <>
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
              {loadingEmployees ? (
                <div className="flex justify-center items-center py-12">
                  <Spin size="large" />
                </div>
              ) : (
                <PayrollEmployeeList
                  employees={employeePayrolls}
                  month={selectedSummary.month}
                  year={selectedSummary.year}
                  onSelectEmployee={handleSelectEmployee}
                />
              )}
            </div>
          )}

          {view === "detail" && selectedEmployee && (
            <PayrollEmployeeDetailView employee={selectedEmployee} onBack={handleBackToEmployees} />
          )}
        </>
      )}

      <GeneratePayrollModal
        open={isGenerateModalOpen}
        onClose={() => setIsGenerateModalOpen(false)}
        onGenerate={handleGeneratePayroll}
      />
    </div>
  )
}
