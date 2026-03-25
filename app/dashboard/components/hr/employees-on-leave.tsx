"use client"

import { Card, Avatar, Empty, Tooltip } from "antd"
import { UserOutlined, CalendarOutlined, InfoCircleOutlined } from "@ant-design/icons"
import dayjs from "dayjs"

interface EmployeesOnLeaveProps {
  employeesOnLeave: any[]
}

export function EmployeesOnLeave({ employeesOnLeave }: EmployeesOnLeaveProps) {
  return (
    <Card 
      title={
        <span className="flex items-center gap-2">
          <UserOutlined />
          Employees On Leave Today ({employeesOnLeave.length})
          <Tooltip title="Employees with approved leave for today are listed here." placement="top">
            <InfoCircleOutlined className="text-slate-400 hover:text-slate-600" />
          </Tooltip>
        </span>
      }
      className="h-full"
    >
      {employeesOnLeave.length > 0 ? (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {employeesOnLeave.map((employee: any) => (
            <div 
              key={employee.id} 
              className="p-3 bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg border border-orange-200 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-3">
                <Avatar 
                  size={40} 
                  icon={<UserOutlined />} 
                  className="bg-orange-500 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 truncate">
                    {employee.employeeName}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                    <CalendarOutlined className="text-orange-500" />
                    <span className="capitalize">{employee.leaveType}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {dayjs(employee.startDate).format('MMM DD')} - {dayjs(employee.endDate).format('MMM DD, YYYY')}
                    {employee.duration > 1 && ` • ${employee.duration} days`}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Empty 
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="No employees on leave today"
          className="py-8"
        />
      )}
    </Card>
  )
}
