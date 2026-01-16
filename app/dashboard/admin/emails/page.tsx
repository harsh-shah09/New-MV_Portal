"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { 
  Mail, 
  Send, 
  FileCode, 
  MoreVertical,
  Zap,
  ArrowLeft
} from "lucide-react"
import Link from "next/link"
import { EmailTemplateConfig } from "@/lib/types/admin"

// Mock Data
const mockTemplates: EmailTemplateConfig[] = [
  {
    DeveloperName: "Welcome_Email",
    Template_Code__c: "WELCOME",
    Template_Name__c: "Welcome Email",
    Subject__c: "Welcome to {{CompanyName}} - Login Credentials",
    Body__c: "<html>...</html>",
    From_Email__c: "hr@mvportal.com",
    Active__c: true,
    Trigger_Event__c: "EMPLOYEE_CREATED",
    Merge_Fields__c: '["FirstName","CompanyEmail","TempPassword","PortalURL"]'
  },
  {
    DeveloperName: "Leave_Approved",
    Template_Code__c: "LEAVE_APPROVED",
    Template_Name__c: "Leave Approved",
    Subject__c: "Leave Approved - {{LeaveType}}",
    Body__c: "<html>...</html>",
    From_Email__c: "hr@mvportal.com",
    Active__c: true,
    Trigger_Event__c: "LEAVE_APPROVED",
    Merge_Fields__c: '["EmployeeName","LeaveType","StartDate","EndDate","ApprovedBy"]'
  },
  {
    DeveloperName: "Password_Reset",
    Template_Code__c: "PWD_RESET",
    Template_Name__c: "Password Reset",
    Subject__c: "Reset your MV Portal Password",
    Body__c: "<html>...</html>",
    From_Email__c: "support@mvportal.com",
    Active__c: true,
    Trigger_Event__c: "PASSWORD_RESET_REQUEST",
    Merge_Fields__c: '["FirstName","ResetLink","ExpiryTime"]'
  }
]

export default function EmailTemplatesPage() {
  const [templates] = useState<EmailTemplateConfig[]>(mockTemplates)

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <Link href="/dashboard/admin" className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors w-fit">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back to Admin</span>
      </Link>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Email Templates</h1>
          <p className="text-slate-500 mt-2">Manage automated email triggers and content.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
          {templates.map((tpl, index) => {
              const mergeFields = JSON.parse(tpl.Merge_Fields__c) as string[];
              
              return (
                <motion.div 
                    key={tpl.DeveloperName}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="group bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-lg transition-all flex flex-col md:flex-row gap-6 items-start"
                >
                    <div className="p-4 bg-sky-50 rounded-2xl flex-shrink-0">
                        <Mail className="w-8 h-8 text-sky-600" />
                    </div>

                    <div className="flex-1 space-y-3 min-w-0">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900">{tpl.Template_Name__c}</h3>
                                <p className="text-sm text-slate-500 font-mono mt-1">{tpl.Subject__c}</p>
                            </div>
                            <button className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50">
                                <MoreVertical className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-slate-600">
                             <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-full">
                                <Zap className="w-3.5 h-3.5 text-amber-500" />
                                <span className="font-medium">Trigger:</span> {tpl.Trigger_Event__c}
                             </div>
                             <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-full">
                                <Send className="w-3.5 h-3.5 text-blue-500" />
                                <span className="font-medium">From:</span> {tpl.From_Email__c}
                             </div>
                        </div>

                        <div className="pt-3">
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Available Variables</p>
                            <div className="flex flex-wrap gap-2">
                                {mergeFields.map(field => (
                                    <span key={field} className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs font-mono text-slate-600">
                                        {`{{${field}}}`}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </motion.div>
              )
          })}
      </div>
    </div>
  )
}
