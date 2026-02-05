"use client"

import { Table, Tag, Button, Popconfirm, message } from "antd"
import { DeleteOutlined } from "@ant-design/icons"
import type { ColumnsType } from "antd/es/table"
import type { PayrollSummary } from "@/types"

interface PayrollSummaryListProps {
  summaries: PayrollSummary[]
  onSelectSummary: (summary: PayrollSummary) => void
  onDeleteSummary?: (summaryId: string) => Promise<void>
}

export function PayrollSummaryList({ summaries, onSelectSummary, onDeleteSummary }: PayrollSummaryListProps) {
  const handleDelete = async (summaryId: string, event: React.MouseEvent) => {
    event.stopPropagation() // Prevent row click
    
    if (onDeleteSummary) {
      try {
        await onDeleteSummary(summaryId)
      } catch (error) {
        console.error("Delete error:", error)
      }
    }
  }

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
    {
      title: "Actions",
      key: "actions",
      width: 100,
      render: (_: any, record: PayrollSummary) => (
        <Popconfirm
          title="Delete Payroll Summary"
          description={
            <div>
              <p>Are you sure you want to delete this payroll summary?</p>
              <p className="text-red-600 font-semibold mt-2">
                This will delete:
              </p>
              <ul className="text-sm mt-1">
                <li>• All employee payroll records</li>
                <li>• All payslip documents</li>
                <li>• All PDF files from storage</li>
              </ul>
              <p className="text-red-600 font-semibold mt-2">This action cannot be undone!</p>
            </div>
          }
          onConfirm={(e) => handleDelete(record.id, e as any)}
          okText="Yes, Delete"
          cancelText="Cancel"
          okButtonProps={{ danger: true }}
        >
          <Button 
            danger 
            icon={<DeleteOutlined />} 
            size="small"
            onClick={(e) => e.stopPropagation()}
          >
            Delete
          </Button>
        </Popconfirm>
      ),
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
      className="bg-card rounded-lg shadow-sm border border-border"
    />
  )
}
