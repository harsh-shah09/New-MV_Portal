"use client"

import { Table, Tag } from "antd"
import type { ColumnsType } from "antd/es/table"
import type { PayrollSummary } from "@/types"

interface PayrollSummaryListProps {
  summaries: PayrollSummary[]
  onSelectSummary: (summary: PayrollSummary) => void
}

export function PayrollSummaryList({ summaries, onSelectSummary }: PayrollSummaryListProps) {
  const columns: ColumnsType<PayrollSummary> = [
    {
      title: "Month",
      dataIndex: "month",
      key: "month",
      render: (month: string, record: PayrollSummary) => `${month} ${record.year}`,
    },
    {
      title: "Year",
      dataIndex: "year",
      key: "year",
    },
    {
      title: "Total Employees",
      dataIndex: "totalEmployees",
      key: "totalEmployees",
    },
    {
      title: "Net Total Salary",
      dataIndex: "netTotalSalary",
      key: "netTotalSalary",
      render: (amount: number) => `₹${amount.toLocaleString()}`,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: string) => {
        let color = "default"
        if (status === "paid") color = "green"
        else if (status === "processed") color = "blue"
        else if (status === "draft") color = "orange"
        return <Tag color={color}>{status.toUpperCase()}</Tag>
      },
    },
  ]

  return (
    <Table
      columns={columns}
      dataSource={summaries}
      rowKey="id"
      pagination={{ pageSize: 10 }}
      onRow={(record) => ({
        onClick: () => onSelectSummary(record),
        style: { cursor: "pointer" },
      })}
      className="bg-white rounded-lg shadow"
    />
  )
}
