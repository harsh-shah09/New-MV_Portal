"use client"

import { Progress } from "antd"
import { 
  CalendarOutlined, 
  ClockCircleOutlined,
  MedicineBoxOutlined,
  SafetyCertificateOutlined,
  ScheduleOutlined
} from "@ant-design/icons"
import { motion } from "framer-motion"

interface LeaveBalanceCardsProps {
  leaveBalanceData: {
    annualLeaveRemaining: number
    sickLeaveCount: number
    emergencyLeaveCount: number
    plannedLeaveCount: number
  }
  totalAllowance: number
}

export function LeaveBalanceCards({ leaveBalanceData, totalAllowance }: LeaveBalanceCardsProps) {
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Annual Leave Remaining */}
      <motion.div 
         variants={cardVariants}
         initial="hidden" animate="visible" transition={{ delay: 0.1 }}
         className="group relative bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-lg hover:border-blue-200 transition-all duration-300"
      >
        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -mr-4 -mt-4 opacity-50 group-hover:scale-110 transition-transform"></div>
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-4">
             <div className="p-3 bg-blue-50 rounded-xl text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                <CalendarOutlined className="text-xl" />
             </div>
          </div>
          
          <h3 className="text-slate-500 font-medium text-sm uppercase tracking-wide">Annual Leave Remaining</h3>
          <div className="mt-1 flex items-baseline gap-2">
             <span className="text-3xl font-bold text-slate-800 tracking-tight">{leaveBalanceData.annualLeaveRemaining}</span>
             <span className="text-sm text-slate-400 font-medium">/ {totalAllowance} days</span>
          </div>
          <div className="mt-4">
             <Progress 
                percent={Math.round((leaveBalanceData.annualLeaveRemaining / totalAllowance) * 100)} 
                strokeColor="#3b82f6"
                trailColor="#ebf2ff"
                size="small"
                showInfo={false}
              />
          </div>
        </div>
      </motion.div>

      {/* Sick Leave Taken */}
      <motion.div 
         variants={cardVariants}
         initial="hidden" animate="visible" transition={{ delay: 0.2 }}
         className="group relative bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-lg hover:border-red-200 transition-all duration-300"
      >
        <div className="absolute top-0 right-0 w-24 h-24 bg-red-50 rounded-bl-full -mr-4 -mt-4 opacity-50 group-hover:scale-110 transition-transform"></div>
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-4">
             <div className="p-3 bg-red-50 rounded-xl text-red-500 group-hover:bg-red-500 group-hover:text-white transition-colors">
                <MedicineBoxOutlined className="text-xl" />
             </div>
          </div>
          
          <h3 className="text-slate-500 font-medium text-sm uppercase tracking-wide">Sick Leave Taken</h3>
          <div className="mt-1">
             <span className="text-3xl font-bold text-slate-800 tracking-tight">{leaveBalanceData.sickLeaveCount}</span>
             <span className="text-lg text-slate-400 ml-1">days</span>
          </div>
        </div>
      </motion.div>

      {/* Emergency Leave Taken */}
      <motion.div 
         variants={cardVariants}
         initial="hidden" animate="visible" transition={{ delay: 0.3 }}
         className="group relative bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-lg hover:border-amber-200 transition-all duration-300"
      >
        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-bl-full -mr-4 -mt-4 opacity-50 group-hover:scale-110 transition-transform"></div>
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-4">
             <div className="p-3 bg-amber-50 rounded-xl text-amber-500 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                <SafetyCertificateOutlined className="text-xl" />
             </div>
          </div>
          
          <h3 className="text-slate-500 font-medium text-sm uppercase tracking-wide">Emergency Leave Taken</h3>
          <div className="mt-1">
             <span className="text-3xl font-bold text-slate-800 tracking-tight">{leaveBalanceData.emergencyLeaveCount}</span>
             <span className="text-lg text-slate-400 ml-1">days</span>
          </div>
        </div>
      </motion.div>

      {/* Planned Leave Taken */}
      <motion.div 
         variants={cardVariants}
         initial="hidden" animate="visible" transition={{ delay: 0.4 }}
         className="group relative bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-lg hover:border-green-200 transition-all duration-300"
      >
        <div className="absolute top-0 right-0 w-24 h-24 bg-green-50 rounded-bl-full -mr-4 -mt-4 opacity-50 group-hover:scale-110 transition-transform"></div>
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-4">
             <div className="p-3 bg-green-50 rounded-xl text-green-500 group-hover:bg-green-500 group-hover:text-white transition-colors">
                <ScheduleOutlined className="text-xl" />
             </div>
          </div>
          
          <h3 className="text-slate-500 font-medium text-sm uppercase tracking-wide">Planned Leave Taken</h3>
          <div className="mt-1">
             <span className="text-3xl font-bold text-slate-800 tracking-tight">{leaveBalanceData.plannedLeaveCount}</span>
             <span className="text-lg text-slate-400 ml-1">days</span>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
