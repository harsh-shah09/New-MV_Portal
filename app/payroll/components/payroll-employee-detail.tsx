"use client"

import { Descriptions, Card, Button } from "antd"
import { ArrowLeftOutlined } from "@ant-design/icons"
import type { PayrollEmployeeDetail } from "@/types"

interface PayrollEmployeeDetailViewProps {
  employee: PayrollEmployeeDetail
  onBack: () => void
}

export function PayrollEmployeeDetailView({ employee, onBack }: PayrollEmployeeDetailViewProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button icon={<ArrowLeftOutlined />} onClick={onBack}>
          Back
        </Button>
        <h2 className="text-2xl font-bold text-gray-900">Payroll Details</h2>
      </div>

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
          <Descriptions.Item label="Basic Salary">${employee.basicSalary.toLocaleString()}</Descriptions.Item>
          <Descriptions.Item label="Total Additions">${employee.totalAdditions.toLocaleString()}</Descriptions.Item>
          <Descriptions.Item label="Total Deductions">${employee.totalDeductions.toLocaleString()}</Descriptions.Item>
          <Descriptions.Item label="Bonus">${employee.bonus.toLocaleString()}</Descriptions.Item>
          <Descriptions.Item label="Net Salary">
            <span className="text-xl font-bold text-green-600">${employee.netSalary.toLocaleString()}</span>
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  )
}
