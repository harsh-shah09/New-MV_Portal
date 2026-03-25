"use client"

import { Card, Table, Badge } from "antd"
import { ClockCircleOutlined } from "@ant-design/icons"
import { useRouter } from "next/navigation"
import type { ColumnsType } from 'antd/es/table'
import dayjs from "dayjs"

interface RecentLeavesProps {
  recentLeaves: any[]
}

export function RecentLeaves({ recentLeaves }: RecentLeavesProps) {
  const router = useRouter()

  const getStatusMeta = (rawStatus: any) => {
    const normalizedStatus = String(rawStatus || "")
      .trim()
      .toLowerCase()
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")

    const statusMap: Record<string, "success" | "warning" | "processing" | "error" | "default"> = {
      approved: "success",
      pending: "warning",
      applied: "processing",
      rejected: "error",
      cancelled: "default",
      withdrawn: "default",
      "withdrawal pending": "warning",
    }

    const label = normalizedStatus
      ? normalizedStatus.replace(/\b\w/g, (char) => char.toUpperCase())
      : "N/A"

    return {
      status: statusMap[normalizedStatus] || "default",
      label,
    }
  }

  const leaveColumns: ColumnsType<any> = [
    {
      title: 'Type',
      dataIndex: 'leaveType',
      key: 'leaveType',
      render: (text) => <span className="capitalize">{text || 'N/A'}</span>
    },
    {
      title: 'Start Date',
      dataIndex: 'startDate',
      key: 'startDate',
      render: (date) => dayjs(date).format('MMM DD, YYYY')
    },
    {
      title: 'End Date',
      dataIndex: 'endDate',
      key: 'endDate',
      render: (date) => dayjs(date).format('MMM DD, YYYY')
    },
    {
      title: 'Duration',
      dataIndex: 'duration',
      key: 'duration',
      render: (duration) => `${duration} day(s)`
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const statusMeta = getStatusMeta(status)
        return <Badge status={statusMeta.status} text={statusMeta.label} />
      }
    }
  ]

  return (
    <Card 
      className="cursor-pointer"
      onClick={() => router.push('/leaves')}
      title={
        <span className="flex items-center gap-2">
          <ClockCircleOutlined />
          Recent Leaves
        </span>
      }
    >
      <Table 
        dataSource={recentLeaves.slice(0, 5)}
        columns={leaveColumns}
        pagination={false}
        rowKey="id"
        scroll={{x: 'max-content'}}
      />
    </Card>
  )
}
