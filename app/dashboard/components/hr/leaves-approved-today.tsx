"use client"

import { Card, Avatar, Empty, Tooltip } from "antd"
import { CheckCircleOutlined, CalendarOutlined, UserOutlined, InfoCircleOutlined } from "@ant-design/icons"
import dayjs from "dayjs"

interface LeavesApprovedTodayProps {
  approvedTodayLeaves: any[]
}

export function LeavesApprovedToday({ approvedTodayLeaves }: LeavesApprovedTodayProps) {
  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          <CheckCircleOutlined />
          Leaves Approved Today ({approvedTodayLeaves.length})
          <Tooltip title="Leaves approved today by HR/Admin are shown here." placement="top">
            <InfoCircleOutlined className="text-slate-400 hover:text-slate-600" />
          </Tooltip>
        </span>
      }
      className="h-full"
    >
      {approvedTodayLeaves.length > 0 ? (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {approvedTodayLeaves.map((leave: any) => (
            <div
              key={leave.id}
              className="p-3 bg-gradient-to-r from-green-50 to-green-100 rounded-lg border border-green-200 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-3">
                <Avatar
                  size={40}
                  icon={<UserOutlined />}
                  className="bg-green-500 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 truncate">{leave.employeeName}</div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                    <CalendarOutlined className="text-green-600" />
                    <span className="capitalize">{leave.leaveType}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {dayjs(leave.startDate).format("MMM DD")} - {dayjs(leave.endDate).format("MMM DD, YYYY")}
                    {leave.duration > 1 && ` • ${leave.duration} days`}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="No leaves approved today"
          className="py-8"
        />
      )}
    </Card>
  )
}
