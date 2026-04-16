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
            column={{ xs: 1, sm: 1, md: 1, lg: 1 }}
            size="small"
            labelStyle={{ fontWeight: "600", width: "140px" }}
          >
            <Descriptions.Item label="Employee Name">{employee.employeeName}</Descriptions.Item>
            <Descriptions.Item label="Payroll Month">
              {employee.payrollMonth} {employee.year}
            </Descriptions.Item>
            <Descriptions.Item label="Monthly Income">₹{employee.monthlyIncome?.toLocaleString() || employee.basicSalary?.toLocaleString() || 0}</Descriptions.Item>
            <Descriptions.Item label="Basic Component">₹{employee.basicComponent?.toLocaleString() || 0}</Descriptions.Item>
            <Descriptions.Item label="HRA">₹{employee.hraComponent?.toLocaleString() || 0}</Descriptions.Item>
            <Descriptions.Item label="Conveyance">₹{employee.convComponent?.toLocaleString() || 0}</Descriptions.Item>
            <Descriptions.Item label="Special Allowance">₹{employee.specialAllowanceComponent?.toLocaleString() || 0}</Descriptions.Item>
            <Descriptions.Item label="Gross Income">₹{employee.grossIncome?.toLocaleString() || 0}</Descriptions.Item>
            <Descriptions.Item label="PF Deduction">₹{employee.pfDeduction?.toLocaleString() || 0}</Descriptions.Item>
            <Descriptions.Item label="PT Deduction">₹{employee.ptDeduction?.toLocaleString() || 0}</Descriptions.Item>
            <Descriptions.Item label="ESI Deduction">₹{employee.esiDeduction?.toLocaleString() || 0}</Descriptions.Item>
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
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <Button icon={<ArrowLeftOutlined />} onClick={onBack} className="w-full sm:w-auto">
          Back
        </Button>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 break-words">Payroll Details</h2>
      </div>

      <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
    </div>
  )
}
