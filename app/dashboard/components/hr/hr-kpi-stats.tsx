"use client"

import { Card, Button, Statistic, Row, Col } from "antd"
import { 
  CheckCircleOutlined, 
  ClockCircleOutlined,
  UserOutlined,
  TeamOutlined,
  ArrowRightOutlined
} from "@ant-design/icons"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"

interface HRKPIStatsProps {
  stats: {
    pendingApprovals: number
    approvedToday: number
    onLeaveToday: number
    totalEmployees: number
  }
}

export function HRKPIStats({ stats }: HRKPIStatsProps) {
  const router = useRouter()

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Pending Approvals */}
      <motion.div 
        variants={cardVariants}
        initial="hidden" animate="visible" transition={{ delay: 0.1 }}
        className="group relative bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-lg hover:border-orange-200 transition-all duration-300"
      >
        <div className="absolute top-0 right-0 w-24 h-24 bg-orange-50 rounded-bl-full -mr-4 -mt-4 opacity-50 group-hover:scale-110 transition-transform"></div>
        
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-4">
             <div className="p-3 bg-orange-50 rounded-xl text-orange-500 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                <ClockCircleOutlined className="text-xl" />
             </div>
             {stats.pendingApprovals > 0 && (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-red-600 text-xs font-bold animate-pulse">
                   !
                </span>
             )}
          </div>
          
          <h3 className="text-slate-500 font-medium text-sm uppercase tracking-wide">Pending Approvals</h3>
          <div className="mt-1 flex items-end justify-between">
              <span className="text-3xl font-bold text-slate-800 tracking-tight">{stats.pendingApprovals}</span>
              <Button 
                type="text" 
                shape="circle" 
                icon={<ArrowRightOutlined />} 
                onClick={() => router.push('/leaves?tab=approvals')} 
                className="text-orange-500 hover:bg-orange-50" 
              />
          </div>
        </div>
      </motion.div>

      {/* Approved Today */}
      <motion.div 
        variants={cardVariants}
        initial="hidden" animate="visible" transition={{ delay: 0.2 }}
        className="group relative bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-lg hover:border-green-200 transition-all duration-300"
      >
        <div className="absolute top-0 right-0 w-24 h-24 bg-green-50 rounded-bl-full -mr-4 -mt-4 opacity-50 group-hover:scale-110 transition-transform"></div>
        <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-green-50 rounded-xl text-green-500 group-hover:bg-green-500 group-hover:text-white transition-colors">
                    <CheckCircleOutlined className="text-xl" />
                </div>
            </div>
            
            <h3 className="text-slate-500 font-medium text-sm uppercase tracking-wide">Approved Today</h3>
            <div className="mt-1">
                <span className="text-3xl font-bold text-slate-800 tracking-tight">{stats.approvedToday}</span>
            </div>
        </div>
      </motion.div>

      {/* On Leave Today */}
      <motion.div 
        variants={cardVariants}
        initial="hidden" animate="visible" transition={{ delay: 0.3 }}
        className="group relative bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-lg hover:border-blue-200 transition-all duration-300"
      >
        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -mr-4 -mt-4 opacity-50 group-hover:scale-110 transition-transform"></div>
        <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-blue-50 rounded-xl text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                    <UserOutlined className="text-xl" />
                </div>
            </div>
            
            <h3 className="text-slate-500 font-medium text-sm uppercase tracking-wide">On Leave Today</h3>
            <div className="mt-1 flex items-center gap-2">
                <span className="text-3xl font-bold text-slate-800 tracking-tight">{stats.onLeaveToday}</span>
                <span className="text-xs font-semibold text-blue-500 bg-blue-50 px-2 py-1 rounded-full">Active</span>
            </div>
        </div>
      </motion.div>

      {/* Total Employees */}
       <motion.div 
        variants={cardVariants}
        initial="hidden" animate="visible" transition={{ delay: 0.4 }}
        className="group relative bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-lg hover:border-purple-200 transition-all duration-300"
      >
         <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50 rounded-bl-full -mr-4 -mt-4 opacity-50 group-hover:scale-110 transition-transform"></div>
        <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-purple-50 rounded-xl text-purple-500 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                    <TeamOutlined className="text-xl" />
                </div>
            </div>
            
            <h3 className="text-slate-500 font-medium text-sm uppercase tracking-wide">Total Employees</h3>
            <div className="mt-1">
                <span className="text-3xl font-bold text-slate-800 tracking-tight">{stats.totalEmployees}</span>
            </div>
        </div>
      </motion.div>
    </div>
  )
}
