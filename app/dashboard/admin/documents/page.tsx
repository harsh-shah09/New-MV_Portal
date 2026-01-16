"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { 
  FileText, 
  FileCheck, 
  ShieldCheck, 
  UploadCloud, 
  Clock,
  MoreVertical,
  AlertCircle,
  ArrowLeft,
  Plus
} from "lucide-react"
import Link from "next/link"
import { DocumentType } from "@/lib/types/admin"

// Mock Data
const mockDocTypes: DocumentType[] = [
  {
    DeveloperName: "Resume",
    Document_Code__c: "RESUME",
    Document_Name__c: "Resume/CV",
    Required__c: true,
    Required_For__c: "All",
    Max_File_Size_MB__c: 5,
    Allowed_Formats__c: "PDF,DOC,DOCX",
    Requires_Verification__c: false,
    Verification_Level__c: "HR_ONLY",
    Has_Expiry__c: false,
    Active__c: true,
    Display_Order__c: 1,
    Icon_Name__c: "file-text"
  },
  {
    DeveloperName: "ID_Proof",
    Document_Code__c: "ID_PROOF",
    Document_Name__c: "Government ID Proof",
    Required__c: true,
    Required_For__c: "All",
    Max_File_Size_MB__c: 2,
    Allowed_Formats__c: "PDF,JPG,PNG",
    Requires_Verification__c: true,
    Has_Expiry__c: true,
    Active__c: true,
    Display_Order__c: 2,
    Help_Text__c: "Aadhaar, Passport, Driving License"
  },
  {
    DeveloperName: "PAN_Card",
    Document_Code__c: "PAN",
    Document_Name__c: "PAN Card",
    Required__c: true,
    Required_For__c: "Full_Time",
    Max_File_Size_MB__c: 2,
    Allowed_Formats__c: "PDF,JPG,PNG",
    Requires_Verification__c: true,
    Has_Expiry__c: false,
    Active__c: true,
    Display_Order__c: 3
  }
]

export default function DocumentTypesPage() {
  const [docs] = useState<DocumentType[]>(mockDocTypes)

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <Link href="/dashboard/admin" className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors w-fit">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back to Admin</span>
      </Link>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Document Types</h1>
          <p className="text-slate-500 mt-2">Define mandatory documents and verification requirements for employees.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {docs.map((doc, index) => (
          <motion.div
            key={doc.DeveloperName}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="group bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden"
          >
              <div className="flex justify-between items-start mb-6">
                 <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                    <FileText className="w-6 h-6" />
                 </div>
                 <div className="flex gap-2">
                    {doc.Required__c && (
                        <span className="px-2 py-1 bg-red-50 text-red-600 text-[10px] font-bold uppercase tracking-wide rounded-md border border-red-100">
                            Required
                        </span>
                    )}
                 </div>
              </div>

              <h3 className="text-lg font-bold text-slate-900 mb-1">{doc.Document_Name__c}</h3>
              <p className="text-sm text-slate-500 mb-6 flex items-center gap-1">
                  Code: <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">{doc.Document_Code__c}</span>
              </p>

              <div className="space-y-3 pb-4 border-b border-slate-100 mb-4">
                  <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500 flex items-center gap-2">
                          <UploadCloud className="w-4 h-4" /> Max Size
                      </span>
                      <span className="font-semibold text-slate-700">{doc.Max_File_Size_MB__c} MB</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500 flex items-center gap-2">
                          <FileCheck className="w-4 h-4" /> Formats
                      </span>
                      <span className="font-semibold text-slate-700 truncate max-w-[120px]" title={doc.Allowed_Formats__c}>
                          {doc.Allowed_Formats__c.replace(/,/g, ', ')}
                      </span>
                  </div>
              </div>

              <div className="flex flex-wrap gap-2">
                  {doc.Requires_Verification__c && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Verified by HR
                      </div>
                  )}
                  {doc.Has_Expiry__c && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-orange-50 text-orange-700 rounded-lg text-xs font-medium">
                          <Clock className="w-3.5 h-3.5" />
                          Expires
                      </div>
                  )}
              </div>

               {/* Hover Action */}
               <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-2 bg-white text-slate-400 hover:text-blue-600 rounded-lg shadow-sm border border-slate-100">
                      <MoreVertical className="w-4 h-4" />
                  </button>
               </div>
          </motion.div>
        ))}

        {/* Add New Card */}
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.4 }}
           className="border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center text-slate-400 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50/10 cursor-pointer transition-all gap-3 min-h-[280px]"
        >
            <div className="p-4 bg-slate-50 rounded-full group-hover:bg-blue-50 transition-colors">
                <Plus className="w-6 h-6" />
            </div>
            <span className="font-medium">Add Document Type</span>
        </motion.div>
      </div>
    </div>
  )
}
