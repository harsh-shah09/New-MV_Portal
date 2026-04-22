"use client"

import { useState } from "react"
import { Modal, Select, Button, message, Table, Spin, Tag, Dropdown, Grid } from "antd"
import { PlusOutlined, DownOutlined } from "@ant-design/icons"
import type { MenuProps } from "antd"
import type { ColumnsType } from "antd/es/table"
import Image from "next/image"
import type { PayrollEmployeeDetail, PayrollAdjustment } from "@/types"
import { AddAdjustmentModal } from "./add-adjustment-modal"
import { AddBonusModal } from "./add-bonus-modal"

interface GeneratePayrollModalProps {
  open: boolean
  onClose: () => void
  onGenerate: (month: string, year: number, employees: PayrollEmployeeDetail[]) => void
  onSavingChange?: (saving: boolean) => void
}

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

const currentYear = new Date().getFullYear()
const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

export function GeneratePayrollModal({ open, onClose, onGenerate, onSavingChange }: GeneratePayrollModalProps) {
  const screens = Grid.useBreakpoint()
  const useFixedColumns = !!screens.lg

  const [selectedMonth, setSelectedMonth] = useState<string>("")
  const [selectedYear, setSelectedYear] = useState<number>(currentYear)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [employeeData, setEmployeeData] = useState<PayrollEmployeeDetail[]>([])
  const [originalEmployeeData, setOriginalEmployeeData] = useState<PayrollEmployeeDetail[]>([])
  const [showResults, setShowResults] = useState(false)
  const [adjustmentModalOpen, setAdjustmentModalOpen] = useState(false)
  const [bonusModalOpen, setBonusModalOpen] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<PayrollEmployeeDetail | null>(null)
  const [editMode, setEditMode] = useState(false)

  const formatCurrency = (value?: number | null) => {
    const rounded = Math.round(Number(value) || 0)
    return `₹${rounded.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const formatDays = (value?: number | null) => {
    const normalized = Math.round((Number(value) || 0) * 10) / 10
    return Number.isInteger(normalized) ? `${normalized}` : normalized.toFixed(1)
  }

  const sumAdjustments = (adjustments: PayrollAdjustment[] | undefined, type: "Addition" | "Deduction") => {
    return adjustments
      ?.filter((adjustment) => adjustment.adjustmentType === type)
      .reduce((sum, adjustment) => sum + Number(adjustment.adjustmentAmount || 0), 0) || 0
  }

  const recalculateEmployeePayroll = (
    employee: PayrollEmployeeDetail,
    overrides?: {
      bonus?: number
      adjustments?: PayrollAdjustment[]
    }
  ): PayrollEmployeeDetail => {
    const originalEmployee = originalEmployeeData.find((item) => item.employeeId === employee.employeeId)
    const bonus = overrides?.bonus ?? Number(employee.bonus || 0)
    const adjustments = overrides?.adjustments ?? employee.adjustments ?? []

    const baseExtraDayPay = Number(originalEmployee?.totalAdditions || 0)
    const grossIncome = Number(employee.grossIncome || 0)
    const salaryStructureDeductions = Number(employee.pfDeduction || 0) + Number(employee.ptDeduction || 0) + Number(employee.esiDeduction || 0)
    const adjustmentAdditions = sumAdjustments(adjustments, "Addition")
    const adjustmentDeductions = sumAdjustments(adjustments, "Deduction")

    const totalAdditions = baseExtraDayPay + bonus + adjustmentAdditions
    const totalDeductions = salaryStructureDeductions + adjustmentDeductions
    const netSalary = grossIncome + totalAdditions - totalDeductions

    return {
      ...employee,
      bonus,
      adjustments,
      totalAdditions: Math.round(totalAdditions * 100) / 100,
      totalDeductions: Math.round(totalDeductions * 100) / 100,
      netSalary: Math.round(netSalary * 100) / 100,
    }
  }

  const isFuturePayrollPeriod = (month: string, year: number) => {
    const monthIndex = months.indexOf(month)
    if (monthIndex < 0) return false
    const selectedPeriod = new Date(year, monthIndex, 1)
    const now = new Date()
    const currentPeriod = new Date(now.getFullYear(), now.getMonth(), 1)
    return selectedPeriod > currentPeriod
  }

  const handleGenerate = async () => {
    if (!selectedMonth) {
      message.error("Please select a month")
      return
    }

    if (isFuturePayrollPeriod(selectedMonth, selectedYear)) {
      message.error("Cannot generate payroll for a future month")
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/payroll/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          month: selectedMonth,
          year: selectedYear,
        }),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err?.error || "Failed to generate payroll")
      }

      const data = await response.json()
      const normalizedEmployees = (data.employees || []).map((employee: PayrollEmployeeDetail) => recalculateEmployeePayroll(employee))
      setEmployeeData(normalizedEmployees)
      setOriginalEmployeeData(data.employees || [])
      setShowResults(true)
      message.success(`Payroll generated for ${selectedMonth} ${selectedYear} - ${data.totalEmployees} employees`)
    } catch (error: any) {
      console.error("Error generating payroll:", error)
      message.error(error?.message || "Failed to generate payroll. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmGeneration = async () => {
    if (!selectedMonth || !selectedYear) {
      message.error("Month and year are required")
      return
    }

    if (isFuturePayrollPeriod(selectedMonth, selectedYear)) {
      message.error("Cannot save payroll for a future month")
      return
    }

    if (!employeeData.length) {
      message.error("No employee payroll data to save")
      return
    }

    setSaving(true)
    onSavingChange?.(true)
    try {
      const res = await fetch("/api/payroll/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: selectedMonth, year: selectedYear, employees: employeeData }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error || "Failed to save payroll")
      }

      const data = await res.json()

      if (data?.payrollSummaryTxtContent) {
        const blob = new Blob([data.payrollSummaryTxtContent], { type: "text/plain;charset=utf-8" })
        const downloadUrl = URL.createObjectURL(blob)
        const anchor = document.createElement("a")
        anchor.href = downloadUrl
        anchor.download = data?.payrollSummaryTxtFileName || `Payroll_Summary_${selectedMonth}_${selectedYear}.txt`
        document.body.appendChild(anchor)
        anchor.click()
        anchor.remove()
        URL.revokeObjectURL(downloadUrl)
      }

      message.success("Payroll saved as Draft")

      // Let parent update UI/state
      onGenerate(selectedMonth, selectedYear, employeeData)

      handleClose()
      return data
    } catch (error: any) {
      console.error("Error saving payroll:", error)
      message.error(error?.message || "Failed to save payroll")
    } finally {
      setSaving(false)
      onSavingChange?.(false)
    }
  }

  const handleClose = () => {
    setSelectedMonth("")
    setSelectedYear(currentYear)
    setEmployeeData([])
    setShowResults(false)
    setSaving(false)
    setSelectedEmployee(null)
    setAdjustmentModalOpen(false)
    setBonusModalOpen(false)
    onClose()
  }

  const handleAddAdjustment = (employeeId: string, employeeName: string) => {
    const employee = employeeData.find(emp => emp.employeeId === employeeId)
    if (employee) {
      // Check if adjustment already exists (only if not in edit mode)
      if (!editMode && employee.adjustments && employee.adjustments.length > 0) {
        message.warning("Only one adjustment is allowed per employee")
        return
      }
      setSelectedEmployee(employee)
      setAdjustmentModalOpen(true)
    }
  }

  const handleAddBonus = (employeeId: string, employeeName: string) => {
    const employee = employeeData.find(emp => emp.employeeId === employeeId)
    if (employee) {
      // Check if bonus already exists (only if not in edit mode)
      if (!editMode && employee.bonus && employee.bonus > 0) {
        message.warning("Only one bonus is allowed per employee")
        return
      }
      setSelectedEmployee(employee)
      setBonusModalOpen(true)
    }
  }

  const handleEditAdjustment = (employeeId: string, employeeName: string) => {
    const employee = employeeData.find(emp => emp.employeeId === employeeId)
    if (employee) {
      setEditMode(true)
      setSelectedEmployee(employee)
      setAdjustmentModalOpen(true)
    }
  }

  const handleEditBonus = (employeeId: string, employeeName: string) => {
    const employee = employeeData.find(emp => emp.employeeId === employeeId)
    if (employee) {
      setEditMode(true)
      setSelectedEmployee(employee)
      setBonusModalOpen(true)
    }
  }

  const handleAdjustmentAdded = (adjustment: PayrollAdjustment) => {
    if (!selectedEmployee) return

    const updatedEmployees = employeeData.map(emp => {
      if (emp.employeeId === selectedEmployee.employeeId) {
        // In edit mode, replace adjustment; otherwise add it
        const adjustments = editMode ? [adjustment] : [...(emp.adjustments || []), adjustment]
        return recalculateEmployeePayroll(emp, { adjustments })
      }
      return emp
    })

    setEmployeeData(updatedEmployees)
    setAdjustmentModalOpen(false)
    setSelectedEmployee(null)
    setEditMode(false)
  }

  const handleBonusAdded = (bonusAmount: number) => {
    if (!selectedEmployee) return

    const updatedEmployees = employeeData.map(emp => {
      if (emp.employeeId === selectedEmployee.employeeId) {
        return recalculateEmployeePayroll(emp, { bonus: bonusAmount })
      }
      return emp
    })

    setEmployeeData(updatedEmployees)
    setBonusModalOpen(false)
    setSelectedEmployee(null)
    setEditMode(false)
  }

  const handleDeleteAdjustment = (employeeId: string) => {
    const updatedEmployees = employeeData.map(emp => {
      if (emp.employeeId === employeeId) {
        return recalculateEmployeePayroll(emp, { adjustments: [] })
      }
      return emp
    })

    setEmployeeData(updatedEmployees)
    message.success("Adjustment deleted successfully")
  }

  const handleDeleteBonus = (employeeId: string) => {
    const updatedEmployees = employeeData.map(emp => {
      if (emp.employeeId === employeeId) {
        return recalculateEmployeePayroll(emp, { bonus: 0 })
      }
      return emp
    })

    setEmployeeData(updatedEmployees)
    message.success("Bonus deleted successfully")
  }

  const confirmDeleteAdjustment = (employeeId: string, employeeName: string) => {
    Modal.confirm({
      title: "Delete Adjustment?",
      content: `Are you sure you want to delete adjustment for ${employeeName}?`,
      okText: "Delete",
      cancelText: "Cancel",
      okButtonProps: { danger: true },
      onOk: () => handleDeleteAdjustment(employeeId),
    })
  }

  const confirmDeleteBonus = (employeeId: string, employeeName: string) => {
    Modal.confirm({
      title: "Delete Bonus?",
      content: `Are you sure you want to delete bonus for ${employeeName}?`,
      okText: "Delete",
      cancelText: "Cancel",
      okButtonProps: { danger: true },
      onOk: () => handleDeleteBonus(employeeId),
    })
  }

  const columns: ColumnsType<PayrollEmployeeDetail> = [
    {
      title: "Employee Name",
      dataIndex: "employeeName",
      key: "employeeName",
      width: 160,
      fixed: useFixedColumns ? "left" : undefined,
      className: "text-xs",
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      width: 180,
      className: "text-xs",
    },
    {
      title: "Department",
      dataIndex: "department",
      key: "department",
      width: 120,
      className: "text-xs",
    },
    {
      title: "Role",
      dataIndex: "role",
      key: "role",
      width: 120,
      className: "text-xs",
    },
    {
      title: "Basic Console",
      dataIndex: "basicComponent",
      key: "basicComponent",
      width: 100,
      render: (amount: number) => formatCurrency(amount),
    },
    {
      title: "HRA",
      dataIndex: "hraComponent",
      key: "hraComponent",
      width: 90,
      render: (amount: number) => formatCurrency(amount),
    },
    {
      title: "CONV",
      dataIndex: "convComponent",
      key: "convComponent",
      width: 90,
      render: (amount: number) => formatCurrency(amount),
    },
    {
      title: "SA",
      dataIndex: "specialAllowanceComponent",
      key: "specialAllowanceComponent",
      width: 90,
      render: (amount: number) => formatCurrency(amount),
    },
    {
      title: "Gross Income",
      dataIndex: "grossIncome",
      key: "grossIncome",
      width: 100,
      render: (amount: number) => (
        <span className="font-semibold text-blue-600">{formatCurrency(amount)}</span>
      ),
    },
    {
      title: "PF",
      dataIndex: "pfDeduction",
      key: "pfDeduction",
      width: 90,
      render: (amount: number) => formatCurrency(amount),
    },
    {
      title: "PT",
      dataIndex: "ptDeduction",
      key: "ptDeduction",
      width: 90,
      render: (amount: number) => formatCurrency(amount),
    },
    {
      title: "ESI",
      dataIndex: "esiDeduction",
      key: "esiDeduction",
      width: 90,
      render: (amount: number) => formatCurrency(amount),
    },
    {
      title: "Gross Deduction",
      dataIndex: "salaryStructureDeductions",
      key: "salaryStructureDeductions",
      width: 110,
      render: (amount: number) => (
        <span className="font-semibold text-orange-600">{formatCurrency(amount)}</span>
      ),
    },
    // {
    //   title: "Leave Days",
    //   dataIndex: "totalLeaveDaysAfterRule",
    //   key: "totalLeaveDays",
    //   width: 85,
    //   render: (_: number, record: PayrollEmployeeDetail) => {
    //     const beforeRule = Number(record.totalLeaveDays || 0)
    //     const afterRule = Number(record.totalLeaveDaysAfterRule ?? beforeRule)
    //     const hasRuleDelta = Math.abs(afterRule - beforeRule) > 0.001
    //     return (
    //       <Tag color={afterRule > 0 ? "orange" : "green"}>
    //         {hasRuleDelta ? `${formatDays(beforeRule)} → ${formatDays(afterRule)} days` : `${formatDays(afterRule)} days`}
    //       </Tag>
    //     )
    //   },
    // },
    {
      title: "Net Salary",
      dataIndex: "netSalary",
      key: "netSalary",
      width: 110,
      render: (amount: number) => (
        <span className="font-semibold text-green-600">{formatCurrency(amount)}</span>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 150,
      fixed: useFixedColumns ? "right" : undefined,
      render: (_, record) => {
        const actionsDisabled = saving
        const hasAdjustment = !!(record.adjustments && record.adjustments.length > 0)
        const hasBonus = !!(record.bonus && record.bonus > 0)
        const allActionsUsed = hasAdjustment && hasBonus

        const menuItems: MenuProps['items'] = [
          {
            key: 'adjustment',
            label: hasAdjustment ? 'Edit Adjustment' : 'Add Adjustment',
            disabled: actionsDisabled,
            onClick: () => {
              if (actionsDisabled) return
              if (hasAdjustment) {
                handleEditAdjustment(record.employeeId, record.employeeName)
              } else {
                handleAddAdjustment(record.employeeId, record.employeeName)
              }
            },
          },
          hasAdjustment ? {
            key: 'delete-adjustment',
            label: 'Delete Adjustment',
            danger: true,
            disabled: actionsDisabled,
            onClick: () => confirmDeleteAdjustment(record.employeeId, record.employeeName),
          } : null,
          {
            key: 'bonus',
            label: hasBonus ? 'Edit Bonus' : 'Add Bonus',
            disabled: actionsDisabled,
            onClick: () => {
              if (actionsDisabled) return
              if (hasBonus) {
                handleEditBonus(record.employeeId, record.employeeName)
              } else {
                handleAddBonus(record.employeeId, record.employeeName)
              }
            },
          },
          hasBonus ? {
            key: 'delete-bonus',
            label: 'Delete Bonus',
            danger: true,
            disabled: actionsDisabled,
            onClick: () => confirmDeleteBonus(record.employeeId, record.employeeName),
          } : null,
        ].filter(Boolean)

        return (
          <Dropdown menu={{ items: menuItems }} trigger={['click']} disabled={actionsDisabled}>
            <Button
              type="link"
              onClick={(e) => e.stopPropagation()}
              disabled={actionsDisabled}
            >
              {allActionsUsed ? 'Edit' : hasAdjustment || hasBonus ? 'Manage' : 'Add'} <DownOutlined />
            </Button>
          </Dropdown>
        )
      },
    },
  ]

  // Expandable row to show leave details, adjustments, and bonus
  const expandedRowRender = (record: PayrollEmployeeDetail) => {
    const allLeaves = record.leaves || []
    const extraDayPayLeaves = allLeaves.filter((leave) => {
      const normalizedCategory = leave.leaveCategory?.toLowerCase().replace(/\s+/g, '-') || ""
      return normalizedCategory === "extra-day-pay"
    })
    const regularLeaves = allLeaves.filter((leave) => {
      const normalizedCategory = leave.leaveCategory?.toLowerCase().replace(/\s+/g, '-') || ""
      return normalizedCategory !== "extra-day-pay"
    })

    const hasLeaves = regularLeaves.length > 0
    const hasExtraDayPay = extraDayPayLeaves.length > 0
    const hasAdjustments = record.adjustments && record.adjustments.length > 0
    const hasBonus = !!(record.bonus && record.bonus > 0)

    const totalExtraDayPay = extraDayPayLeaves.reduce(
      (sum, leave) => sum + Math.abs(Number(leave.afterRuleDeduction || leave.actualDeduction || 0)),
      0
    )

    if (!hasLeaves && !hasExtraDayPay && !hasAdjustments && !hasBonus) {
      return <p className="text-gray-500 px-2 py-1 text-[11px]">No leaves, extra day pay, adjustments, or bonus for this month</p>
    }

    return (
      <div className="space-y-2 px-2 py-1 text-[11px] leading-tight">
        {hasLeaves && (
          <div>
            <h4 className="font-semibold mb-1 text-[11px]">Leave Details</h4>
            <Table
              columns={[
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
                },
                {
                  title: "End Date",
                  dataIndex: "endDate",
                  key: "endDate",
                },
                {
                  title: "Days (in month)",
                  dataIndex: "daysInSelectedMonth",
                  key: "daysInSelectedMonth",
                  render: (days: number, record: any) => {
                    const daysInMonth = days || 0
                    const totalDays = record.totalDays || 0
                    const daysAfterRuleInMonth = Number(record.daysAfterRuleInMonth ?? daysInMonth)
                    const hasRuleDelta = Math.abs(daysAfterRuleInMonth - Number(daysInMonth)) > 0.001
                    const baseText = daysInMonth < totalDays
                      ? `${formatDays(daysInMonth)} (of ${formatDays(totalDays)})`
                      : `${formatDays(daysInMonth)}`

                    return hasRuleDelta
                      ? `${baseText} → ${formatDays(daysAfterRuleInMonth)}`
                      : baseText
                  },
                },
                {
                  title: "Deduction",
                  dataIndex: "afterRuleDeduction",
                  key: "afterRuleDeduction",
                  render: (amount: number, row: any) => {
                    const deductionAmount = Number(amount || row.actualDeduction || 0)
                    return deductionAmount > 0 ? formatCurrency(deductionAmount) : "-"
                  },
                },
                {
                  title: "Status",
                  dataIndex: "status",
                  key: "status",
                  render: (status: string) => (
                    <Tag color={status === "Approved" ? "green" : "blue"}>{status}</Tag>
                  ),
                },
              ]}
              dataSource={regularLeaves}
              pagination={false}
              rowKey="id"
              size="small"
              scroll={{ x: 720 }}
            />
          </div>
        )}

        {hasExtraDayPay && (
          <div>
            <h4 className="font-semibold mb-1 text-[11px]">Extra Day Pay</h4>
            <div className="px-2 py-1 bg-green-50 border border-green-200 rounded text-[11px] space-y-1">
              <div>
                {/* <p className="text-[11px] text-gray-600">Total Extra Day Pay</p>
                <p className="text-xs font-semibold text-green-600">+{formatCurrency(totalExtraDayPay)}</p> */}
              </div>
              <Table
                columns={[
                  {
                    title: "Leave Type",
                    dataIndex: "leaveType",
                    key: "leaveType",
                  },
                  {
                    title: "Start Date",
                    dataIndex: "startDate",
                    key: "startDate",
                  },
                  {
                    title: "End Date",
                    dataIndex: "endDate",
                    key: "endDate",
                  },
                  {
                    title: "Days",
                    dataIndex: "daysInSelectedMonth",
                    key: "daysInSelectedMonth",
                    render: (days: number) => formatDays(Number(days || 0)),
                  },
                  {
                    title: "Amount",
                    dataIndex: "afterRuleDeduction",
                    key: "amount",
                    render: (amount: number, row: any) => {
                      const extraAmount = Math.abs(Number(amount || row.actualDeduction || 0))
                      return <span className="text-green-600 font-semibold">+{formatCurrency(extraAmount)}</span>
                    },
                  },
                ]}
                dataSource={extraDayPayLeaves}
                pagination={false}
                rowKey="id"
                size="small"
                scroll={{ x: 680 }}
              />
            </div>
          </div>
        )}

        {hasAdjustments && (
          <div>
            <h4 className="font-semibold mb-1 text-[11px]">Adjustments</h4>
            <Table
              columns={[
                {
                  title: "Type",
                  dataIndex: "adjustmentType",
                  key: "adjustmentType",
                  render: (type: string) => (
                    <Tag color={type === "Addition" ? "green" : "red"}>{type}</Tag>
                  ),
                },
                {
                  title: "Amount",
                  dataIndex: "adjustmentAmount",
                  key: "adjustmentAmount",
                  render: (amount: number, record: any) => (
                    <span className={record.adjustmentType === "Addition" ? "text-green-600" : "text-red-600"}>
                      {record.adjustmentType === "Addition" ? "+" : "-"}{formatCurrency(amount)}
                    </span>
                  ),
                },
                {
                  title: "Description",
                  dataIndex: "adjustmentDescription",
                  key: "adjustmentDescription",
                },
              ]}
              dataSource={record.adjustments}
              pagination={false}
              rowKey="id"
              size="small"
              scroll={{ x: 560 }}
            />
          </div>
        )}

        {hasBonus && (
          <div>
            <h4 className="font-semibold mb-1 text-[11px]">Bonus</h4>
            <div className="px-2 py-1 bg-green-50 border border-green-200 rounded text-[11px]">
              <div>
                <p className="text-[11px] text-gray-600">Bonus Amount</p>
                <p className="text-xs font-semibold text-green-600">+{formatCurrency(record.bonus)}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <Modal
      title={
        <div className="flex items-center gap-2 sm:gap-3 pr-4">
          <Image
            src="/mv_logo1.png"
            alt="MV Clouds Logo"
            width={36}
            height={36}
            className="object-contain w-7 h-7 sm:w-9 sm:h-9"
          />
          <span className="text-xs sm:text-sm md:text-base break-words leading-snug">
            {showResults ? `Payroll Preview - ${selectedMonth} ${selectedYear}` : "Generate Payroll"}
          </span>
        </div>
      }
      open={open}
      onCancel={handleClose}
        closable={!saving}
        maskClosable={!saving}
        keyboard={!saving}
      width={showResults ? "min(1540px, calc(100vw - 12px))" : "min(460px, calc(100vw - 12px))"}
      centered
      styles={{ body: { maxHeight: "calc(100vh - 180px)", overflowY: "auto", overflowX: "hidden", padding: 8 } }}
      footer={
        showResults
          ? (
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                <Button key="cancel" onClick={handleClose} disabled={saving} className="w-full sm:w-auto">
                  Cancel
                </Button>
                <Button
                  key="confirm"
                  type="primary"
                  onClick={handleConfirmGeneration}
                  loading={saving}
                  disabled={saving}
                  className="w-full sm:w-auto"
                >
                  Confirm & Save Payroll
                </Button>
              </div>
            )
          : (
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                <Button key="cancel" onClick={handleClose} disabled={saving} className="w-full sm:w-auto">
                  Cancel
                </Button>
                <Button key="generate" type="primary" onClick={handleGenerate} loading={loading} className="w-full sm:w-auto">
                  Generate Payroll
                </Button>
              </div>
            )
      }
    >
      {!showResults ? (
        <div className="space-y-4 py-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Month</label>
            <Select
              className="w-full"
              placeholder="Select month"
              value={selectedMonth || undefined}
              onChange={(value) => setSelectedMonth(value)}
              options={months.map((month) => ({
                label: month,
                value: month,
              }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Year</label>
            <Select
              className="w-full"
              placeholder="Select year"
              value={selectedYear}
              onChange={(value) => setSelectedYear(value)}
              options={years.map((year) => ({
                label: year,
                value: year,
              }))}
            />
          </div>
        </div>
      ) : (
        <div className="py-1 min-w-0">
          {loading ? (
            <div className="flex justify-center items-center py-6">
              <Spin size="large" />
            </div>
          ) : (
            <>
              <div className="mb-2 p-2 bg-blue-50 rounded-lg">
                <h3 className="font-semibold text-xs mb-1">Summary</h3>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px] leading-tight">
                  <div>
                    <p className="text-[11px] text-gray-600">Total Employees</p>
                    <p className="text-sm font-bold">{employeeData.length}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-gray-600">Total Additions</p>
                    <p className="text-sm font-bold text-green-600">
                      {formatCurrency(employeeData.reduce((sum, emp) => sum + (emp.totalAdditions || 0), 0))}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-gray-600">Gross Income</p>
                    <p className="text-sm font-bold text-blue-600">
                      {formatCurrency(employeeData.reduce((sum, emp) => sum + (emp.grossIncome || 0), 0))}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-gray-600">Gross Deduction</p>
                    <p className="text-sm font-bold text-orange-600">
                      {formatCurrency(employeeData.reduce((sum, emp) => sum + (emp.pfDeduction || 0) + (emp.ptDeduction || 0) + (emp.esiDeduction || 0), 0))}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-gray-600">Net Payroll</p>
                    <p className="text-sm font-bold">
                      {formatCurrency(employeeData.reduce((sum, emp) => sum + (emp.netSalary || 0), 0))}
                    </p>
                  </div>
                </div>
              </div>
              <div className="w-full min-w-0 overflow-x-auto">
                <Table
                  columns={columns}
                  dataSource={employeeData}
                  rowKey="id"
                  pagination={{ pageSize: 10, size: "small" }}
                  size="small"
                  scroll={{ x: "max-content", y: 300 }}
                  expandable={{
                    expandedRowRender,
                    rowExpandable: (record) => 
                      !!(record.leaves && record.leaves.length > 0) || 
                      !!(record.adjustments && record.adjustments.length > 0) ||
                      !!(record.bonus && record.bonus > 0),
                  }}
                  className="bg-white rounded-lg"
                />
              </div>
            </>
          )}
        </div>
      )}

      <AddAdjustmentModal
        open={adjustmentModalOpen}
        onClose={() => {
          setAdjustmentModalOpen(false)
          setSelectedEmployee(null)
          setEditMode(false)
        }}
        employeeName={selectedEmployee?.employeeName || ""}
        onAdd={handleAdjustmentAdded}
        initialAdjustment={editMode && selectedEmployee?.adjustments?.[0] ? selectedEmployee.adjustments[0] : undefined}
      />

      <AddBonusModal
        open={bonusModalOpen}
        onClose={() => {
          setBonusModalOpen(false)
          setSelectedEmployee(null)
          setEditMode(false)
        }}
        employeeName={selectedEmployee?.employeeName || ""}
        onAdd={handleBonusAdded}
        initialBonus={editMode && selectedEmployee?.bonus ? selectedEmployee.bonus : undefined}
      />
    </Modal>
  )
}

