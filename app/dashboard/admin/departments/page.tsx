"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { 
  Building, 
  Users, 
  MoreVertical, 
  Plus, 
  Network,
  ArrowLeft
} from "lucide-react"
import Link from "next/link"
import { Department } from "@/lib/types/admin"

// Mock Data
const mockDepartments: Department[] = [
  {
    DeveloperName: "Engineering",
    Department_Code__c: "ENG",
    Department_Name__c: "Engineering",
    Active__c: true,
    Display_Order__c: 1,
    Cost_Center__c: "CC-001"
  },
  {
    DeveloperName: "Sales",
    Department_Code__c: "SAL",
    Department_Name__c: "Sales",
    Active__c: true,
    Display_Order__c: 2,
    Cost_Center__c: "CC-002"
  },
  {
    DeveloperName: "HR",
    Department_Code__c: "HR",
    Department_Name__c: "Human Resources",
    Active__c: true,
    Display_Order__c: 3,
    Cost_Center__c: "CC-003"
  },
  {
     DeveloperName: "Finance",
     Department_Code__c: "FIN",
     Department_Name__c: "Finance",
     Active__c: true,
     Display_Order__c: 4,
     Cost_Center__c: "CC-004"
  },
  {
     DeveloperName: "Operations",
     Department_Code__c: "OPS",
     Department_Name__c: "Operations",
     Active__c: true,
     Display_Order__c: 5,
     Cost_Center__c: "CC-005"
  }
]

export default function DepartmentsPage() {
  const [departments] = useState<Department[]>(mockDepartments)

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <Link href="/dashboard/admin" className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors w-fit">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back to Admin</span>
      </Link>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Departments</h1>
          <p className="text-slate-500 mt-2">Manage organization hierarchy and cost centers.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors shadow-md shadow-slate-200">
             <Plus className="w-4 h-4" />
             <span>Add Department</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         {departments.map((dept, index) => (
             <motion.div
                key={dept.DeveloperName}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className="group bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-lg transition-all relative"
             >
                <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center text-orange-600">
                        <Building className="w-6 h-6" />
                    </div>
                    <button className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50">
                        <MoreVertical className="w-4 h-4" />
                    </button>
                </div>

                <div className="mb-6">
                    <h3 className="text-lg font-bold text-slate-900">{dept.Department_Name__c}</h3>
                    <p className="text-sm text-slate-500">Code: {dept.Department_Code__c}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100 bg-slate-50/30 -mx-6 -mb-6 p-6 rounded-b-2xl">
                     <div>
                         <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">Cost Center</p>
                         <p className="text-sm font-semibold text-slate-800">{dept.Cost_Center__c || '-'}</p>
                     </div>
                     <div className="text-right">
                         <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">Status</p>
                         <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${dept.Active__c ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                             {dept.Active__c ? 'Active' : 'Inactive'}
                         </span>
                     </div>
                </div>
             </motion.div>
         ))}
      </div>
    </div>
  )
}
