"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { 
  CalendarDays, 
  Plus, 
  MoreVertical, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  FileBadge,
  Clock,
  Banknote,
  ArrowLeft
} from "lucide-react"
import Link from "next/link"
import { LeaveType } from "@/lib/types/admin"

// Mock Data
const defaultLeaveTypes: LeaveType[] = [
  {
    DeveloperName: "Casual_Leave",
    Leave_Code__c: "CL",
    Leave_Name__c: "Casual Leave",
    Annual_Quota__c: 12,
    Carryover_Allowed__c: true,
    Max_Carryover_Days__c: 5,
    Requires_Approval__c: true,
    Approval_Level__c: "TL_HR",
    Requires_Document__c: false,
    Can_Be_Prorated__c: false,
    Encashable__c: false,
    Active__c: true,
    Display_Order__c: 1,
    Color_Code__c: "#4CAF50"
  },
  {
    DeveloperName: "Sick_Leave",
    Leave_Code__c: "SL",
    Leave_Name__c: "Sick Leave",
    Annual_Quota__c: 7,
    Carryover_Allowed__c: true,
    Max_Carryover_Days__c: 999,
    Requires_Approval__c: true,
    Requires_Document__c: true,
    Document_Required_After_Days__c: 2,
    Can_Be_Prorated__c: false,
    Encashable__c: false,
    Active__c: true,
    Display_Order__c: 2,
    Color_Code__c: "#FF9800"
  },
  {
    DeveloperName: "Earned_Leave",
    Leave_Code__c: "EL",
    Leave_Name__c: "Earned Leave",
    Annual_Quota__c: 15,
    Carryover_Allowed__c: true,
    Max_Carryover_Days__c: 15,
    Requires_Approval__c: true,
    Requires_Document__c: false,
    Can_Be_Prorated__c: true,
    Encashable__c: true,
    Active__c: true,
    Display_Order__c: 3,
    Color_Code__c: "#2196F3"
  },
  {
    DeveloperName: "Loss_of_Pay",
    Leave_Code__c: "LOP",
    Leave_Name__c: "Loss of Pay",
    Annual_Quota__c: 0,
    Carryover_Allowed__c: false,
    Requires_Approval__c: false,
    Requires_Document__c: false,
    Can_Be_Prorated__c: false,
    Encashable__c: false,
    Active__c: true,
    Display_Order__c: 4,
    Color_Code__c: "#F44336"
  }
]

export default function LeaveTypesPage() {
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>(defaultLeaveTypes)

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <Link href="/dashboard/admin" className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors w-fit">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back to Admin</span>
      </Link>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Leave Types</h1>
          <p className="text-slate-500 mt-2">Define leave policies, quotas, and approval rules.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md shadow-blue-200">
             <Plus className="w-4 h-4" />
             <span>Add Leave Type</span>
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {leaveTypes.map((leave, index) => (
          <motion.div
            key={leave.DeveloperName}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="group bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-xl hover:translate-y-[-2px] transition-all duration-300 relative overflow-hidden"
          >
              {/* Top Color Bar */}
              <div 
                className="absolute top-0 left-0 w-full h-1.5" 
                style={{ backgroundColor: leave.Color_Code__c }}
              />

              <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shadow-sm"
                        style={{ backgroundColor: leave.Color_Code__c }}
                      >
                          {leave.Leave_Code__c}
                      </div>
                      <div>
                          <h3 className="text-lg font-semibold text-slate-800">{leave.Leave_Name__c}</h3>
                          <span className="text-xs font-medium text-slate-400">Code: {leave.Leave_Code__c}</span>
                      </div>
                  </div>
                  <button className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
                      <MoreVertical className="w-4 h-4" />
                  </button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                 <div className="p-3 bg-slate-50 rounded-xl">
                    <p className="text-xs text-slate-500 font-medium mb-1">Annual Quota</p>
                    <p className="text-xl font-bold text-slate-800">
                        {leave.Annual_Quota__c === 0 ? 'Unlimited' : leave.Annual_Quota__c}
                    </p>
                 </div>
                 <div className="p-3 bg-slate-50 rounded-xl">
                    <p className="text-xs text-slate-500 font-medium mb-1">Carryover</p>
                    <div className="flex items-center gap-1">
                        {leave.Carryover_Allowed__c ? (
                            <CheckCircle2 className="w-3 h-3 text-green-500" />
                        ) : (
                            <XCircle className="w-3 h-3 text-red-500" />
                        )}
                        <p className="text-sm font-semibold text-slate-700">
                            {leave.Carryover_Allowed__c 
                                ? `${(leave.Max_Carryover_Days__c || 0) > 100 ? 'Unl.' : leave.Max_Carryover_Days__c} Days` 
                                : 'None'
                            }
                        </p>
                    </div>
                 </div>
              </div>

              {/* Attributes Chips */}
              <div className="flex flex-wrap gap-2">
                 {leave.Requires_Approval__c && (
                     <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-50 text-orange-600 text-xs font-medium border border-orange-100">
                        <CheckCircle2 className="w-3 h-3" />
                         Approval
                     </div>
                 )}
                 {leave.Requires_Document__c && (
                     <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs font-medium border border-indigo-100">
                        <FileBadge className="w-3 h-3" />
                         Doc {'>'} {leave.Document_Required_After_Days__c}d
                     </div>
                 )}
                 {leave.Encashable__c && (
                     <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-medium border border-emerald-100">
                        <Banknote className="w-3 h-3" />
                         Encashable
                     </div>
                 )}
              </div>

              {/* Decoration */}
              <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-gradient-to-br from-slate-100 to-slate-50 rounded-full blur-2xl -z-10 group-hover:from-blue-50 group-hover:to-cyan-50 transition-colors"></div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
