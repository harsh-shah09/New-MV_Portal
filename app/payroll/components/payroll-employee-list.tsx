"use client"

import { Table } from "antd"
import type { ColumnsType } from "antd/es/table"
import type { PayrollEmployeeDetail } from "@/types"

interface PayrollEmployeeListProps {
  employees: PayrollEmployeeDetail[]
  month: string
  year: number
  onSelectEmployee: (employee: PayrollEmployeeDetail) => void
}

export function PayrollEmployeeList({ employees, month, year, onSelectEmployee }: PayrollEmployeeListProps) {
  const columns: ColumnsType<PayrollEmployeeDetail> = [
    {
      title: "Employee Name",
      dataIndex: "employeeName",
      key: "employeeName",
    },
    {
      title: "Month",
      key: "month",
      render: () => `${month} ${year}`,
    },
    {
      title: "Net Salary",
      dataIndex: "netSalary",
      key: "netSalary",
      render: (amount: number) => `$${amount.toLocaleString()}`,
    },
  ]

  return (
    <Table
      columns={columns}
      dataSource={employees}
      rowKey="id"
      pagination={{ pageSize: 10 }}
      onRow={(record) => ({
        onClick: () => onSelectEmployee(record),
        style: { cursor: "pointer" },
      })}
      className="bg-white rounded-lg shadow"
    />
  )
}
