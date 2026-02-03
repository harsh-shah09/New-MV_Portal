"use client"

import { Statistic } from "antd"
import { 
  TeamOutlined,
  UserAddOutlined,
  FileExclamationOutlined,
  UserOutlined
} from "@ant-design/icons"

interface EmployeeStatsProps {
  stats: {
    totalEmployees: number
    onLeaveToday: number
    newJoinersThisMonth: number
    pendingDocuments: number
  }
}

export function EmployeeStats({ stats }: EmployeeStatsProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 h-full hover:shadow-md transition-shadow duration-300">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-50">
          <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
              <TeamOutlined className="text-xl" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">Employee Stats</h3>
            <p className="text-xs text-slate-500 font-medium">Workforce Overview</p>
          </div>
      </div>

      <div className="grid grid-cols-2 gap-4 h-full content-start">
        {/* Active Emp */}
        <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 hover:bg-blue-50 transition-colors group">
            <div className="flex items-center gap-2 text-blue-500 mb-2">
                <UserOutlined />
                <span className="text-xs font-bold uppercase">Active</span>
            </div>
            <div className="text-2xl font-bold text-slate-800">
                {stats.totalEmployees - stats.onLeaveToday}
            </div>
            <div className="text-[10px] text-blue-400 font-medium">Currently Working</div>
        </div>

        {/* New Joiners */}
        <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 hover:bg-emerald-50 transition-colors group">
            <div className="flex items-center gap-2 text-emerald-500 mb-2">
                <UserAddOutlined />
                <span className="text-xs font-bold uppercase">Joiners</span>
            </div>
            <div className="text-2xl font-bold text-slate-800">
                {stats.newJoinersThisMonth}
            </div>
            <div className="text-[10px] text-emerald-400 font-medium">This Month</div>
        </div>

        {/* Pending Docs */}
        <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100 hover:bg-amber-50 transition-colors group">
            <div className="flex items-center gap-2 text-amber-500 mb-2">
                <FileExclamationOutlined />
                <span className="text-xs font-bold uppercase">Docs</span>
            </div>
            <div className="text-2xl font-bold text-slate-800">
                {stats.pendingDocuments}
            </div>
             <div className="text-[10px] text-amber-400 font-medium">Pending Review</div>
        </div>

        {/* On Leave */}
        <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-100 hover:bg-purple-50 transition-colors group">
            <div className="flex items-center gap-2 text-purple-500 mb-2">
                <TeamOutlined />
                <span className="text-xs font-bold uppercase">On Leave</span>
            </div>
            <div className="text-2xl font-bold text-slate-800">
                {stats.onLeaveToday}
            </div>
            <div className="text-[10px] text-purple-400 font-medium">Absent Today</div>
        </div>
      </div>
    </div>
  )
}
