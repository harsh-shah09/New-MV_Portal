"use client"

import { useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Briefcase, 
  CreditCard, 
  FileText, 
  Edit3, 
  Save, 
  X, 
  Upload, 
  Camera, 
  Plus, 
  Trash2,
  Download,
  Building2,
  CheckCircle2
} from "lucide-react"
import { message, Spin, Select } from "antd"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { cn } from "@/lib/utils"
import { Field } from "./field-component"

interface ViewProps {
  employeeId: string;
}

export function EmployeeProfileView({ employeeId }: ViewProps) {
  const [activeTab, setActiveTab] = useState<"personal" | "employment" | "bank" | "documents">("personal")
  const [isEditing, setIsEditing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()

  // --- Data Fetching ---
  const { data: employee, isLoading } = useQuery({
    queryKey: ["employee", employeeId],
    queryFn: async () => {
      const res = await fetch(`/api/employees/${employeeId}`)
      if (!res.ok) throw new Error("Failed to fetch")
      return res.json()
    }
  })

    // Fetch all employees for Team Lead dropdown
    const { data: employeesList, isLoading: loadingEmployeesList } = useQuery({
        queryKey: ['employeesList'],
        queryFn: async () => {
            const res = await fetch('/api/employees')
            if (!res.ok) throw new Error('Failed to fetch employees')
            return res.json()
        }
    })

    // Resolve a readable name for the stored Team Lead id (fallbacks to relationship or lookup in employeesList)
    const teamLeadName = employee?.Team_Lead__r?.Name || (
        employeesList?.find((e: any) => e.Id === employee?.Team_Lead__c)
            ? `${employeesList.find((e: any) => e.Id === employee?.Team_Lead__c).Contact__r?.FirstName || ''} ${employeesList.find((e: any) => e.Id === employee?.Team_Lead__c).Contact__r?.LastName || ''}`.trim()
            : null
    )

  // --- Mutations ---
  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`/api/employees/${employeeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, contactId: employee.contact?.Id || employee.Contact__c })
      })
      if (!res.ok) throw new Error("Update failed")
      return res.json()
    },
    onSuccess: () => {
      message.success("Profile updated successfully")
      setIsEditing(false)
      queryClient.invalidateQueries({ queryKey: ["employee", employeeId] })
    },
    onError: () => message.error("Failed to update profile")
  })

  
  const uploadMutation = useMutation({
    mutationFn: async ({ file, type }: { file: File, type: string }) => {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("employeeId", employeeId)
      formData.append("contactId", employee.contact?.Id)
      formData.append("type", type)

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData
      })
      if (!res.ok) throw new Error("Upload failed")
      return res.json()
    },
    onSuccess: () => {
      message.success("File uploaded successfully")
      queryClient.invalidateQueries({ queryKey: ["employee", employeeId] })
    },
    onError: () => message.error("Upload failed")
  })

  // --- Handlers ---
  const [formData, setFormData] = useState<any>({})

    const handleEditToggle = () => {
        if (isEditing) {
             // Cancel
             setIsEditing(false)
             setFormData({})
        } else {
             // Start Edit - Flatten data for form
             setFormData({
                 FirstName: employee.contact?.FirstName,
                 LastName: employee.contact?.LastName,
                 Email: employee.contact?.Email,
                 Phone: employee.contact?.Phone,
                 Birthdate: employee.contact?.Birthdate,
                 Gender__c: employee.contact?.Gender__c,
                 MailingStreet: employee.contact?.MailingStreet,
                 MailingCity: employee.contact?.MailingCity,
                 MailingState: employee.contact?.MailingState,
                 MailingPostalCode: employee.contact?.MailingPostalCode,
                 MailingCountry: employee.contact?.MailingCountry,
                 Emergency_Contact_Name__c: employee.contact?.Emergency_Contact_Name__c,
                 Emergency_Contact_Number__c: employee.contact?.Emergency_Contact_Number__c,
                 Experience__c: employee.contact?.Experience__c,
                 Department__c: employee.contact?.Department__c,
                 Employee_Role__c: employee.contact?.Employee_Role__c,
                 Employee_Title__c: employee.contact?.Employee_Title__c,
                 Team_Lead__c: employee.Team_Lead__c,
                 Joining_Date__c: employee.Joining_Date__c,
                 Base_Salary__c: employee.Base_Salary__c,
                 Salary_CTC__c: employee.Salary_CTC__c
             })
             setIsEditing(true)
        }
    }

  const handleSave = () => {
      updateMutation.mutate(formData)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.[0]) {
          uploadMutation.mutate({ file: e.target.files[0], type: 'profile_photo' })
      }
  }

  // --- Additional States ---
  const [showBankForm, setShowBankForm] = useState(false)
  const [bankFormData, setBankFormData] = useState({
      Name: '',
      Bank_Branch_Name__c: '',
      Bank_Account_Number__c: '',
      IFSC__c: '',
      Primary_Account__c: false
  })

  const [showDocModal, setShowDocModal] = useState(false)
  const [docFile, setDocFile] = useState<File | null>(null)
  const [docCategory, setDocCategory] = useState("Intern Docs")
  const [docType, setDocType] = useState("Resume")

  // --- Bank Mutation ---
  const addBankMutation = useMutation({
      mutationFn: async (data: any) => {
          const res = await fetch(`/api/employees/${employeeId}/bank`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data)
          })
          if (!res.ok) throw new Error("Failed to add bank")
          return res.json()
      },
      onSuccess: () => {
          message.success("Bank account added")
          setShowBankForm(false)
          setBankFormData({ Name: '', Bank_Branch_Name__c: '', Bank_Account_Number__c: '', IFSC__c: '', Primary_Account__c: false })
          queryClient.invalidateQueries({ queryKey: ["employee", employeeId] })
      },
      onError: () => message.error("Failed to add bank account")
  })

  const handleAddBank = () => {
      if(!bankFormData.Name || !bankFormData.Bank_Account_Number__c) {
          message.error("Bank Name and Account Number are required")
          return;
      }
      addBankMutation.mutate(bankFormData)
  }

  // --- Document Upload Handler override ---
  const handleDocUploadSubmit = () => {
      if (!docFile) {
          message.error("Please select a file")
          return;
      }
      // Use existing uploadMutation but pass extras
      const formData = new FormData()
      formData.append("file", docFile)
      formData.append("employeeId", employeeId)
      formData.append("type", "document") // Generic type for API logic
      formData.append("category", docCategory)
      formData.append("docType", docType)
      
      // We need to bypass the standard mutation call which expects specific args
      // So we'll call API directly or create a new mutation. 
      // Actually simpler to just add a specific mutation for docs with metadata
      // Or modify the existing one. Let's create a specialized one here for clarity or use provided one if flexible.
      // The current uploadMutation takes {file, type}.
      // Let's make a new one or cast payload.
      
      customDocMutation.mutate(formData)
  }

  const customDocMutation = useMutation({
      mutationFn: async (formData: FormData) => {
        const res = await fetch("/api/upload", {
            method: "POST",
            body: formData
        })
        if (!res.ok) throw new Error("Upload failed")
        return res.json()
      },
      onSuccess: () => {
          message.success("Document uploaded")
          setShowDocModal(false)
          setDocFile(null)
          queryClient.invalidateQueries({ queryKey: ["employee", employeeId] })
      },
      onError: () => message.error("Upload failed")
  })


  if (isLoading) return <div className="flex h-screen items-center justify-center"><Spin size="large" /></div>
  if (!employee) return <div className="flex h-screen items-center justify-center text-red-500">Employee not found</div>

  return (
    <div className="max-w-7xl mx-auto p-6 lg:p-10 space-y-8 animate-in fade-in duration-500 relative">
      
      {/* Header Profile Card */}
      <div className="relative bg-white rounded-3xl p-8 border border-slate-100 shadow-xl overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-cyan-500 to-blue-600"></div>
        
        <div className="relative flex flex-col md:flex-row gap-6 items-end md:items-center mt-12">
           {/* Avatar */}
           <div className="relative group">
              <div className="w-32 h-32 rounded-full border-4 border-white shadow-lg bg-slate-200 flex items-center justify-center overflow-hidden">
                  {employee.Profile_Photo__c && !uploadMutation.isPending ? (
                      <Image key={employee.Profile_Photo__c} src={employee.Profile_Photo__c} alt="Profile" width={128} height={128} className="w-full h-full object-cover" />
                  ) : uploadMutation.isPending ? (
                      <Spin size="small" />
                  ) : (
                      <User className="w-12 h-12 text-slate-400" />
                  )}
              </div>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-1 right-1 p-2 rounded-full bg-slate-900 text-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black"
                title="Change Photo"
               >
                 <Camera className="w-4 h-4" />
              </button>
              <input type="file" hidden ref={fileInputRef} accept="image/*" onChange={handleFileChange} />
           </div>

           {/* Info */}
           <div className="flex-1 mb-2">
               <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
                   <div>
                       <h1 className="text-3xl font-bold text-slate-900">{employee.contact?.FirstName} {employee.contact?.LastName}</h1>
                       <div className="flex items-center gap-3 text-slate-500 mt-1">
                          <span className="flex items-center gap-1"><Briefcase className="w-4 h-4" /> {employee.contact?.Employee_Role__c || "Role not set"}</span>
                          <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                          <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {employee.contact?.MailingCity || "Location not set"}</span>
                       </div>
                   </div>
                   <div className="flex gap-3">
                       {(!isEditing) ? (
                           <button 
                             onClick={handleEditToggle}
                             className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition"
                           >
                             <Edit3 className="w-4 h-4" /> Edit Profile
                           </button>
                       ) : (
                           <>
                             <button 
                               onClick={handleEditToggle}
                               className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition"
                             >
                               <X className="w-4 h-4" /> Cancel
                             </button>
                             <button 
                               onClick={handleSave}
                               className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition shadow-lg shadow-blue-500/20"
                             >
                               {updateMutation.isPending ? <Spin size="small" /> : <Save className="w-4 h-4" />} Save Changes
                             </button>
                           </>
                       )}
                   </div>
               </div>
           </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Sidebar Nav */}
          <div className="lg:col-span-1">
             <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-2 space-y-1">
                 {[
                     { id: "personal", label: "Personal Details", icon: User },
                     { id: "employment", label: "Employment Info", icon: Building2 },
                     { id: "bank", label: "Bank Details", icon: CreditCard },
                     { id: "documents", label: "Documents", icon: FileText },
                 ].map((tab) => (
                     <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={cn(
                            "w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200",
                            activeTab === tab.id 
                                ? "bg-blue-50 text-blue-700 shadow-sm" 
                                : "text-slate-600 hover:bg-slate-50"
                        )}
                     >
                        <tab.icon className={cn("w-5 h-5", activeTab === tab.id ? "text-blue-600" : "text-slate-400")} />
                        {tab.label}
                     </button>
                 ))}
             </div>

             {/* Quick Stats or Info */}
             <div className="mt-6 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-xl">
                 <h3 className="font-bold text-lg mb-4">Emp Status</h3>
                 <div className="space-y-4">
                     <div>
                         <p className="text-slate-400 text-xs uppercase tracking-wider">Status</p>
                         <p className="font-semibold flex items-center gap-2">
                             <span className="w-2 h-2 rounded-full bg-green-400"></span> 
                             {employee.Status__c || "Active"}
                         </p>
                     </div>
                     <div>
                         <p className="text-slate-400 text-xs uppercase tracking-wider">Employee ID</p>
                         <p className="font-mono">{employee.contact?.Id?.slice(0, 8)}...</p>
                     </div>
                 </div>
             </div>
          </div>

          {/* Tab Content */}
          <div className="lg:col-span-3">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 min-h-[500px]">
                  <AnimatePresence mode="wait">
                      <motion.div
                         key={activeTab}
                         initial={{ opacity: 0, y: 10 }}
                         animate={{ opacity: 1, y: 0 }}
                         exit={{ opacity: 0, y: -10 }}
                         transition={{ duration: 0.2 }}
                      >
                          {activeTab === "personal" && (
                              <div className="space-y-8">
                                  <div>
                                      <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                                          <User className="w-5 h-5 text-blue-500" /> Basic Information
                                      </h2>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                          <Field label="First Name" value={employee.contact?.FirstName} fieldKey="FirstName" isEditing={isEditing} formData={formData} setFormData={setFormData} />
                                          <Field label="Last Name" value={employee.contact?.LastName} fieldKey="LastName" isEditing={isEditing} formData={formData} setFormData={setFormData} />
                                          <Field label="Email Address" value={employee.contact?.Email} fieldKey="Email" type="email" isEditing={isEditing} formData={formData} setFormData={setFormData} />
                                          <Field label="Phone Number" value={employee.contact?.Phone} fieldKey="Phone" type="tel" isEditing={isEditing} formData={formData} setFormData={setFormData} />
                                          <Field label="Date of Birth" value={employee.contact?.Birthdate} fieldKey="Birthdate" type="date" isEditing={isEditing} formData={formData} setFormData={setFormData} />
                                          <Field label="Gender" value={employee.contact?.Gender__c} fieldKey="Gender__c" isEditing={isEditing} formData={formData} setFormData={setFormData} />
                                      </div>
                                  </div>

                                  <div className="border-t border-slate-100 pt-8">
                                      <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                                          <MapPin className="w-5 h-5 text-indigo-500" /> Address
                                      </h2>
                                      <div className="grid grid-cols-1 gap-y-6">
                                          <Field label="Street" value={employee.contact?.MailingStreet} fieldKey="MailingStreet" isEditing={isEditing} formData={formData} setFormData={setFormData} />
                                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                             <Field label="City" value={employee.contact?.MailingCity} fieldKey="MailingCity" isEditing={isEditing} formData={formData} setFormData={setFormData} />
                                             <Field label="State" value={employee.contact?.MailingState} fieldKey="MailingState" isEditing={isEditing} formData={formData} setFormData={setFormData} />
                                             <Field label="Zip / Postal" value={employee.contact?.MailingPostalCode} fieldKey="MailingPostalCode" isEditing={isEditing} formData={formData} setFormData={setFormData} />
                                          </div>
                                          <Field label="Country" value={employee.contact?.MailingCountry} fieldKey="MailingCountry" isEditing={isEditing} formData={formData} setFormData={setFormData} />
                                      </div>
                                  </div>

                                  <div className="border-t border-slate-100 pt-8">
                                      <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                                          <Phone className="w-5 h-5 text-red-500" /> Emergency Contact
                                      </h2>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                          <Field label="Contact Name" value={employee.contact?.Emergency_Contact_Name__c} fieldKey="Emergency_Contact_Name__c" isEditing={isEditing} formData={formData} setFormData={setFormData} />
                                          <Field label="Contact Number" value={employee.contact?.Emergency_Contact_Number__c} fieldKey="Emergency_Contact_Number__c" isEditing={isEditing} formData={formData} setFormData={setFormData} />
                                      </div>
                                  </div>
                              </div>
                          )}

                          {activeTab === "employment" && (
                               <div className="space-y-8">
                                  <div>
                                      <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                                          <Briefcase className="w-5 h-5 text-blue-500" /> Employment Details
                                      </h2>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                          <Field label="Department" value={employee.contact?.Department__c} fieldKey="Department__c" isEditing={isEditing} formData={formData} setFormData={setFormData} />
                                          <Field label="Role" value={employee.contact?.Employee_Role__c} fieldKey="Employee_Role__c" isEditing={isEditing} formData={formData} setFormData={setFormData} />
                                          <Field label="Job Title" value={employee.contact?.Employee_Title__c} fieldKey="Employee_Title__c" isEditing={isEditing} formData={formData} setFormData={setFormData} />
                                          <Field label="Joining Date" value={employee.Joining_Date__c} fieldKey="Joining_Date__c" type="date" isEditing={isEditing} formData={formData} setFormData={setFormData} />
                                          <Field label="Total Experience" value={employee.contact?.Experience__c} fieldKey="Experience__c" isEditing={isEditing} formData={formData} setFormData={setFormData} />
                                          <div className="space-y-1 flex flex-col">
                                              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Manager / Team Lead</label>
                                              {isEditing ? (
                                                  loadingEmployeesList ? (
                                                      <div className="py-2"><Spin /></div>
                                                  ) : (
                                                      <Select
                                                          showSearch
                                                          placeholder="Select Manager"
                                                          value={formData.Team_Lead__c !== undefined ? formData.Team_Lead__c : employee.Team_Lead__c}
                                                          onChange={(val: any) => setFormData({ ...formData, Team_Lead__c: val })}
                                                          options={employeesList?.filter((e: any) => e.Id !== employeeId).map((e: any) => ({
                                                              value: e.Id,
                                                              label: `${e.contact?.FirstName || e.Contact__r?.FirstName || ''} ${e.contact?.LastName || e.Contact__r?.LastName || ''}`.trim()
                                                          }))}
                                                          allowClear
                                                      />
                                                  )
                                              ) : (
                                                  <p className="font-medium text-slate-800 text-sm break-words">{teamLeadName || employee.Team_Lead__c || <span className="text-slate-400 italic">Not set</span>}</p>
                                              )}
                                          </div>
                                      </div>
                                  </div>

                                  <div className="border-t border-slate-100 pt-8">
                                      <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                                          <CreditCard className="w-5 h-5 text-green-500" /> Compensation
                                      </h2>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                          <Field label="Base Salary" value={employee.Base_Salary__c} fieldKey="Base_Salary__c" type="number" isEditing={isEditing} formData={formData} setFormData={setFormData} />
                                          <Field label="CTC" value={employee.Salary_CTC__c} fieldKey="Salary_CTC__c" type="number" isEditing={isEditing} formData={formData} setFormData={setFormData} />
                                      </div>
                                  </div>
                               </div>
                          )}

                          {activeTab === "bank" && (
                              <div>
                                  <div className="flex justify-between items-center mb-6">
                                      <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                          <Building2 className="w-5 h-5 text-purple-500" /> Bank Accounts
                                      </h2>
                                      <button 
                                        onClick={() => setShowBankForm(true)}
                                        className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                      >
                                          <Plus className="w-4 h-4" /> Add Account
                                      </button>
                                  </div>

                                  {showBankForm && (
                                      <div className="mb-6 p-6 bg-slate-50 border border-blue-100 rounded-xl animate-in fade-in slide-in-from-top-2">
                                          <h3 className="font-semibold text-slate-800 mb-4">Add New Bank Account</h3>
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                              <input placeholder="Bank Name" className="input-std" value={bankFormData.Name} onChange={e => setBankFormData({...bankFormData, Name: e.target.value})} />
                                              <input placeholder="Branch Name" className="input-std" value={bankFormData.Bank_Branch_Name__c} onChange={e => setBankFormData({...bankFormData, Bank_Branch_Name__c: e.target.value})} />
                                              <input placeholder="Account Number" className="input-std" value={bankFormData.Bank_Account_Number__c} onChange={e => setBankFormData({...bankFormData, Bank_Account_Number__c: e.target.value})} />
                                              <input placeholder="IFSC Code" className="input-std" value={bankFormData.IFSC__c} onChange={e => setBankFormData({...bankFormData, IFSC__c: e.target.value})} />
                                          </div>
                                          <div className="flex items-center gap-2 mb-4">
                                              <input type="checkbox" id="primary" checked={bankFormData.Primary_Account__c} onChange={e => setBankFormData({...bankFormData, Primary_Account__c: e.target.checked})} />
                                              <label htmlFor="primary" className="text-sm text-slate-700">Set as Primary Account</label>
                                          </div>
                                          <div className="flex justify-end gap-3">
                                              <button onClick={() => setShowBankForm(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg text-sm">Cancel</button>
                                              <button onClick={handleAddBank} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Save Account</button>
                                          </div>
                                      </div>
                                  )}
                                  
                                  {employee.bankDetails?.length > 0 ? (
                                      <div className="grid grid-cols-1 gap-4">
                                          {employee.bankDetails.map((bank: any) => (
                                              <div key={bank.Id} className="p-4 border border-slate-200 rounded-xl hover:shadow-md transition bg-white">
                                                  <div className="flex justify-between items-start mb-2">
                                                      <div>
                                                          <h4 className="font-bold text-slate-800">{bank.Name}</h4>
                                                          <p className="text-sm text-slate-500">{bank.Bank_Branch_Name__c}</p>
                                                      </div>
                                                      {bank.Primary_Account__c && (
                                                          <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">Primary</span>
                                                      )}
                                                  </div>
                                                  <div className="grid grid-cols-2 gap-4 mt-4 opacity-80">
                                                      <div>
                                                          <span className="text-xs text-slate-400 block uppercase">Account Number</span>
                                                          <span className="font-mono text-sm">{bank.Bank_Account_Number__c}</span>
                                                      </div>
                                                      <div>
                                                          <span className="text-xs text-slate-400 block uppercase">IFSC Code</span>
                                                          <span className="font-mono text-sm">{bank.IFSC__c}</span>
                                                      </div>
                                                  </div>
                                              </div>
                                          ))}
                                      </div>
                                  ) : (
                                      !showBankForm && (
                                        <div className="text-center py-12 bg-slate-50 rounded-xl border-dashed border-2 border-slate-200">
                                            <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                            <p className="text-slate-500">No bank accounts added yet.</p>
                                        </div>
                                      )
                                  )}
                              </div>
                          )}

                          {activeTab === "documents" && (
                              <div>
                                   <div className="flex justify-between items-center mb-6">
                                      <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                          <FileText className="w-5 h-5 text-orange-500" /> Documents
                                      </h2>
                                      <button 
                                        onClick={() => setShowDocModal(true)}
                                        className="text-sm font-semibold bg-blue-50 text-blue-600 hover:bg-blue-100 px-4 py-2 rounded-lg flex items-center gap-2 transition"
                                      >
                                          <Upload className="w-4 h-4" /> Upload Document
                                      </button>
                                  </div>

                                  {showDocModal && (
                                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
                                       <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md space-y-4">
                                           <h3 className="text-lg font-bold text-slate-800">Upload Document</h3>
                                           
                                           <div className="space-y-3">
                                               <div>
                                                   <label className="block text-sm font-medium text-slate-700 mb-1">Document Category</label>
                                                   <select 
                                                      className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-slate-50"
                                                      value={docCategory}
                                                      onChange={(e) => setDocCategory(e.target.value)}
                                                   >
                                                       <option value="Intern Docs">Intern Docs</option>
                                                       <option value="Fresher Docs">Fresher Docs</option>
                                                       <option value="Experience Docs">Experience Docs</option>
                                                       <option value="Personal">Personal Docs</option>
                                                   </select>
                                               </div>
                                               <div>
                                                   <label className="block text-sm font-medium text-slate-700 mb-1">Document Type</label>
                                                   <select 
                                                      className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-slate-50"
                                                      value={docType}
                                                      onChange={(e) => setDocType(e.target.value)}
                                                   >
                                                       <option value="Resume">Resume</option>
                                                       <option value="Offer Letter">Offer Letter</option>
                                                       <option value="ID Proof">ID Proof</option>
                                                       <option value="Certificate">Certificate</option>
                                                       <option value="Payslip">Payslip</option>
                                                       <option value="Other">Other</option>
                                                   </select>
                                               </div>
                                               <div>
                                                   <label className="block text-sm font-medium text-slate-700 mb-1">File</label>
                                                   <input 
                                                      type="file" 
                                                      className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" 
                                                      onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                                                   />
                                               </div>
                                           </div>

                                           <div className="flex justify-end gap-3 mt-6">
                                               <button onClick={() => {setShowDocModal(false); setDocFile(null)}} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm">Cancel</button>
                                               <button 
                                                  onClick={handleDocUploadSubmit} 
                                                  disabled={!docFile || customDocMutation.isPending}
                                                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                                               >
                                                  {customDocMutation.isPending && <Spin size="small" className="text-white" />} Upload
                                               </button>
                                           </div>
                                       </div>
                                    </div>
                                  )}

                                  {employee.documents?.length > 0 ? (
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                          {employee.documents.map((doc: any) => (
                                              <div key={doc.Id} className="group p-4 border border-slate-200 rounded-xl hover:border-blue-300 hover:bg-blue-50/10 transition relative">
                                                  <div className="flex items-start gap-3">
                                                      <div className="w-10 h-10 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                                                          <FileText className="w-5 h-5" />
                                                      </div>
                                                      <div className="flex-1 min-w-0">
                                                          <h4 className="font-semibold text-slate-800 truncate" title={doc.Document_Type__c}>{doc.Document_Type__c}</h4>
                                                          <p className="text-xs text-slate-500">{doc.Document_Category__c} • {doc.Status__c}</p>
                                                      </div>
                                                  </div>
                                                  <div className="mt-4 flex gap-2">
                                                      <a 
                                                        href={doc.File_URL__c} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="flex-1 bg-white border border-slate-200 text-slate-600 text-xs font-semibold py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-slate-50 transition"
                                                      >
                                                          <Download className="w-3 h-3" /> View
                                                      </a>
                                                  </div>
                                              </div>
                                          ))}
                                      </div>
                                  ) : (
                                       <div className="text-center py-12 bg-slate-50 rounded-xl border-dashed border-2 border-slate-200">
                                          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                          <p className="text-slate-500">No documents uploaded yet.</p>
                                      </div>
                                  )}
                              </div>
                          )}
                      </motion.div>
                  </AnimatePresence>
              </div>
          </div>
      </div>
      <style jsx global>{`
        .input-std {
            @apply w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition;
        }
      `}</style>
    </div>
  )
}
