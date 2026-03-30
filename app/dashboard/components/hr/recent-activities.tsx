"use client"

import { Card, Table } from "antd"
import { 
  ClockCircleOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined
} from "@ant-design/icons"
import type { ColumnsType } from 'antd/es/table'
import dayjs from "dayjs"
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

interface RecentActivitiesProps {
  recentActivities: any[]
}

export function RecentActivities({ recentActivities }: RecentActivitiesProps) {
  const activityColumns: ColumnsType<any> = [
    {
      title: 'Activity',
      dataIndex: 'message',
      key: 'message',
      width: 320,
      render: (text, record) => (
        <div className="flex items-center gap-2">
          {record.type === 'leave' && <CalendarOutlined className="text-blue-500" />}
          {record.type === 'approval' && <CheckCircleOutlined className="text-green-500" />}
          {record.type === 'rejection' && <CloseCircleOutlined className="text-red-500" />}
          <span>{text}</span>
        </div>
      )
    },
    {
      title: 'Time',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 120,
      render: (timestamp) => dayjs(timestamp).fromNow()
    }
  ]

  return (
    <Card 
      title={
        <span className="flex items-center gap-2">
          <ClockCircleOutlined />
          Recent Activities
        </span>
      }
      className="h-full"
    >
      <Table 
        dataSource={recentActivities.slice(0, 10)}
        columns={activityColumns}
        pagination={false}
        size="small"
        rowKey="id"
        scroll={{ x: 520 }}
      />
    </Card>
  )
}
