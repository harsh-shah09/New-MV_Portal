import { useState } from "react"
import { Card, Form, InputNumber, Button, Descriptions, Divider, Typography } from "antd"
import { CalculatorOutlined } from "@ant-design/icons"

interface SalaryCalculationInput {
  basicSalary: number
  allowances?: number
  deductions?: number
  taxRate?: number
}

interface SalaryBreakdown {
  basicSalary: number
  allowances: number
  grossSalary: number
  taxAmount: number
  deductions: number
  netSalary: number
}

interface SalaryCalculatorProps {
  onCalculate: (breakdown: SalaryBreakdown) => void
}

const { Title, Text } = Typography

export function SalaryCalculator({ onCalculate }: SalaryCalculatorProps) {
  const [breakdown, setBreakdown] = useState<SalaryBreakdown | null>(null)
  const [form] = Form.useForm()

  const calculateSalary = (values: any) => {
    const input: SalaryCalculationInput = values
    const allowances = input.allowances || 0
    const deductions = input.deductions || 0
    const taxRate = (input.taxRate || 15) / 100

    const grossSalary = input.basicSalary + allowances
    const taxableAmount = grossSalary - deductions
    const taxAmount = taxableAmount * taxRate
    const netSalary = grossSalary - taxAmount - deductions

    const result: SalaryBreakdown = {
      basicSalary: input.basicSalary,
      allowances,
      grossSalary,
      taxAmount,
      deductions,
      netSalary,
    }

    setBreakdown(result)
    onCalculate(result)
  }

  return (
    <Card title={<><CalculatorOutlined /> Salary Calculator</>} className="mb-6 shadow-sm">
      <Form
        form={form}
        layout="vertical"
        onFinish={calculateSalary}
        initialValues={{ taxRate: 15 }}
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Form.Item name="basicSalary" label="Basic Salary" rules={[{ required: true, message: 'Required' }]}>
                <InputNumber
                    className="w-full"
                    formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={(value) => value?.replace(/\$\s?|(,*)/g, '') as any}
                    min={0}
                />
            </Form.Item>
            <Form.Item name="allowances" label="Allowances">
                <InputNumber
                    className="w-full"
                    formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={(value) => value?.replace(/\$\s?|(,*)/g, '') as any}
                    min={0}
                />
            </Form.Item>
            <Form.Item name="deductions" label="Deductions">
                <InputNumber
                    className="w-full"
                    formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={(value) => value?.replace(/\$\s?|(,*)/g, '') as any}
                    min={0}
                />
            </Form.Item>
            <Form.Item name="taxRate" label="Tax Rate (%)">
                <InputNumber className="w-full" min={0} max={100} />
            </Form.Item>
        </div>
        
        <Button type="primary" htmlType="submit" icon={<CalculatorOutlined />} block>
            Calculate Salary
        </Button>
      </Form>

      {breakdown && (
        <div className="mt-6 bg-gray-50 p-4 rounded-lg border border-gray-100">
          <Title level={5} style={{ marginBottom: 16 }}>Breakdown</Title>
          <Descriptions column={{ xs: 1, sm: 2, md: 3 }} size="small">
              <Descriptions.Item label="Basic Salary">${breakdown.basicSalary.toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="Allowances"><Text type="success">+${breakdown.allowances.toLocaleString()}</Text></Descriptions.Item>
              <Descriptions.Item label="Gross Salary"><strong>${breakdown.grossSalary.toLocaleString()}</strong></Descriptions.Item>
              <Descriptions.Item label="Tax Amount"><Text type="danger">-${breakdown.taxAmount.toLocaleString()}</Text></Descriptions.Item>
              <Descriptions.Item label="Deductions"><Text type="danger">-${breakdown.deductions.toLocaleString()}</Text></Descriptions.Item>
          </Descriptions>
          <Divider style={{ margin: '12px 0' }} />
          <div className="flex justify-between items-center">
             <Text strong style={{ fontSize: 16 }}>Net Salary</Text>
             <Text strong style={{ fontSize: 24, color: '#1890ff' }}>${breakdown.netSalary.toLocaleString()}</Text>
          </div>
        </div>
      )}
    </Card>
  )
}
