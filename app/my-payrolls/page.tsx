"use client"

import { useState } from "react"
import { Card, Table, Button, Spin, message, Empty } from "antd"
import { EyeOutlined, FileTextOutlined } from "@ant-design/icons"
import { useQuery } from "@tanstack/react-query"
import type { ColumnsType } from "antd/es/table"
import { PayslipView } from "@/components/payslip-view"

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

  const { data, isLoading, error } = useQuery({
    queryKey: ["my-payrolls"],
    queryFn: async () => {
      const res = await fetch("/api/payroll/my-payrolls")
      if (!res.ok) throw new Error("Failed to fetch payrolls")
      return res.json()
    },
  })

  const payrolls: EmployeePayroll[] = data?.payrolls || []

  const columns: ColumnsType<EmployeePayroll> = [
    {
      title: "Month",
      key: "month",
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
      render: (amount: number) => `$${amount.toLocaleString()}`,
    },
    {
      title: "Bonus",
      dataIndex: "bonus",
      key: "bonus",
      render: (amount: number) => (
        <span className={amount > 0 ? "text-green-600 font-semibold" : ""}>
          {amount > 0 ? `+$${amount.toLocaleString()}` : "-"}
        </span>
      ),
    },
    {
      title: "Deductions",
      dataIndex: "totalDeductions",
      key: "totalDeductions",
      render: (amount: number) => (
        <span className={amount > 0 ? "text-red-600" : ""}>
          {amount > 0 ? `-$${amount.toLocaleString()}` : "-"}
        </span>
      ),
    },
    {
      title: "Net Salary",
      dataIndex: "netSalary",
      key: "netSalary",
      render: (amount: number) => (
        <span className="text-lg font-bold text-green-600">
          ${amount.toLocaleString()}
        </span>
      ),
    },
    {
      title: "Action",
      key: "action",
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Button onClick={() => setSelectedPayroll(null)}>← Back to My Payrolls</Button>
        </div>
        <PayslipView payrollId={selectedPayroll.id} />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">My Payslips</h1>
        <p className="text-gray-600">View your salary details and download payslips</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <Spin size="large" tip="Loading your payrolls..." />
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
              Your payroll records will appear here once processed by HR.
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
          />
        </Card>
      )}
    </div>
  )
}
