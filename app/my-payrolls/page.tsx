"use client"

import { useState } from "react"
import { Card, Table, Button, Spin, message, Empty } from "antd"
import { EyeOutlined, EyeInvisibleOutlined, FileTextOutlined } from "@ant-design/icons"
import { useQuery } from "@tanstack/react-query"
import type { ColumnsType } from "antd/es/table"
import { PayslipView } from "@/components/payslip-view"
import { PageContainer } from "@/components/page-container"
import { PageHeader } from "@/components/page-header"

interface EmployeePayroll {
  id: string
  employeeId: string
  employeeName: string
  email: string
  department: string
  role: string
  payrollMonth: string
  payrollYear: number
  basicSalary: number
  bonus: number
  totalAdditions: number
  totalDeductions: number
  netSalary: number
  createdDate: string
}

export default function MyPayrollsPage() {
  const [selectedPayroll, setSelectedPayroll] = useState<EmployeePayroll | null>(null)
  const [visibleCellKey, setVisibleCellKey] = useState<string | null>(null)

  const getCellKey = (recordId: string, field: string) => `${recordId}-${field}`

  const maskDigits = (value: string) => value.replace(/[\d,]+(?:\.\d+)?/g, "X,XXX")

  const renderSensitiveValue = (
    record: EmployeePayroll,
    field: string,
    value: string,
    className?: string,
  ) => {
    if (!/\d/.test(value)) {
      return <span className={className}>{value}</span>
    }

    const cellKey = getCellKey(record.id, field)
    const isVisible = visibleCellKey === cellKey

    return (
      <div className="inline-flex items-center gap-1">
        <span className={className}>
          {isVisible ? value : maskDigits(value)}
        </span>
        <Button
          type="text"
          size="small"
          icon={isVisible ? <EyeInvisibleOutlined /> : <EyeOutlined />}
          onClick={() => setVisibleCellKey(isVisible ? null : cellKey)}
          aria-label={isVisible ? "Hide value" : "Show value"}
        />
      </div>
    )
  }

  const { data, isLoading, error } = useQuery({
    queryKey: ["my-payrolls"],
    queryFn: async () => {
      const res = await fetch("/api/payroll/my-payrolls")
      if (!res.ok) throw new Error("Failed to fetch payrolls")
      return res.json()
    },
  })

  const payrolls: EmployeePayroll[] = data?.payrolls || []

  const handleDownloadPDF = async (record: EmployeePayroll) => {
    try {
      message.loading({ content: "Generating PDF...", key: "pdf-download" })
      
      const response = await fetch(`/api/payroll/payslips/${record.id}/download`)
      
      if (!response.ok) {
        throw new Error("Failed to download PDF")
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      
      const contentDisposition = response.headers.get("Content-Disposition")
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/)
      const filename = filenameMatch ? filenameMatch[1] : `Payslip_${record.payrollMonth}_${record.payrollYear}.pdf`
      
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      message.success({ content: "PDF downloaded successfully!", key: "pdf-download" })
    } catch (error) {
      console.error("Error downloading PDF:", error)
      message.error({ content: "Failed to download PDF", key: "pdf-download" })
    }
  }

  const columns: ColumnsType<EmployeePayroll> = [
    {
      title: "Month",
      key: "month",
      width: 120,
      render: (_, record) => (
        <span className="font-semibold">
          {record.payrollMonth} {record.payrollYear}
        </span>
      ),
      sorter: (a, b) => {
        const dateA = new Date(a.createdDate)
        const dateB = new Date(b.createdDate)
        return dateB.getTime() - dateA.getTime()
      },
    },
    {
      title: "Basic Salary",
      dataIndex: "basicSalary",
      key: "basicSalary",
      width: 140,
      render: (amount: number, record) =>
        renderSensitiveValue(record, "basicSalary", `₹${amount.toLocaleString()}`),
    },
    {
      title: "Bonus",
      dataIndex: "bonus",
      key: "bonus",
      width: 130,
      render: (amount: number, record) =>
        renderSensitiveValue(
          record,
          "bonus",
          amount > 0 ? `+₹${amount.toLocaleString()}` : "₹0",
          amount > 0 ? "text-green-600 font-semibold" : undefined,
        ),
    },
    {
      title: "Deductions",
      dataIndex: "totalDeductions",
      key: "totalDeductions",
      width: 140,
      render: (amount: number, record) =>
        renderSensitiveValue(
          record,
          "totalDeductions",
          amount > 0 ? `-₹${amount.toLocaleString()}` : "₹0",
          amount > 0 ? "text-red-600" : undefined,
        ),
    },
    {
      title: "Net Salary",
      dataIndex: "netSalary",
      key: "netSalary",
      width: 140,
      render: (amount: number, record) =>
        renderSensitiveValue(
          record,
          "netSalary",
          `₹${amount.toLocaleString()}`,
          "text-lg font-bold text-green-600",
        ),
    },
    {
      title: "Action",
      key: "action",
      width: 160,
      render: (_, record) => (
        <Button
          type="primary"
          icon={<EyeOutlined />}
          onClick={() => setSelectedPayroll(record)}
        >
          View Payslip
        </Button>
      ),
    },
  ]

  if (selectedPayroll) {
    return (
      <PageContainer>
        <div className="mb-6">
          <Button onClick={() => setSelectedPayroll(null)}>← Back to My Payrolls</Button>
        </div>
        <PayslipView payrollId={selectedPayroll.id} />
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <div className="w-full mx-auto flex-1 flex flex-col bg-white p-3 rounded-xl">
      <PageHeader
        title="My Payslips"
        subtitle="View your salary details and download payslips"
      />

      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <Spin size="large" tip="">
            <div className="min-h-[200px]" />
          </Spin>
        </div>
      ) : error ? (
        <Card>
          <Empty description="Failed to load payrolls. Please try again later." />
        </Card>
      ) : payrolls.length === 0 ? (
        <Card>
          <Empty
            description="No payroll records found"
            image={<FileTextOutlined style={{ fontSize: 64, color: "#d9d9d9" }} />}
          >
            <p className="text-gray-500 mt-2">
              Your payslips will appear here once payroll is processed and marked as Paid by Admin/HR.
            </p>
          </Empty>
        </Card>
      ) : (
        <Card>
          <Table
            columns={columns}
            dataSource={payrolls}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            scroll={{ x: 'max-content' }}
          />
        </Card>
      )}
      </div>
    </PageContainer>
  )
}
