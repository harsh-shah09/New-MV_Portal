"use client"

import { Progress } from "antd"
import { 
  BarChartOutlined,
  CalendarOutlined,
  HeartOutlined,
  AlertOutlined,
  DollarOutlined
} from "@ant-design/icons"

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
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 h-full flex flex-col hover:shadow-md transition-shadow duration-300">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-50">
        <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
            <BarChartOutlined className="text-xl" />
        </div>
        <div>
            <h3 className="text-lg font-bold text-slate-800">Leave Analytics</h3>
            <p className="text-xs text-slate-500 font-medium">Monthly Breakdown</p>
        </div>
      </div>

      <div className="space-y-6 flex-1 overflow-y-auto">
        {/* Planned Leaves */}
        <div className="group">
          <div className="flex justify-between mb-2">
             <div className="flex items-center gap-2">
                 <CalendarOutlined className="text-blue-500" />
                 <span className="text-slate-600 font-medium text-sm">Planned Leaves</span>
             </div>
             <span className="font-bold text-slate-800">{leaveAnalytics.plannedLeaves || 0}</span>
          </div>
          <Progress 
            percent={leaveAnalytics.plannedLeavePercentage || 0} 
            strokeColor="#3b82f6"
            trailColor="#eff6ff"
            showInfo={false}
            size="small"
            className="mb-1"
          />
        </div>

        {/* Sick Leaves */}
        <div className="group">
          <div className="flex justify-between mb-2">
             <div className="flex items-center gap-2">
                 <HeartOutlined className="text-red-500" />
                 <span className="text-slate-600 font-medium text-sm">Sick Leaves</span>
             </div>
             <span className="font-bold text-slate-800">{leaveAnalytics.sickLeaves || 0}</span>
          </div>
          <Progress 
            percent={leaveAnalytics.sickLeavePercentage || 0} 
            strokeColor="#ef4444"
            trailColor="#fef2f2"
            showInfo={false}
            size="small"
            className="mb-1"
          />
        </div>

        {/* Emergency Leaves */}
        <div className="group">
          <div className="flex justify-between mb-2">
             <div className="flex items-center gap-2">
                 <AlertOutlined className="text-amber-500" />
                 <span className="text-slate-600 font-medium text-sm">Emergency Leaves</span>
             </div>
             <span className="font-bold text-slate-800">{leaveAnalytics.emergencyLeaves || 0}</span>
          </div>
          <Progress 
            percent={leaveAnalytics.emergencyLeavePercentage || 0} 
            strokeColor="#f59e0b"
            trailColor="#fffbeb"
            showInfo={false}
            size="small"
            className="mb-1"
          />
        </div>

        {/* Extra Day Pay */}
        <div className="group">
          <div className="flex justify-between mb-2">
             <div className="flex items-center gap-2">
                 <DollarOutlined className="text-emerald-500" />
                 <span className="text-slate-600 font-medium text-sm">Extra Day Pay</span>
             </div>
             <span className="font-bold text-slate-800">{leaveAnalytics.extraDayPay || 0}</span>
          </div>
          <Progress 
            percent={leaveAnalytics.extraDayPayPercentage || 0} 
            strokeColor="#10b981"
            trailColor="#ecfdf5"
            showInfo={false}
            size="small"
            className="mb-1"
          />
        </div>
      </div>
    </div>
  )
}
