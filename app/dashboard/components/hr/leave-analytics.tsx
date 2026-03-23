"use client"

import { Card, Progress, Tooltip } from "antd"
import { BarChartOutlined, InfoCircleOutlined } from "@ant-design/icons"

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
  const renderTooltipLabel = (label: string, message: string) => (
    <span className="inline-flex items-center gap-1">
      <span>{label}</span>
      <Tooltip title={message} placement="top">
        <InfoCircleOutlined className="text-slate-400 hover:text-slate-600" />
      </Tooltip>
    </span>
  )

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
            <span className="text-gray-600">{renderTooltipLabel("Planned Leaves", "Approved planned leaves are shown here.")}</span>
            <span className="font-semibold">{leaveAnalytics.plannedLeaves || 0}</span>
          </div>
          <Progress 
            percent={leaveAnalytics.plannedLeavePercentage || 0} 
            strokeColor="#3b82f6"
          />
        </div>
        <div>
          <div className="flex justify-between mb-2">
            <span className="text-gray-600">{renderTooltipLabel("Sick Leaves", "Approved sick leaves are shown here.")}</span>
            <span className="font-semibold">{leaveAnalytics.sickLeaves || 0}</span>
          </div>
          <Progress 
            percent={leaveAnalytics.sickLeavePercentage || 0} 
            strokeColor="#ef4444"
          />
        </div>
        <div>
          <div className="flex justify-between mb-2">
            <span className="text-gray-600">{renderTooltipLabel("Emergency Leaves", "Approved emergency leaves are shown here.")}</span>
            <span className="font-semibold">{leaveAnalytics.emergencyLeaves || 0}</span>
          </div>
          <Progress 
            percent={leaveAnalytics.emergencyLeavePercentage || 0} 
            strokeColor="#f59e0b"
          />
        </div>
        <div>
          <div className="flex justify-between mb-2">
            <span className="text-gray-600">{renderTooltipLabel("Extra Day Pay", "Approved extra day pay leaves are shown here.")}</span>
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
