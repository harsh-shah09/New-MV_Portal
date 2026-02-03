"use client"

import { 
  CheckCircleOutlined,
  HomeOutlined,
  TeamOutlined,
  PlusCircleOutlined,
  ArrowRightOutlined
} from "@ant-design/icons"
import { useRouter } from "next/navigation"

export function HRQuickActions() {
  const router = useRouter()

  return (
    <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-2xl shadow-lg shadow-indigo-200 border border-indigo-500/20 p-6 h-full text-white flex flex-col justify-between relative overflow-hidden">
      {/* Decorative BG */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
      
      <div className="relative z-10 mb-6">
         <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm shadow-inner">
               <PlusCircleOutlined className="text-xl" />
            </div>
            <h3 className="text-lg font-bold tracking-wide">Quick Actions</h3>
         </div>
         <p className="text-blue-100 text-sm opacity-80 font-medium">Frequently used tools</p>
      </div>

      <div className="space-y-3 relative z-10">
        <button 
          onClick={() => router.push('/leaves?tab=approvals')}
          className="w-full flex items-center justify-between p-3.5 rounded-xl bg-white/10 border border-white/10 hover:bg-white/20 hover:border-white/30 transition-all duration-300 group cursor-pointer text-left"
        >
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-300 group-hover:bg-emerald-500/30 transition-colors">
                <CheckCircleOutlined />
             </div>
             <span className="font-semibold text-sm">Review Approvals</span>
          </div>
          <ArrowRightOutlined className="opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
        </button>

        <button 
          onClick={() => router.push('/holidays')}
          className="w-full flex items-center justify-between p-3.5 rounded-xl bg-white/10 border border-white/10 hover:bg-white/20 hover:border-white/30 transition-all duration-300 group cursor-pointer text-left"
        >
           <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-300 group-hover:bg-amber-500/30 transition-colors">
                <HomeOutlined />
             </div>
             <span className="font-semibold text-sm">Manage Holidays</span>
           </div>
           <ArrowRightOutlined className="opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
        </button>

        <button 
          onClick={() => router.push('/employees')}
          className="w-full flex items-center justify-between p-3.5 rounded-xl bg-white/10 border border-white/10 hover:bg-white/20 hover:border-white/30 transition-all duration-300 group cursor-pointer text-left"
        >
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-300 group-hover:bg-purple-500/30 transition-colors">
                <TeamOutlined />
             </div>
             <span className="font-semibold text-sm">View Employees</span>
          </div>
          <ArrowRightOutlined className="opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
        </button>
      </div>
    </div>
  )
}
