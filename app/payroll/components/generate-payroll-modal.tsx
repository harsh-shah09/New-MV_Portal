"use client"

import { useState } from "react"
import { Modal, Select, Button, message, Table, Spin, Tag, Dropdown } from "antd"
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

export function GeneratePayrollModal({ open, onClose, onGenerate }: GeneratePayrollModalProps) {
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
        throw new Error("Failed to generate payroll")
      }

      const data = await response.json()
      setEmployeeData(data.employees || [])
      setOriginalEmployeeData(data.employees || [])
      setShowResults(true)
      message.success(`Payroll generated for ${selectedMonth} ${selectedYear} - ${data.totalEmployees} employees`)
    } catch (error) {
      console.error("Error generating payroll:", error)
      message.error("Failed to generate payroll. Please try again.")
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
        
        // Get current employee data (may already have bonus)
        const baseSalary = emp.baseSalary || 0
        const bonus = emp.bonus || 0
        
        // Get ORIGINAL base values from API (Extra Day Pay and Leave Deductions from leaves)
        const originalEmp = originalEmployeeData.find(e => e.employeeId === emp.employeeId)
        const baseExtraDayPay = originalEmp?.totalAdditions || 0
        const baseLeaveDeductions = originalEmp?.totalDeductions || 0
        
        // Recalculate adjustment totals
        const totalAdjustmentAdditions = adjustments
          .filter(adj => adj.adjustmentType === "Addition")
          .reduce((sum, adj) => sum + adj.adjustmentAmount, 0)
        
        const totalAdjustmentDeductions = adjustments
          .filter(adj => adj.adjustmentType === "Deduction")
          .reduce((sum, adj) => sum + adj.adjustmentAmount, 0)
        
        // Total additions = Extra Day Pay (from API) + Bonus + Adjustment Additions
        const totalAdditions = baseExtraDayPay + bonus + totalAdjustmentAdditions
        
        // Total deductions = Leave Deductions (from API) + Adjustment Deductions
        const totalDeductions = baseLeaveDeductions + totalAdjustmentDeductions
        
        const netSalary = baseSalary + totalAdditions - totalDeductions

        return {
          ...emp,
          adjustments,
          totalAdditions,
          totalDeductions,
          netSalary: Math.round(netSalary * 100) / 100,
        }
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
        const baseSalary = emp.baseSalary || 0
        
        // Get ORIGINAL base values from API (Extra Day Pay and Leave Deductions from leaves)
        const originalEmp = originalEmployeeData.find(e => e.employeeId === emp.employeeId)
        const baseExtraDayPay = originalEmp?.totalAdditions || 0
        const baseLeaveDeductions = originalEmp?.totalDeductions || 0
        
        // Get current adjustment totals (may have been added before bonus)
        const adjustmentAdditions = emp.adjustments
          ?.filter(adj => adj.adjustmentType === "Addition")
          .reduce((sum, adj) => sum + adj.adjustmentAmount, 0) || 0
        
        const adjustmentDeductions = emp.adjustments
          ?.filter(adj => adj.adjustmentType === "Deduction")
          .reduce((sum, adj) => sum + adj.adjustmentAmount, 0) || 0
        
        // Total additions = Extra Day Pay (from API) + Bonus + Adjustment Additions
        const totalAdditions = baseExtraDayPay + bonusAmount + adjustmentAdditions
        
        // Total deductions = Leave Deductions (from API) + Adjustment Deductions
        const totalDeductions = baseLeaveDeductions + adjustmentDeductions
        
        const netSalary = baseSalary + totalAdditions - totalDeductions

        return {
          ...emp,
          bonus: bonusAmount,
          totalAdditions,
          totalDeductions,
          netSalary: Math.round(netSalary * 100) / 100,
        }
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
        const baseSalary = emp.baseSalary || 0
        const bonus = emp.bonus || 0
        
        // Get ORIGINAL base values from API
        const originalEmp = originalEmployeeData.find(e => e.employeeId === emp.employeeId)
        const baseExtraDayPay = originalEmp?.totalAdditions || 0
        const baseLeaveDeductions = originalEmp?.totalDeductions || 0
        
        // Recalculate without adjustments
        const totalAdditions = baseExtraDayPay + bonus
        const totalDeductions = baseLeaveDeductions
        const netSalary = baseSalary + totalAdditions - totalDeductions

        return {
          ...emp,
          adjustments: [],
          totalAdditions,
          totalDeductions,
          netSalary: Math.round(netSalary * 100) / 100,
        }
      }
      return emp
    })

    setEmployeeData(updatedEmployees)
    message.success("Adjustment deleted successfully")
  }

  const handleDeleteBonus = (employeeId: string) => {
    const updatedEmployees = employeeData.map(emp => {
      if (emp.employeeId === employeeId) {
        const baseSalary = emp.baseSalary || 0
        
        // Get ORIGINAL base values from API
        const originalEmp = originalEmployeeData.find(e => e.employeeId === emp.employeeId)
        const baseExtraDayPay = originalEmp?.totalAdditions || 0
        const baseLeaveDeductions = originalEmp?.totalDeductions || 0
        
        // Get current adjustment totals
        const adjustmentAdditions = emp.adjustments
          ?.filter(adj => adj.adjustmentType === "Addition")
          .reduce((sum, adj) => sum + adj.adjustmentAmount, 0) || 0
        
        const adjustmentDeductions = emp.adjustments
          ?.filter(adj => adj.adjustmentType === "Deduction")
          .reduce((sum, adj) => sum + adj.adjustmentAmount, 0) || 0
        
        // Recalculate without bonus
        const totalAdditions = baseExtraDayPay + adjustmentAdditions
        const totalDeductions = baseLeaveDeductions + adjustmentDeductions
        const netSalary = baseSalary + totalAdditions - totalDeductions

        return {
          ...emp,
          bonus: 0,
          totalAdditions,
          totalDeductions,
          netSalary: Math.round(netSalary * 100) / 100,
        }
      }
      return emp
    })

    setEmployeeData(updatedEmployees)
    message.success("Bonus deleted successfully")
  }

  const columns: ColumnsType<PayrollEmployeeDetail> = [
    {
      title: "Employee Name",
      dataIndex: "employeeName",
      key: "employeeName",
      width: 200,
      fixed: "left",
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      width: 200,
    },
    {
      title: "Department",
      dataIndex: "department",
      key: "department",
      width: 150,
    },
    {
      title: "Role",
      dataIndex: "role",
      key: "role",
      width: 150,
    },
    {
      title: "Base Salary",
      dataIndex: "baseSalary",
      key: "baseSalary",
      width: 120,
      render: (amount: number) => `₹${amount?.toLocaleString() || 0}`,
    },
    {
      title: "Additions",
      dataIndex: "totalAdditions",
      key: "totalAdditions",
      width: 100,
      render: (amount: number) => (
        <span className={amount > 0 ? "text-green-600" : ""}>
          ₹{amount?.toLocaleString() || 0}
        </span>
      ),
    },
    {
      title: "Anniversary Bonus",
      dataIndex: "anniversaryBonus",
      key: "anniversaryBonus",
      width: 130,
      render: (amount: number) => (
        <span className={amount > 0 ? "text-purple-600 font-semibold" : ""}>
          {amount > 0 ? `₹${amount?.toLocaleString()}` : '-'}
        </span>
      ),
    },
    {
      title: "Leave Days",
      dataIndex: "totalLeaveDays",
      key: "totalLeaveDays",
      width: 100,
      render: (days: number) => (
        <Tag color={days > 0 ? "orange" : "green"}>{days || 0} days</Tag>
      ),
    },
    {
      title: "Deductions",
      dataIndex: "totalDeductions",
      key: "totalDeductions",
      width: 120,
      render: (amount: number) => (
        <span className={amount > 0 ? "text-red-600" : ""}>
          ₹{amount?.toLocaleString() || 0}
        </span>
      ),
    },
    {
      title: "Security Deduction",
      dataIndex: "companySecurityDeduction",
      key: "companySecurityDeduction",
      width: 130,
      render: (amount: number) => (
        <span className={amount > 0 ? "text-orange-600" : ""}>
          ₹{amount?.toLocaleString() || 0}
        </span>
      ),
    },
    {
      title: "Net Salary",
      dataIndex: "netSalary",
      key: "netSalary",
      width: 120,
      render: (amount: number) => (
        <span className="font-semibold text-green-600">₹{amount?.toLocaleString() || 0}</span>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 150,
      fixed: "right",
      render: (_, record) => {
        const hasAdjustment = !!(record.adjustments && record.adjustments.length > 0)
        const hasBonus = !!(record.bonus && record.bonus > 0)
        const allActionsUsed = hasAdjustment && hasBonus

        const menuItems: MenuProps['items'] = [
          {
            key: 'adjustment',
            label: hasAdjustment ? 'Edit Adjustment' : 'Add Adjustment',
            onClick: () => {
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
            onClick: () => handleDeleteAdjustment(record.employeeId),
          } : null,
          {
            key: 'bonus',
            label: hasBonus ? 'Edit Bonus' : 'Add Bonus',
            onClick: () => {
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
            onClick: () => handleDeleteBonus(record.employeeId),
          } : null,
        ].filter(Boolean)

        return (
          <Dropdown menu={{ items: menuItems }} trigger={['click']}>
            <Button
              type="link"
              onClick={(e) => e.stopPropagation()}
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
    const hasLeaves = record.leaves && record.leaves.length > 0
    const hasAdjustments = record.adjustments && record.adjustments.length > 0
    const hasBonus = record.bonus && record.bonus > 0

    if (!hasLeaves && !hasAdjustments && !hasBonus) {
      return <p className="text-gray-500 p-4">No leaves, adjustments, or bonus for this month</p>
    }

    return (
      <div className="space-y-4 p-4">
        {hasLeaves && (
          <div>
            <h4 className="font-semibold mb-2">Leave Details</h4>
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
                    return daysInMonth < totalDays ? `${daysInMonth} (of ${totalDays})` : daysInMonth
                  },
                },
                {
                  title: "Deduction",
                  dataIndex: "afterRuleDeduction",
                  key: "afterRuleDeduction",
                  render: (amount: number, record: any) => `₹${(amount || record.actualDeduction || 0).toLocaleString()}`,
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
              dataSource={record.leaves}
              pagination={false}
              rowKey="id"
              size="small"
            />
          </div>
        )}

        {hasAdjustments && (
          <div>
            <h4 className="font-semibold mb-2">Adjustments</h4>
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
                      {record.adjustmentType === "Addition" ? "+" : "-"}₹{amount.toLocaleString()}
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
            />
          </div>
        )}

        {hasBonus && (
          <div>
            <h4 className="font-semibold mb-2">Bonus</h4>
            <div className="p-3 bg-green-50 border border-green-200 rounded">
              <div>
                <p className="text-sm text-gray-600">Bonus Amount</p>
                <p className="text-lg font-semibold text-green-600">+₹{record.bonus?.toLocaleString()}</p>
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
        <div className="flex items-center gap-3">
          <Image
            src="/mv_logo.png"
            alt="MV Clouds Logo"
            width={40}
            height={40}
            className="object-contain"
          />
          <span>{showResults ? `Payroll Preview - ${selectedMonth} ${selectedYear}` : "Generate Payroll"}</span>
        </div>
      }
      open={open}
      onCancel={handleClose}
      width={showResults ? 1200 : 500}
      footer={
        showResults
          ? [
              <Button key="cancel" onClick={handleClose}>
                Cancel
              </Button>,
              <Button key="confirm" type="primary" onClick={handleConfirmGeneration} loading={saving} disabled={saving}>
                Confirm & Save Payroll
              </Button>,
            ]
          : [
              <Button key="cancel" onClick={handleClose}>
                Cancel
              </Button>,
              <Button key="generate" type="primary" onClick={handleGenerate} loading={loading}>
                Generate Payroll
              </Button>,
            ]
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
        <div className="py-4">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Spin size="large" />
            </div>
          ) : (
            <>
              <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold text-lg mb-2">Summary</h3>
                <div className="grid grid-cols-6 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Total Employees</p>
                    <p className="text-2xl font-bold">{employeeData.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Additions</p>
                    <p className="text-2xl font-bold text-green-600">
                      ₹{employeeData.reduce((sum, emp) => sum + (emp.totalAdditions || 0), 0).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Anniversary Bonus</p>
                    <p className="text-2xl font-bold">
                      ₹{employeeData.reduce((sum, emp) => sum + (emp.anniversaryBonus || 0), 0).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Deductions</p>
                    <p className="text-2xl font-bold text-red-600">
                      ₹{employeeData.reduce((sum, emp) => sum + (emp.totalDeductions || 0), 0).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Security Deductions</p>
                    <p className="text-2xl font-bold">
                      ₹{employeeData.reduce((sum, emp) => sum + (emp.companySecurityDeduction || 0), 0).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Net Payroll</p>
                    <p className="text-2xl font-bold">
                      ₹{employeeData.reduce((sum, emp) => sum + (emp.netSalary || 0), 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
              <Table
                columns={columns}
                dataSource={employeeData}
                rowKey="id"
                pagination={{ pageSize: 10 }}
                scroll={{ x: 1700 }}
                expandable={{
                  expandedRowRender,
                  rowExpandable: (record) => 
                    !!(record.leaves && record.leaves.length > 0) || 
                    !!(record.adjustments && record.adjustments.length > 0) ||
                    !!(record.bonus && record.bonus > 0),
                }}
                className="bg-white rounded-lg"
              />
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

