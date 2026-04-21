"use client"

import { Table, Tag, Button, Grid } from "antd"
import { EyeOutlined } from "@ant-design/icons"
import type { ColumnsType } from "antd/es/table"
import type { PayrollEmployeeDetail } from "@/types"

interface PayrollEmployeeListProps {
  employees: PayrollEmployeeDetail[]
  month: string
  year: number
  onSelectEmployee: (employee: PayrollEmployeeDetail) => void
}

export function PayrollEmployeeList({ employees, month, year, onSelectEmployee }: PayrollEmployeeListProps) {
  const screens = Grid.useBreakpoint()
  const useFixedColumns = !!screens.lg

  const columns: ColumnsType<PayrollEmployeeDetail> = [
    {
      title: "Employee Name",
      dataIndex: "employeeName",
      key: "employeeName",
      fixed: useFixedColumns ? "left" : undefined,
      width: 200,
    },
    {
      title: "Department",
      dataIndex: "department",
      key: "department",
      width: 150,
    },
    {
      title: "Monthly Income",
      dataIndex: "baseSalary",
      key: "baseSalary",
      width: 120,
      render: (amount: number, record) => {
        const salary = Math.round(amount || record.monthlyIncome || record.basicSalary || 0)
        return `₹${salary.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      },
    },
    {
      title: "Gross Income",
      dataIndex: "grossIncome",
      key: "grossIncome",
      width: 120,
      render: (amount: number) => {
        const rounded = Math.round(amount || 0)
        return `₹${rounded.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      },
    },
    {
      title: "Additions",
      dataIndex: "totalAdditions",
      key: "totalAdditions",
      width: 100,
      render: (amount: number) => {
        const rounded = Math.round(amount || 0)
        return (
          <span className={rounded > 0 ? "text-green-600" : ""}>
            ₹{rounded.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        )
      },
    },
    {
      title: "Deductions",
      dataIndex: "totalDeductions",
      key: "totalDeductions",
      width: 120,
      render: (amount: number) => {
        const rounded = Math.round(amount || 0)
        return (
          <span className={rounded > 0 ? "text-red-600" : ""}>
            ₹{rounded.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        )
      },
    },
    {
      title: "Net Salary",
      dataIndex: "netSalary",
      key: "netSalary",
      width: 120,
      render: (amount: number) => {
        const rounded = Math.round(amount || 0)
        return (
          <span className="font-semibold">₹{rounded.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        )
      },
    },
    {
      title: "Action",
      key: "action",
      width: 120,
      fixed: useFixedColumns ? "right" : undefined,
      render: (_, record) => (
        <Button
          type="primary"
          size="small"
          icon={<EyeOutlined />}
          onClick={(e) => {
            e.stopPropagation()
            onSelectEmployee(record)
          }}
        >
          View
        </Button>
      ),
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
                    const daysAfterRule = record.daysAfterRuleInMonth || daysInMonth
                    const hasRules = daysAfterRule !== daysInMonth
                    return (
                      <span>
                        {daysInMonth < totalDays ? `${daysInMonth} (of ${totalDays})` : daysInMonth}
                        {hasRules && (
                          <span className="text-orange-600 ml-1">
                            → {daysAfterRule.toFixed(1)}
                          </span>
                        )}
                      </span>
                    )
                  },
                },
                {
                  title: "Deduction",
                  dataIndex: "afterRuleDeduction",
                  key: "afterRuleDeduction",
                  render: (amount: number, record: any) => {
                    const rounded = Math.round(amount || record.actualDeduction || 0)
                    return `₹${rounded.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
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
              dataSource={record.leaves}
              pagination={false}
              rowKey="id"
              size="small"
              scroll={{ x: 900 }}
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
                  render: (amount: number, record: any) => {
                    const rounded = Math.round(amount || 0)
                    return (
                      <span className={record.adjustmentType === "Addition" ? "text-green-600" : "text-red-600"}>
                        {record.adjustmentType === "Addition" ? "+" : "-"}₹{rounded.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    )
                  },
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
              scroll={{ x: 700 }}
            />
          </div>
        )}

        {hasBonus && (
          <div>
            <h4 className="font-semibold mb-2">Bonus</h4>
            <div className="p-3 bg-green-50 border border-green-200 rounded">
              <div>
                <p className="text-sm text-gray-600">Bonus Amount</p>
                <p className="text-lg font-semibold text-green-600">+₹{Math.round(record.bonus || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="w-full min-w-0 overflow-x-auto">
      <Table
        columns={columns}
        dataSource={employees}
        rowKey="id"
        pagination={{ pageSize: 10 }}
        onRow={(record) => ({
          onClick: () => onSelectEmployee(record),
          style: { cursor: "pointer" },
        })}
        expandable={{
          expandedRowRender,
          rowExpandable: (record) => 
            !!(record.leaves && record.leaves.length > 0) || 
            !!(record.adjustments && record.adjustments.length > 0) ||
            !!(record.bonus && record.bonus > 0),
        }}
        scroll={{ x: "max-content", y: 520 }}
        className="bg-white rounded-lg shadow"
      />
    </div>
  )
}
