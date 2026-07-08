"use client"

import { useState } from "react"
import { Card, Table, Button, Spin, message, Empty, Tag } from "antd"
import { MailOutlined, FileTextOutlined, CalendarOutlined } from "@ant-design/icons"
import { useQuery } from "@tanstack/react-query"
import type { ColumnsType } from "antd/es/table"
import { PageContainer } from "@/components/page-container"
import { PageHeader } from "@/components/page-header"

interface PayrollRecord {
  id: string
  payrollMonth: string
  payrollYear: number
  createdDate: string
}

export default function MyPayrollsPage() {
  const [sendingId, setSendingId] = useState<string | null>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ["my-payrolls"],
    queryFn: async () => {
      const res = await fetch("/api/payroll/my-payrolls")
      if (!res.ok) throw new Error("Failed to fetch payrolls")
      return res.json()
    },
  })

  const payrolls: PayrollRecord[] = data?.payrolls || []

  const handleSendEmail = async (record: PayrollRecord) => {
    setSendingId(record.id)
    try {
      const res = await fetch(`/api/payroll/payslips/${record.id}/email`, {
        method: "POST",
      })

      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.error || "Failed to send payslip email")
      }

      message.success({
        content: `Payslip for ${record.payrollMonth} ${record.payrollYear} has been sent to your registered email.`,
        duration: 5,
      })
    } catch (err: any) {
      console.error("Error sending payslip email:", err)
      message.error({
        content: err.message || "Failed to send payslip email. Please try again.",
        duration: 5,
      })
    } finally {
      setSendingId(null)
    }
  }

  const columns: ColumnsType<PayrollRecord> = [
    {
      title: "Month",
      key: "month",
      render: (_, record) => (
        <div className="flex items-center gap-2">
          <CalendarOutlined className="text-indigo-500" />
          <span className="font-semibold text-gray-800">
            {record.payrollMonth}
          </span>
        </div>
      ),
    },
    {
      title: "Year",
      key: "year",
      width: 120,
      render: (_, record) => (
        <Tag color="blue" style={{ fontWeight: 600, fontSize: 14, padding: "2px 10px" }}>
          {record.payrollYear}
        </Tag>
      ),
    },
    {
      title: "Action",
      key: "action",
      width: 200,
      render: (_, record) => (
        <Button
          type="primary"
          icon={<MailOutlined />}
          loading={sendingId === record.id}
          disabled={sendingId !== null && sendingId !== record.id}
          onClick={() => handleSendEmail(record)}
          style={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            border: "none",
            borderRadius: 8,
            fontWeight: 600,
          }}
        >
          Get via Email
        </Button>
      ),
    },
  ]

  return (
    <PageContainer>
      <div className="w-full mx-auto flex-1 flex flex-col bg-white p-3 rounded-xl">
        <PageHeader
          title="My Payslips"
          subtitle="Request your payslip to be sent securely to your registered email address"
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
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
              <MailOutlined className="text-blue-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-700 m-0">
                Click <strong>&quot;Get via Email&quot;</strong> to receive your payslip securely in your registered email inbox.
                Salary details are never shown on screen for your privacy.
              </p>
            </div>
            <Table
              columns={columns}
              dataSource={payrolls}
              rowKey="id"
              pagination={{ pageSize: 10 }}
              scroll={{ x: "max-content" }}
            />
          </Card>
        )}
      </div>
    </PageContainer>
  )
}
