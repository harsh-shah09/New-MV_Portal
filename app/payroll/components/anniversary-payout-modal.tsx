"use client"

import { useState } from "react"
import { Modal, Table, Button, Tag, message } from "antd"
import type { ColumnsType } from "antd/es/table"
import dayjs from "dayjs"

interface AnniversaryRecord {
  employeeId: string
  employeeCode: string
  employeeName: string
  onboardingDate: string
  yearsCompleted: number
  anniversaryDate: string
  amount: number
  status: "Overdue" | "Due"
}

interface AnniversaryPayoutModalProps {
  open: boolean
  onClose: () => void
  anniversaries: AnniversaryRecord[]
  month: string
  year: number
  onProceed: () => void
}

export function AnniversaryPayoutModal({
  open,
  onClose,
  anniversaries,
  month,
  year,
  onProceed,
}: AnniversaryPayoutModalProps) {
  const [payingKey, setPayingKey] = useState<string | null>(null)
  const [paidAnniversaries, setPaidAnniversaries] = useState<Set<string>>(new Set())

  const formatCurrency = (value: number) => {
    return `₹${Math.round(value).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
  }

  const handleMarkPaid = async (record: AnniversaryRecord) => {
    const key = `${record.employeeId}_${record.anniversaryDate}`
    setPayingKey(key)

    try {
      const response = await fetch("/api/payroll/anniversaries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          employeeId: record.employeeId,
          anniversaryDate: record.anniversaryDate,
          amount: record.amount,
          month,
          year,
        }),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err?.error || "Failed to mark anniversary as paid")
      }

      message.success(`Marked payout as paid manually for ${record.employeeName}`)
      setPaidAnniversaries((prev) => {
        const next = new Set(prev)
        next.add(key)
        return next
      })
    } catch (error: any) {
      console.error("Error marking anniversary as paid:", error)
      message.error(error?.message || "Failed to mark anniversary as paid")
    } finally {
      setPayingKey(null)
    }
  }

  const columns: ColumnsType<AnniversaryRecord> = [
    {
      title: "Employee Name",
      dataIndex: "employeeName",
      key: "employeeName",
      render: (name: string, record) => (
        <div>
          <span className="font-semibold text-slate-800">{name}</span>
          <span className="block text-[10px] text-slate-500">ID: {record.employeeCode}</span>
        </div>
      ),
    },
    {
      title: "Onboarding Date",
      dataIndex: "onboardingDate",
      key: "onboardingDate",
      render: (date: string) => dayjs(date).format("DD MMM YYYY"),
    },
    {
      title: "Anniversary Date",
      dataIndex: "anniversaryDate",
      key: "anniversaryDate",
      render: (date: string, record) => (
        <div>
          <span className="font-medium text-slate-700">{dayjs(date).format("DD MMM YYYY")}</span>
          <span className="block text-[10px] text-blue-600 font-medium">
            ({record.yearsCompleted} {record.yearsCompleted === 1 ? "Year" : "Years"} Completed)
          </span>
        </div>
      ),
    },
    {
      title: "Payout Amount (18 Days)",
      dataIndex: "amount",
      key: "amount",
      render: (amount: number) => (
        <span className="font-bold text-slate-800">{formatCurrency(amount)}</span>
      ),
    },
    {
      title: "Status",
      key: "status",
      render: (_, record) => {
        const key = `${record.employeeId}_${record.anniversaryDate}`
        if (paidAnniversaries.has(key)) {
          return <Tag color="green">Paid Offline</Tag>
        }
        return record.status === "Overdue" ? (
          <Tag color="volcano">Overdue</Tag>
        ) : (
          <Tag color="blue">Due</Tag>
        )
      },
    },
    {
      title: "Action",
      key: "action",
      render: (_, record) => {
        const key = `${record.employeeId}_${record.anniversaryDate}`
        const isPaid = paidAnniversaries.has(key)
        const isPaying = payingKey === key

        return (
          <Button
            type="primary"
            size="small"
            onClick={() => handleMarkPaid(record)}
            loading={isPaying}
            disabled={isPaid || payingKey !== null}
            className={isPaid ? "bg-slate-100 text-slate-400 border-slate-200" : ""}
          >
            {isPaid ? "Paid" : "Mark as Paid"}
          </Button>
        )
      },
    },
  ]

  return (
    <Modal
      title={
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <span className="text-base font-bold text-slate-800">
            Work Anniversaries for {month} {year}
          </span>
        </div>
      }
      open={open}
      onCancel={onClose}
      closable={payingKey === null}
      maskClosable={false}
      width={780}
      centered
      footer={[
        <Button key="close" onClick={onClose} disabled={payingKey !== null}>
          Cancel
        </Button>,
        <Button
          key="proceed"
          type="primary"
          onClick={onProceed}
          disabled={payingKey !== null}
        >
          Proceed to Payroll Preview
        </Button>,
      ]}
    >
      <div className="py-4 space-y-4">
        <p className="text-slate-600 text-xs sm:text-sm">
          The following employees completed their work anniversary on or before <b>{month} {year}</b> and have unpaid 18-day leave payouts. 
          Please review them and <b>Mark as Paid</b> if you have paid them manually offline. 
          Unmarked employees will continue to show up in subsequent month's payroll popups.
        </p>

        <Table
          columns={columns}
          dataSource={anniversaries}
          rowKey={(record) => `${record.employeeId}_${record.anniversaryDate}`}
          pagination={false}
          size="middle"
          scroll={{ x: 620 }}
          bordered
          className="border border-slate-100 rounded-lg overflow-hidden"
        />
      </div>
    </Modal>
  )
}
