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
import { PageContainer } from "@/components/page-container"
import { PageHeader } from "@/components/page-header"
import { RoleGuard } from "@/components/role-guard"

export default function PayrollPage() {
  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await fetch("/api/me")
      if (!res.ok) return null
      return res.json()
    },
  })

  // State for Admin view
  const [view, setView] = useState<"summary" | "employees" | "detail">("summary")
  const [selectedSummary, setSelectedSummary] = useState<PayrollSummary | null>(null)
  const [employeePayrolls, setEmployeePayrolls] = useState<PayrollEmployeeDetail[]>([])
  const [selectedEmployee, setSelectedEmployee] = useState<PayrollEmployeeDetail | null>(null)
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false)
  const [loadingEmployees, setLoadingEmployees] = useState(false)
  const [isPayrollSaving, setIsPayrollSaving] = useState(false)
  const [isPayrollDeleting, setIsPayrollDeleting] = useState(false)

  // Fetch payroll summaries
  const { data: summariesData, isLoading: loadingSummaries, refetch: refetchSummaries } = useQuery({
    queryKey: ["payroll-summaries"],
    queryFn: async () => {
      const res = await fetch("/api/payroll/summaries")
      if (!res.ok) throw new Error("Failed to fetch payroll summaries")
      return res.json()
    },
    enabled: user?.role === "Admin",
  })

  const payrollSummaries = summariesData?.summaries || []

  const isAdmin = user?.role === "Admin"

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

  const handleDeleteSummary = async (summaryId: string) => {
    setIsPayrollDeleting(true)
    try {
      const res = await fetch(`/api/payroll/summaries/${summaryId}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to delete payroll summary")
      }

      const result = await res.json()
      message.success(`Payroll summary for ${result.summary.month} ${result.summary.year} deleted successfully`)

      // Refetch summaries to update the list
      await refetchSummaries()

      // If we're viewing employees from this summary, go back to summary view
      if (selectedSummary?.id === summaryId) {
        handleBackToSummary()
      }
    } catch (error: any) {
      console.error("Error deleting payroll summary:", error)
      message.error(error.message || "Failed to delete payroll summary")
      throw error // Re-throw to let the component know deletion failed
    } finally {
      setIsPayrollDeleting(false)
    }
  }

  const handleSummaryStatusChange = async (summaryId: string, status: "draft" | "paid") => {
    try {
      const res = await fetch(`/api/payroll/summaries/${summaryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to update payroll summary status")
      }

      message.success("Payroll summary status updated")
      await refetchSummaries()
    } catch (error: any) {
      console.error("Error updating payroll summary status:", error)
      message.error(error.message || "Failed to update payroll summary status")
    }
  }

  // Show appropriate message if not Admin
  if (!isAdmin) {
    return (
      <RoleGuard>
        <PageContainer>
          <div className="text-center py-12">
            <h1 className="text-4xl font-bold text-foreground mb-4">Payroll Management</h1>
            <p className="text-muted-foreground">Access restricted to Admin users only.</p>
          </div>
        </PageContainer>
      </RoleGuard>
    )
  }

  return (
    <RoleGuard>
      <PageContainer>
        <div className="relative w-full min-w-0 mx-auto flex-1 flex flex-col bg-white p-2 sm:p-3 lg:p-4 rounded-xl">
          {(isPayrollSaving || isPayrollDeleting) && (
            <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-white/70 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-2xl">
                <Spin size="large" />
                <p className="text-sm font-medium text-slate-700">
                  {isPayrollDeleting ? "Deleting payroll..." : "Saving payroll..."}
                </p>
              </div>
            </div>
          )}
          <PageHeader
            title="Payroll Management"
            subtitle="Manage employee payrolls and generate monthly summaries"
          >
            {view === "summary" && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setIsGenerateModalOpen(true)}
                size="large"
                className="w-full sm:w-auto"
                  disabled={isPayrollSaving || isPayrollDeleting}
              >
                Generate Payroll
              </Button>
            )}
          </PageHeader>

          {loadingSummaries ? (
            <div className="flex justify-center items-center py-12">
              <Spin size="large" />
            </div>
          ) : (
            <>
              {view === "summary" && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-3 sm:p-5 lg:p-6 shadow-sm min-w-0">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Payroll Summaries</h2>
                  {/* <div className="rounded-lg border border-slate-200 bg-white p-3 sm:p-4"> */}
                  <PayrollSummaryList
                    summaries={payrollSummaries}
                    onSelectSummary={handleSelectSummary}
                    onDeleteSummary={handleDeleteSummary}
                    isAdmin={isAdmin}
                    onStatusChange={handleSummaryStatusChange}
                    isBusy={isPayrollSaving || isPayrollDeleting}
                  />
                  {/* </div> */}
                </div>
              )}

              {view === "employees" && selectedSummary && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-3 sm:p-5 lg:p-6 shadow-sm min-w-0">
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                      <Button icon={<ArrowLeftOutlined />} onClick={handleBackToSummary} className="w-full sm:w-auto">
                        Back to Summaries
                      </Button>
                      <h2 className="text-xl sm:text-2xl font-bold text-gray-900 break-words">
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
                </div>
              )}

              {view === "detail" && selectedEmployee && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-3 sm:p-5 lg:p-6 shadow-sm min-w-0">
                  <PayrollEmployeeDetailView employee={selectedEmployee} onBack={handleBackToEmployees} />
                </div>
              )}
            </>
          )}

          <GeneratePayrollModal
            open={isGenerateModalOpen}
            onClose={() => setIsGenerateModalOpen(false)}
            onGenerate={handleGeneratePayroll}
            onSavingChange={setIsPayrollSaving}
          />
        </div>
      </PageContainer>
    </RoleGuard>
  )
}
