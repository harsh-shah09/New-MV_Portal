"use client"

import { useState } from "react"
import { Descriptions, Card, Button, Tabs } from "antd"
import { ArrowLeftOutlined, FileTextOutlined } from "@ant-design/icons"
import type { PayrollEmployeeDetail } from "@/types"
import { PayslipView } from "@/components/payslip-view"

interface PayrollEmployeeDetailViewProps {
  employee: PayrollEmployeeDetail
  onBack: () => void
}

export function PayrollEmployeeDetailView({ employee, onBack }: PayrollEmployeeDetailViewProps) {
  const [activeTab, setActiveTab] = useState("summary")

  const tabItems = [
    {
      key: "summary",
      label: "Summary",
      children: (
        <Card className="shadow-lg">
          <Descriptions
            title={`${employee.employeeName} - ${employee.payrollMonth} ${employee.year}`}
            bordered
            column={1}
            labelStyle={{ fontWeight: "600", width: "200px" }}
          >
            <Descriptions.Item label="Employee Name">{employee.employeeName}</Descriptions.Item>
            <Descriptions.Item label="Payroll Month">
              {employee.payrollMonth} {employee.year}
            </Descriptions.Item>
            <Descriptions.Item label="Basic Salary">₹{employee.basicSalary?.toLocaleString() || 0}</Descriptions.Item>
            <Descriptions.Item label="Total Additions">₹{employee.totalAdditions?.toLocaleString() || 0}</Descriptions.Item>
            <Descriptions.Item label="Total Deductions">₹{employee.totalDeductions?.toLocaleString() || 0}</Descriptions.Item>
            <Descriptions.Item label="Bonus">₹{employee.bonus?.toLocaleString() || 0}</Descriptions.Item>
            <Descriptions.Item label="Net Salary">
              <span className="text-xl font-bold text-green-600">₹{employee.netSalary?.toLocaleString() || 0}</span>
            </Descriptions.Item>
          </Descriptions>
        </Card>
      ),
    },
    {
      key: "payslip",
      label: (
        <span>
          <FileTextOutlined /> Payslip
        </span>
      ),
      children: <PayslipView payrollId={employee.id} />,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button icon={<ArrowLeftOutlined />} onClick={onBack}>
          Back
        </Button>
        <h2 className="text-2xl font-bold text-gray-900">Payroll Details</h2>
      </div>

      <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
    </div>
  )
}
