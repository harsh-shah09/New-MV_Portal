"use client"

import { Card, Progress } from "antd"
import { BarChartOutlined } from "@ant-design/icons"

interface LeaveAnalyticsProps {
  leaveAnalytics: {
    plannedLeaves?: number
    plannedLeavePercentage?: number
    sickLeaves?: number
    sickLeavePercentage?: number
    emergencyLeaves?: number
    emergencyLeavePercentage?: number
    extraDayPay?: number
    extraDayPayPercentage?: number
  }
}

export function LeaveAnalytics({ leaveAnalytics }: LeaveAnalyticsProps) {
  return (
    <Card 
      title={
        <span className="flex items-center gap-2">
          <BarChartOutlined />
          Leave Analytics
        </span>
      }
      className="h-full"
    >
      <div className="space-y-4">
        <div>
          <div className="flex justify-between mb-2">
            <span className="text-gray-600">Planned Leaves</span>
            <span className="font-semibold">{leaveAnalytics.plannedLeaves || 0}</span>
          </div>
          <Progress 
            percent={leaveAnalytics.plannedLeavePercentage || 0} 
            strokeColor="#3b82f6"
          />
        </div>
        <div>
          <div className="flex justify-between mb-2">
            <span className="text-gray-600">Sick Leaves</span>
            <span className="font-semibold">{leaveAnalytics.sickLeaves || 0}</span>
          </div>
          <Progress 
            percent={leaveAnalytics.sickLeavePercentage || 0} 
            strokeColor="#ef4444"
          />
        </div>
        <div>
          <div className="flex justify-between mb-2">
            <span className="text-gray-600">Emergency Leaves</span>
            <span className="font-semibold">{leaveAnalytics.emergencyLeaves || 0}</span>
          </div>
          <Progress 
            percent={leaveAnalytics.emergencyLeavePercentage || 0} 
            strokeColor="#f59e0b"
          />
        </div>
        <div>
          <div className="flex justify-between mb-2">
            <span className="text-gray-600">Extra Day Pay</span>
            <span className="font-semibold">{leaveAnalytics.extraDayPay || 0}</span>
          </div>
          <Progress 
            percent={leaveAnalytics.extraDayPayPercentage || 0} 
            strokeColor="#10b981"
          />
        </div>
      </div>
    </Card>
  )
}
