"use client"

import { Table, Tag, Button, Popconfirm, Select } from "antd"
import { DeleteOutlined } from "@ant-design/icons"
import type { ColumnsType } from "antd/es/table"
import type { PayrollSummary } from "@/types"

interface PayrollSummaryListProps {
  summaries: PayrollSummary[]
  onSelectSummary: (summary: PayrollSummary) => void
  onDeleteSummary?: (summaryId: string) => Promise<void>
  isAdmin?: boolean
  onStatusChange?: (summaryId: string, status: "draft" | "paid") => Promise<void>
  isBusy?: boolean
}

export function PayrollSummaryList({ summaries, onSelectSummary, onDeleteSummary, isAdmin = false, onStatusChange, isBusy = false }: PayrollSummaryListProps) {
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
      render: (status: string, record: PayrollSummary) => {
        if (isAdmin && onStatusChange) {
          const safeValue = status === "paid" ? "paid" : "draft"
          return (
            <div onClick={(event) => event.stopPropagation()}>
              <Select
                value={safeValue}
                size="small"
                style={{ minWidth: 110 }}
                disabled={isBusy}
                options={[
                  { value: "draft", label: "Draft" },
                  { value: "paid", label: "Paid" },
                ]}
                onChange={(value) => onStatusChange(record.id, value as "draft" | "paid")}
              />
            </div>
          )
        }

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
          okButtonProps={{ danger: true, loading: isBusy, disabled: isBusy }}
          cancelButtonProps={{ disabled: isBusy }}
        >
          <Button 
            danger 
            icon={<DeleteOutlined />} 
            size="small"
            disabled={isBusy}
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
      scroll={{ x: 900 }}
      onRow={(record) => ({
        onClick: isBusy ? undefined : () => onSelectSummary(record),
        style: { cursor: isBusy ? "not-allowed" : "pointer" },
      })}
      className="bg-card rounded-lg shadow-sm border border-border"
    />
  )
}
