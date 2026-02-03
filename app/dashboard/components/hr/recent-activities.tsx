"use client"

import { Table } from "antd"
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
      render: (text, record) => (
        <div className="flex items-center gap-3">
            <div className={`p-1.5 rounded-full flex-shrink-0 ${
                record.type === 'leave' ? 'bg-blue-100 text-blue-600' :
                record.type === 'approval' ? 'bg-green-100 text-green-600' :
                'bg-red-100 text-red-600'
            }`}>
              {record.type === 'leave' && <CalendarOutlined />}
              {record.type === 'approval' && <CheckCircleOutlined />}
              {record.type === 'rejection' && <CloseCircleOutlined />}
            </div>
          <span className="font-medium text-slate-700">{text}</span>
        </div>
      )
    },
    {
      title: 'Time',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 150,
      render: (timestamp) => (
          <span className="text-xs text-slate-400 font-medium whitespace-nowrap">
              {dayjs(timestamp).fromNow()}
          </span>
      )
    }
  ]

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 h-full hover:shadow-md transition-shadow duration-300 flex flex-col">
       <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-50">
          <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
              <ClockCircleOutlined className="text-xl" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">Recent Activities</h3>
            <p className="text-xs text-slate-500 font-medium">Latest System Updates</p>
          </div>
      </div>
      
      <div className="flex-1 overflow-hidden">
          <Table 
            dataSource={recentActivities.slice(0, 10)}
            columns={activityColumns}
            pagination={false}
            size="middle" // Slightly larger row height for better look
            rowKey="id"
            className="custom-table"
            showHeader={false} // Clean look
            scroll={{ y: 300 }}
          />
      </div>
    </div>
  )
}
