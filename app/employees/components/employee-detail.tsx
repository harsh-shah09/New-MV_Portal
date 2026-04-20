"use client"

import { useState } from "react"

import type { Employee } from "@/types"
import { formatDate } from "@/lib/utils"

interface EmployeeDetailProps {
  employee: Employee
  onClose: () => void
  onEdit?: (employee: Employee) => void
  currentUserRole?: string
}

export function EmployeeDetail({ employee, onClose, onEdit, currentUserRole = 'Employee' }: EmployeeDetailProps) {
  const [activeTab, setActiveTab] = useState<"basic" | "personal" | "bank" | "documents" | "welcome">("basic")

  const tabs = [
    { id: "basic", label: "Basic Info" },
    { id: "personal", label: "Personal" },
    { id: "bank", label: "Bank" },
    { id: "documents", label: "Documents" },
  ]

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full flex flex-col max-h-[90vh]">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 px-8 py-6 flex justify-between items-center rounded-t-xl">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg">
              {employee.firstName.charAt(0)}{employee.lastName.charAt(0)}
            </div>
            <div>
               <h2 className="text-2xl font-bold text-gray-900">
                {employee.firstName} {employee.lastName}
              </h2>
              <p className="text-gray-600 font-medium">{employee.position} • {employee.department}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-white/50 hover:bg-white rounded-full transition-colors">
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex border-b border-gray-200 px-8 bg-white"   
        onClick={(e) => setActiveTab((e.target as any).id)}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              id={tab.id}
              className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-8 overflow-y-auto flex-1 bg-white">
           {activeTab === "basic" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 animate-in fade-in duration-300">
                  <DetailItem label="Email" value={employee.email} />
                  <DetailItem label="Phone" value={employee.phone} />
                  <DetailItem label="Department" value={employee.department} />
                  <DetailItem label="Position" value={employee.position} />
                  <DetailItem label="Join Date" value={employee.joinDate ? formatDate(employee.joinDate) : "-"} />
                  <DetailItem label="Salary" value={`$${(employee.salary / 1000).toFixed(0)}K`} />
                  <div>
                    <label className="text-sm font-medium text-gray-500 block mb-1">Status</label>
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                        employee.status === "active"
                          ? "bg-green-100 text-green-800"
                          : employee.status === "intern"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {employee.status.replace("_", " ")}
                    </span>
                  </div>
              </div>
           )}

           {activeTab === "personal" && (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 animate-in fade-in duration-300">
                <DetailItem label="House / Street" value={employee.personalDetails?.address} />
                <DetailItem label="City" value={employee.personalDetails?.city} />
                <DetailItem label="State" value={employee.personalDetails?.state} />
                <DetailItem label="Zip Code" value={employee.personalDetails?.zipCode} />
                <DetailItem label="Nationality" value={employee.personalDetails?.nationality} />
                <DetailItem label="Emergency Contact" value={employee.personalDetails?.emergencyContact} />
                <DetailItem label="Emergency Phone" value={employee.personalDetails?.emergencyPhone} />
             </div>
           )}

           {activeTab === "bank" && (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 animate-in fade-in duration-300">
                <DetailItem label="Bank Name" value={employee.bankDetails?.bankName} />
                <DetailItem label="Account Holder" value={employee.bankDetails?.accountHolderName} />
                <DetailItem label="Account Number" value={employee.bankDetails?.accountNumber} />
                <DetailItem label="IFSC / Routing" value={employee.bankDetails?.ifscCode} />
             </div>
           )}

           {activeTab === "documents" && (
             <div className="animate-in fade-in duration-300">
                <h3 className="font-semibold text-gray-900 mb-4">Uploaded Documents</h3>
                {!employee.documents?.length && <p className="text-gray-500 italic">No documents uploaded.</p>}
                <div className="space-y-3">
                   {employee.documents?.map((doc, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100 hover:shadow-sm transition">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                             <span className="text-red-500 text-xs font-bold">PDF</span>
                           </div>
                           <div>
                             <p className="font-medium text-gray-900">{doc.name}</p>
                             <p className="text-xs text-gray-500">Uploaded on {doc.uploadDate}</p>
                           </div>
                        </div>
                        <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">Download</button>
                      </div>
                   ))}
                </div>
             </div>
           )}
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-white transition"
          >
            Close
          </button>
          


          {onEdit && ['HR', 'Admin'].includes(currentUserRole) && (
            <div className="flex gap-3">
                 <button
                    onClick={async () => {
                        if (confirm(`Are you sure you want to ${employee.active ? 'deactivate' : 'activate'} this employee? ${!employee.active ? 'They will receive a welcome email.' : ''}`)) {
                             try {
                                 const res = await fetch(`/api/employees/${employee.id}/toggle-active`, {
                                     method: 'POST',
                                     headers: { 'Content-Type': 'application/json' },
                                     body: JSON.stringify({ active: !employee.active })
                                 });
                                 if(!res.ok) throw new Error('Failed');
                                 onClose(); 
                                 window.location.reload(); // Simple refresh for now
                             } catch(e) {
                                 alert('Failed to update status')
                             }
                        }
                    }}
                    className={`px-6 py-2 border rounded-lg font-medium transition ${employee.active ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-green-200 text-green-600 hover:bg-green-50'}`}
                >
                    {employee.active ? 'Deactivate' : 'Activate User'}
                </button>
            <button
            onClick={() => onEdit(employee)}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition"
          >
            Edit Profile
          </button>
          </div>
          )}
        </div>
      </div>
    </div>
  )
}

function DetailItem({ label, value }: { label: string, value?: string | number }) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-500 block mb-1">{label}</label>
      <p className="text-lg font-medium text-gray-900">{value || "—"}</p>
    </div>
  )
}
