"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { 
  GitBranch, 
  GitCommit, 
  CheckCircle2, 
  User,
  ArrowRight,
  ShieldCheck,
  ArrowLeft
} from "lucide-react"
import Link from "next/link"
import { ApprovalWorkflow } from "@/lib/types/admin"

// Mock Data
const mockWorkflows: ApprovalWorkflow[] = [
  {
    DeveloperName: "Leave_Approval_Standard",
    Workflow_Code__c: "LEAVE_STD",
    Workflow_Name__c: "Standard Leave Approval",
    Object_Type__c: "Leave",
    Approval_Levels__c: 2,
    Level_1_Approver__c: "TL",
    Level_2_Approver__c: "HR",
    Active__c: true,
    Default_Workflow__c: true
  },
  {
    DeveloperName: "Document_Verification",
    Workflow_Code__c: "DOC_VERIFY",
    Workflow_Name__c: "Document Verification",
    Object_Type__c: "Document",
    Approval_Levels__c: 1,
    Level_1_Approver__c: "HR",
    Active__c: true,
    Default_Workflow__c: true
  }
]

export default function WorkflowsPage() {
  const [workflows] = useState<ApprovalWorkflow[]>(mockWorkflows)

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <Link href="/dashboard/admin" className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors w-fit">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back to Admin</span>
      </Link>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Approval Workflows</h1>
          <p className="text-slate-500 mt-2">Design approval chains for leaves and documents.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
         {workflows.map((wf, index) => (
             <motion.div 
                key={wf.DeveloperName}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm hover:shadow-lg transition-all relative overflow-hidden"
             >
                 {wf.Default_Workflow__c && (
                     <div className="absolute top-0 right-0 px-4 py-1 bg-indigo-500 text-white text-xs font-bold rounded-bl-xl shadow-sm">
                         DEFAULT
                     </div>
                 )}

                 <div className="flex items-center gap-3 mb-8">
                     <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
                         <GitBranch className="w-6 h-6" />
                     </div>
                     <div>
                         <h3 className="text-xl font-bold text-slate-900">{wf.Workflow_Name__c}</h3>
                         <p className="text-sm text-slate-500">For {wf.Object_Type__c}</p>
                     </div>
                 </div>

                 {/* Visualization */}
                 <div className="relative flex items-center justify-between px-4 py-6 bg-slate-50/50 rounded-2xl border border-slate-100">
                     {/* Connector Line */}
                     <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-slate-200 -z-10"></div>

                     {/* Start Node */}
                     <div className="flex flex-col items-center gap-2">
                         <div className="w-10 h-10 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center text-slate-400 z-10 shadow-sm">
                             <User className="w-5 h-5" />
                         </div>
                         <span className="text-xs font-semibold text-slate-500 uppercase">Requester</span>
                     </div>

                     {/* Level 1 */}
                     <div className="flex flex-col items-center gap-2">
                         <div className="w-12 h-12 rounded-full bg-white border-2 border-blue-200 flex items-center justify-center text-blue-600 z-10 shadow-sm">
                             <span className="font-bold">{wf.Level_1_Approver__c}</span>
                         </div>
                         <span className="text-xs font-semibold text-blue-600 uppercase">Level 1</span>
                     </div>

                     {/* Optional Level 2 */}
                     {wf.Approval_Levels__c > 1 && (
                         <div className="flex flex-col items-center gap-2">
                             <div className="w-12 h-12 rounded-full bg-white border-2 border-purple-200 flex items-center justify-center text-purple-600 z-10 shadow-sm">
                                 <span className="font-bold">{wf.Level_2_Approver__c}</span>
                             </div>
                             <span className="text-xs font-semibold text-purple-600 uppercase">Level 2</span>
                         </div>
                     )}

                     {/* End Node */}
                     <div className="flex flex-col items-center gap-2">
                         <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white z-10 shadow-sm shadow-green-200">
                             <CheckCircle2 className="w-5 h-5" />
                         </div>
                         <span className="text-xs font-semibold text-green-600 uppercase">Approved</span>
                     </div>
                 </div>

             </motion.div>
         ))}
      </div>
    </div>
  )
}
