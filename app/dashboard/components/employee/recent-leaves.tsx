"use client"

import { Card, Table, Button, Badge } from "antd"
import { ClockCircleOutlined } from "@ant-design/icons"
import { useRouter } from "next/navigation"
import type { ColumnsType } from 'antd/es/table'
import dayjs from "dayjs"

interface RecentLeavesProps {
  recentLeaves: any[]
}

export function RecentLeaves({ recentLeaves }: RecentLeavesProps) {
  const router = useRouter()

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
        const colors: any = {
          approved: 'success',
          pending: 'warning',
          applied: 'processing',
          rejected: 'error',
          cancelled: 'default',
          withdrawn: 'default'
        }
        return <Badge status={colors[status]} text={status.charAt(0).toUpperCase() + status.slice(1)} />
      }
    }
  ]

  return (
    <Card 
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
      />
      {recentLeaves.length > 5 && (
        <div className="text-center mt-4">
          <Button type="link" onClick={() => router.push('/leaves')}>
            View All Leaves
          </Button>
        </div>
      )}
    </Card>
  )
}
