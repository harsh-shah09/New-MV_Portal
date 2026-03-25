"use client"

import { Card, Table, Badge } from "antd"
import { FileDoneOutlined } from "@ant-design/icons"
import type { ColumnsType } from 'antd/es/table'
import dayjs from "dayjs"

interface PendingRequestsProps {
  pendingRequests: any[]
}

export function PendingRequests({ pendingRequests }: PendingRequestsProps) {
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
      title={
        <span className="flex items-center gap-2">
          <FileDoneOutlined />
          Pending Requests
        </span>
      }
      extra={
        pendingRequests.length > 0 && (
          <Badge count={pendingRequests.length} style={{ backgroundColor: '#f59e0b' }} />
        )
      }
      className="h-full"
    >
      {pendingRequests.length > 0 ? (
        <Table 
          dataSource={pendingRequests}
          columns={leaveColumns}
          pagination={false}
          size="small"
          scroll={{x: 'max-content'}}
        />
      ) : (
        <div className="text-center py-8 text-gray-500">
          <FileDoneOutlined style={{ fontSize: 48, opacity: 0.3 }} />
          <p className="mt-2">No pending requests</p>
        </div>
      )}
    </Card>
  )
}
