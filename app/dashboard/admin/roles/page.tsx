"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { 
  Shield, 
  Check, 
  X,
  Users,
  Eye,
  FileCheck,
  Banknote,
  Megaphone,
  ArrowLeft
} from "lucide-react"
import Link from "next/link"
import { PortalRole } from "@/lib/types/admin"

// Mock Data
const mockRoles: PortalRole[] = [
  {
    DeveloperName: "Admin",
    Role_Code__c: "ADMIN",
    Role_Name__c: "Administrator",
    Role_Description__c: "Full access to all system features and settings.",
    Can_View_All_Employees__c: true,
    Can_View_Team__c: true,
    Can_Approve_Leaves__c: true,
    Can_Verify_Documents__c: true,
    Can_View_Payroll__c: "ALL",
    Can_Create_Employees__c: true,
    Can_Create_Announcements__c: true,
    Can_Access_Admin__c: true,
    Can_View_Reports__c: true,
    Display_Order__c: 1
  },
  {
    DeveloperName: "HR",
    Role_Code__c: "HR",
    Role_Name__c: "HR Manager",
    Role_Description__c: "Manage employees, leaves, approvals, and documents.",
    Can_View_All_Employees__c: true,
    Can_View_Team__c: true,
    Can_Approve_Leaves__c: true,
    Can_Verify_Documents__c: true,
    Can_View_Payroll__c: "ALL",
    Can_Create_Employees__c: true,
    Can_Create_Announcements__c: true,
    Can_Access_Admin__c: true,
    Can_View_Reports__c: true,
    Display_Order__c: 2
  },
  {
    DeveloperName: "Team_Lead",
    Role_Code__c: "TL",
    Role_Name__c: "Team Lead",
    Role_Description__c: "Manage team members and approve operational requests.",
    Can_View_All_Employees__c: false,
    Can_View_Team__c: true,
    Can_Approve_Leaves__c: true,
    Can_Verify_Documents__c: false,
    Can_View_Payroll__c: "TEAM",
    Can_Create_Employees__c: false,
    Can_Create_Announcements__c: false,
    Can_Access_Admin__c: false,
    Can_View_Reports__c: false,
    Display_Order__c: 3
  },
  {
    DeveloperName: "Employee",
    Role_Code__c: "EMP",
    Role_Name__c: "Employee",
    Role_Description__c: "Standard access to self-service portal.",
    Can_View_All_Employees__c: false,
    Can_View_Team__c: false,
    Can_Approve_Leaves__c: false,
    Can_Verify_Documents__c: false,
    Can_View_Payroll__c: "OWN",
    Can_Create_Employees__c: false,
    Can_Create_Announcements__c: false,
    Can_Access_Admin__c: false,
    Can_View_Reports__c: false,
    Display_Order__c: 4
  }
]

export default function RolesPage() {
  const [roles] = useState<PortalRole[]>(mockRoles)

  const PermissionRow = ({ label, value, icon: Icon }: { label: string, value: boolean | string, icon: any }) => (
      <div className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
          <div className="flex items-center gap-2 text-slate-600 text-sm">
              <Icon className="w-4 h-4 text-slate-400" />
              <span>{label}</span>
          </div>
          <div>
              {typeof value === 'boolean' ? (
                  value ? <Check className="w-4 h-4 text-green-500" /> : <X className="w-4 h-4 text-slate-300" />
              ) : (
                  <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 rounded text-slate-600">{value}</span>
              )}
          </div>
      </div>
  )

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <Link href="/dashboard/admin" className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors w-fit">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back to Admin</span>
      </Link>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Roles & Permissions</h1>
          <p className="text-slate-500 mt-2">Manage access levels and functional capabilities per role.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
        {roles.map((role, index) => (
            <motion.div
                key={role.DeveloperName}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col"
            >
                <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center justify-between mb-4">
                        <div className={`p-3 rounded-xl ${
                            role.Role_Code__c === 'ADMIN' ? 'bg-red-50 text-red-600' :
                            role.Role_Code__c === 'HR' ? 'bg-purple-50 text-purple-600' :
                            role.Role_Code__c === 'TL' ? 'bg-blue-50 text-blue-600' :
                            'bg-green-50 text-green-600'
                        }`}>
                            <Shield className="w-6 h-6" />
                        </div>
                        <span className="text-xs font-mono font-medium text-slate-400">{role.Role_Code__c}</span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">{role.Role_Name__c}</h3>
                    <p className="text-sm text-slate-500 line-clamp-2 min-h-[40px]">{role.Role_Description__c}</p>
                </div>

                <div className="p-6 space-y-1 flex-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Capabilities</p>
                    
                    <PermissionRow label="View All Employees" value={role.Can_View_All_Employees__c} icon={Users} />
                    <PermissionRow label="Approve Leaves" value={role.Can_Approve_Leaves__c} icon={Check} />
                    <PermissionRow label="Verify Documents" value={role.Can_Verify_Documents__c} icon={FileCheck} />
                    <PermissionRow label="Create Employees" value={role.Can_Create_Employees__c} icon={Users} />
                    <PermissionRow label="Announcements" value={role.Can_Create_Announcements__c} icon={Megaphone} />
                    <PermissionRow label="Payroll Access" value={role.Can_View_Payroll__c} icon={Banknote} />
                    <PermissionRow label="Admin Access" value={role.Can_Access_Admin__c} icon={Shield} />
                </div>
            </motion.div>
        ))}
      </div>
    </div>
  )
}
