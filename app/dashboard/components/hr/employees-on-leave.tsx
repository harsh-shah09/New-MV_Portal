"use client"

import { Empty, Avatar } from "antd"
import { UserOutlined, CalendarOutlined } from "@ant-design/icons"
import dayjs from "dayjs"

interface EmployeesOnLeaveProps {
  employeesOnLeave: any[]
}

export function EmployeesOnLeave({ employeesOnLeave }: EmployeesOnLeaveProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 h-full flex flex-col hover:shadow-md transition-shadow duration-300">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-50">
          <div className="p-2 bg-pink-50 rounded-lg text-pink-600">
              <UserOutlined className="text-xl" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">Who's Out Today</h3>
            <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-pink-500"></span>
                </span>
                <p className="text-xs text-slate-500 font-medium">{employeesOnLeave.length} Employees Absent</p>
            </div>
          </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
      {employeesOnLeave.length > 0 ? (
        <div className="space-y-4">
          {employeesOnLeave.map((employee: any) => (
            <div 
              key={employee.id} 
              className="p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-pink-200 hover:bg-white hover:shadow-sm transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="relative">
                    <Avatar 
                    size={48} 
                    icon={<UserOutlined />} 
                    src={employee.profilePhoto} // Assuming profilePhoto if available
                    className="bg-gradient-to-br from-pink-400 to-rose-500 border-2 border-white shadow-sm flex-shrink-0"
                    />
                    <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                        <div className="w-3 h-3 bg-red-400 rounded-full border-2 border-white"></div>
                    </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-slate-800 truncate group-hover:text-pink-600 transition-colors">
                    {employee.employeeName}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1 font-medium">
                    <span className="capitalize px-1.5 py-0.5 bg-pink-50 text-pink-600 rounded border border-pink-100">
                        {employee.leaveType}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span>
                        {dayjs(employee.startDate).format('MMM DD')} 
                        {employee.duration > 1 && ` - ${dayjs(employee.endDate).format('MMM DD')}`}
                    </span>
                  </div>
                </div>
                
                <div className="text-right flex flex-col items-end">
                    <span className="text-lg font-bold text-slate-700">{employee.duration}d</span>
                    {/* <span className="text-[10px] text-slate-400">Duration</span> */}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="h-full flex flex-col items-center justify-center py-6 text-center">
             <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-4">
                 <CheckCircleOutlined className="text-2xl text-green-500" /> {/* Corrected this import? Need to check imports */}
             </div>
             <p className="text-slate-800 font-semibold">All Hands on Deck!</p>
             <p className="text-slate-500 text-sm">No employees are on leave today.</p>
        </div>
      )}
      </div>
    </div>
  )
}

// I need to import CheckCircleOutlined correctly if I use it.
import { CheckCircleOutlined } from "@ant-design/icons"
