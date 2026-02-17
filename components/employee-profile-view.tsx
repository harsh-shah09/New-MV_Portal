"use client"

import { useState, useRef, useEffect } from "react"
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
  CheckCircle2,
  Shield,
  Lock,
  Power,
  AlertTriangle,
  Laptop,
  History,
  ChevronDown,
  ChevronUp
} from "lucide-react"
import { generate2FASecretAction, verifyAndEnable2FAAction, disable2FAAction, getEmployeeTitles } from "@/app/employees/[id]/actions"
import { message, Spin, Select, Modal } from "antd"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { cn } from "@/lib/utils"
import { Field } from "./field-component"

interface ViewProps {
  employeeId: string;
  currentUserRole?: string;
}

export function EmployeeProfileView({ employeeId, currentUserRole = "Employee" }: ViewProps) {
  const [activeTab, setActiveTab] = useState<"personal" | "employment" | "bank" | "documents" | "security" | "assets">("personal")
  const [showAssetHistory, setShowAssetHistory] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()
  const [titles, setTitles] = useState<{ label: string, value: string }[]>([])

  useEffect(() => {
    getEmployeeTitles().then(setTitles).catch(console.error)
  }, [])

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
    const teamLeadName = employee?.Team_Lead__r?.Employee_Name__c || (
        employeesList?.find((e: any) => e.Id === employee?.Team_Lead__c)
            ? employeesList.find((e: any) => e.Id === employee?.Team_Lead__c).Employee_Name__c
            : null
    )

  // --- Mutations ---
  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`/api/employees/${employeeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
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
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [warningMsg, setWarningMsg] = useState<string | null>(null)

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    // Basic Text & Email Validation
    if (formData.Employee_Email__c && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.Employee_Email__c)) {
      newErrors.Employee_Email__c = "Please enter a valid email address"
    }

    if (formData.Employee_Phone__c && !/^\+?[\d\s-]{10,}$/.test(formData.Employee_Phone__c)) {
      newErrors.Employee_Phone__c = "Please enter a valid phone number (min 10 digits)"
    }

    if (formData.Emergency_Contact_Number__c && !/^\+?[\d\s-]{10,}$/.test(formData.Emergency_Contact_Number__c)) {
      newErrors.Emergency_Contact_Number__c = "Please enter a valid emergency contact number"
    }

    // Date Validation
    if (formData.Birthdate__c) {
      const dob = new Date(formData.Birthdate__c)
      if (dob > new Date()) {
        newErrors.Birthdate__c = "Date of birth cannot be in the future"
      }
    }

    if (formData.Joining_Date__c && formData.Birthdate__c) {
        if (new Date(formData.Joining_Date__c) < new Date(formData.Birthdate__c)) {
            newErrors.Joining_Date__c = "Joining date cannot be before birth date"
        }
    }
    
    // Required Fields (Example)
    if (!formData.Employee_Name__c) newErrors.Employee_Name__c = "Name is required"
    if (!formData.Role__c) newErrors.Role__c = "Role is required"
    if (!formData.Department__c) newErrors.Department__c = "Department is required"

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleEditToggle = () => {
    if (isEditing) {
        setIsEditing(false)
        setFormData({})
        setErrors({})
        setWarningMsg(null)
    } else {
        setFormData({
             Employee_Name__c: employee.Employee_Name__c,
             Employee_Email__c: employee.Employee_Email__c,
             Employee_Phone__c: employee.Employee_Phone__c,
             Birthdate__c: employee.Birthdate__c,
             Gender__c: employee.Gender__c,
             
             Employee_Address__c: employee.Employee_Address__c || {}, 
    
             Employee_Address__Street__s: employee.Employee_Address__c?.street || '',
             Employee_Address__City__s: employee.Employee_Address__c?.city || '',
             Employee_Address__StateCode__s: employee.Employee_Address__c?.state || '',
             Employee_Address__PostalCode__s: employee.Employee_Address__c?.postalCode || '',
             Employee_Address__CountryCode__s: employee.Employee_Address__c?.country || '',

             Emergency_Contact_Name__c: employee.Emergency_Contact_Name__c,
             Emergency_Contact_Number__c: employee.Emergency_Contact_Number__c,
             Experience__c: employee.Experience__c,
             Department__c: employee.Department__c,
             Role__c: employee.Role__c,
             Title__c: employee.Title__c,
             Team_Lead__c: employee.Team_Lead__c,
             Joining_Date__c: employee.Joining_Date__c,
             Base_Salary__c: employee.Base_Salary__c,
             Salary_CTC__c: employee.Salary_CTC__c
          })
          setIsEditing(true)
    }
  }

  const handleSave = () => {
      if (validateForm()) {
        setWarningMsg(null)
        
        // Prepare payload with Address Object
        const payload = { ...formData };
        payload.Employee_Address__c = {
            street: formData.Employee_Address__Street__s,
            city: formData.Employee_Address__City__s,
            state: formData.Employee_Address__StateCode__s,
            postalCode: formData.Employee_Address__PostalCode__s,
            country: formData.Employee_Address__CountryCode__s
        };
        
        // Remove flattened address fields from payload
        delete payload.Employee_Address__Street__s;
        delete payload.Employee_Address__City__s;
        delete payload.Employee_Address__StateCode__s;
        delete payload.Employee_Address__PostalCode__s;
        delete payload.Employee_Address__CountryCode__s;

        updateMutation.mutate(payload)
      } else {
        setWarningMsg("Please fix the validation errors before saving.")
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
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
  const [bankErrors, setBankErrors] = useState<Record<string, string>>({})

  const [showDocModal, setShowDocModal] = useState(false)
  const [docFile, setDocFile] = useState<File | null>(null)
  const [docCategory, setDocCategory] = useState("Intern Docs")
  const [docType, setDocType] = useState("Resume")

  // --- Admin Configs ---
  const { data: adminConfigs } = useQuery({
    queryKey: ["admin-configs"],
    queryFn: async () => {
      const res = await fetch("/api/admin/configurations")
      if (!res.ok) throw new Error("Failed to fetch configs")
      return res.json()
    },
    staleTime: 1000 * 60 * 5 // 5 minutes
  })

  // Grouped Document Configs: Category -> Types
  const docConfigMap = adminConfigs?.documents?.reduce((acc: any, doc: any) => {
      const category = doc.MasterLabel; 
      const rawType = doc.Value__c || "";
      const types = rawType.split(',').map((t: string) => t.trim()).filter(Boolean);
      
      if (!acc[category]) acc[category] = [];
      if (types.length > 0) acc[category].push(...types);
      return acc;
  }, {}) || {};
  
  const docCategories = Object.keys(docConfigMap);

  // Auto-select Category based on Role
  useEffect(() => {
    if (showDocModal && employee?.Role__c && docCategories.length > 0) {
        const role = employee.Role__c.toLowerCase();
        // Check if any category includes the role or vice versa
        const matchingCategory = docCategories.find(cat => 
            cat.toLowerCase().includes(role) || role.includes(cat.toLowerCase())
        );

        if (matchingCategory) {
            setDocCategory(matchingCategory);
            const types = docConfigMap[matchingCategory];
            if (types && types.length > 0) setDocType(types[0]);
        } else if (!docCategory && docCategories.length > 0) {
             // Default to first if nothing selected
             setDocCategory(docCategories[0]);
             const types = docConfigMap[docCategories[0]];
             if (types && types.length > 0) setDocType(types[0]);
        }
    }
  }, [showDocModal, employee, adminConfigs]);

  // Update types when category changes manually
  useEffect(() => {
     if (docCategory && docConfigMap[docCategory]) {
         const types = docConfigMap[docCategory];
         if (!types.includes(docType)) {
             setDocType(types[0] || "");
         }
     }
  }, [docCategory, adminConfigs]);

  // --- 2FA States ---
  const [show2FAModal, setShow2FAModal] = useState(false)
  const [twoFASecret, setTwoFASecret] = useState("")
  const [twoFAQRCode, setTwoFAQRCode] = useState("")
  const [otpCode, setOtpCode] = useState("")
  const [is2FALoading, setIs2FALoading] = useState(false)

  const handleSetup2FA = async () => {
       setIs2FALoading(true)
       try {
           const res = await generate2FASecretAction(employeeId)
           if (res.error) {
               message.error(res.error)
           } else {
               setTwoFASecret(res.secret || "")
               setTwoFAQRCode(res.qrCode || "")
               setShow2FAModal(true)
           }
       } catch (e) {
           message.error("Failed to start 2FA setup")
       } finally {
           setIs2FALoading(false)
       }
  }

  const handleVerify2FA = async () => {
      if (!otpCode || otpCode.length !== 6) {
          message.error("Please enter a valid 6-digit code")
          return
      }
      setIs2FALoading(true)
      try {
          const res = await verifyAndEnable2FAAction(employeeId, twoFASecret, otpCode)
          if (res.success) {
              message.success("2FA Enabled Successfully")
              setShow2FAModal(false)
              setOtpCode("")
              setTwoFASecret("")
              setTwoFAQRCode("")
              queryClient.invalidateQueries({ queryKey: ["employee", employeeId] })
          } else {
              message.error(res.error || "Verification failed")
          }
      } catch (e) {
          message.error("Verification failed")
      } finally {
          setIs2FALoading(false)
      }
  }

  const handleDisable2FA = async () => {
      try {
          const res = await disable2FAAction(employeeId)
          if (res.success) {
              message.success("2FA Disabled")
              queryClient.invalidateQueries({ queryKey: ["employee", employeeId] })
          } else {
              message.error("Failed to disable 2FA")
          }
      } catch (e) {
          message.error("Failed to disable 2FA")
      }
  }

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
          setBankErrors({})
          queryClient.invalidateQueries({ queryKey: ["employee", employeeId] })
      },
      onError: () => message.error("Failed to add bank account")
  })

  // --- Delete Bank Mutation ---
  const deleteBankMutation = useMutation({
      mutationFn: async (bankId: string) => {
          const res = await fetch(`/api/employees/${employeeId}/bank?bankId=${bankId}`, {
              method: 'DELETE'
          })
          if (!res.ok) throw new Error("Failed to delete bank")
          return res.json()
      },
      onSuccess: () => {
          message.success("Bank account removed")
          queryClient.invalidateQueries({ queryKey: ["employee", employeeId] })
      },
      onError: () => message.error("Failed to remove bank account")
  })

  const handleAddBank = () => {
      const newErrors: Record<string, string> = {}
    
      if(!bankFormData.Name) newErrors.Name = "Bank Name is required"
      if(!bankFormData.Bank_Branch_Name__c) newErrors.Bank_Branch_Name__c = "Branch Name is required"
    
      if(!bankFormData.Bank_Account_Number__c) {
          newErrors.Bank_Account_Number__c = "Account Number is required"
      } else if(!/^\d{9,18}$/.test(bankFormData.Bank_Account_Number__c)) {
          newErrors.Bank_Account_Number__c = "Invalid account number (9-18 digits)"
      }

      if(!bankFormData.IFSC__c) {
          newErrors.IFSC__c = "IFSC Code is required"
      } else if(!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(bankFormData.IFSC__c)) {
          newErrors.IFSC__c = "Invalid IFSC Code format"
      }

      // Check Primary Validation
      if (bankFormData.Primary_Account__c) {
          const existingPrimary = employee.bankDetails?.find((b: any) => b.Primary_Account__c === true);
          if (existingPrimary) {
               message.warning("A primary account already exists. Only one account can be primary.");
               // We prevent submission
               return; 
          }
      }

      setBankErrors(newErrors)

      if (Object.keys(newErrors).length === 0) {
          addBankMutation.mutate(bankFormData)
      }
  }

  // --- Document Upload Handler override ---
  const handleDocUploadSubmit = () => {
      if (!docFile) {
          message.error("Please select a file")
          return;
      }
      
      // Max file size 10MB (10 * 1024 * 1024 bytes)
      if (docFile.size > 10 * 1024 * 1024) {
          setDocWarning("File size exceeds the 10MB limit. Please upload a smaller file.");
          return;
      }
      
      setDocWarning(null);

      // Use existing uploadMutation but pass extras
      const formData = new FormData()
      formData.append("file", docFile)
      formData.append("employeeId", employeeId)
      formData.append("type", "document") // Generic type for API logic
      formData.append("category", docCategory)
      formData.append("docType", docType)
      
      customDocMutation.mutate(formData)
  }

  const [docWarning, setDocWarning] = useState<string | null>(null)

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
          setDocWarning(null)
          queryClient.invalidateQueries({ queryKey: ["employee", employeeId] })
      },
      onError: () => message.error("Upload failed")
  })

  // --- Delete Document Mutation ---
  const deleteDocumentMutation = useMutation({
      mutationFn: async (docId: string) => {
          const res = await fetch(`/api/upload?docId=${docId}`, {
              method: 'DELETE'
          })
          if (!res.ok) throw new Error("Failed to delete document")
          return res.json()
      },
      onSuccess: () => {
          message.success("Document removed")
          queryClient.invalidateQueries({ queryKey: ["employee", employeeId] })
      },
      onError: () => message.error("Failed to remove document")
  })


  if (isLoading) return <div className="flex h-screen items-center justify-center"><Spin size="large" /></div>
  if (!employee) return <div className="flex h-screen items-center justify-center text-red-500">Employee not found</div>

  return (
    <div className="max-w-7xl mx-auto p-6 lg:p-10 space-y-8 animate-in fade-in duration-500 relative">
      
      {/* Header Profile Card */}
      <div className="relative bg-white rounded-3xl p-8 border border-slate-100 shadow-xl overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-cyan-500 to-blue-600"></div>
        
        <div className="relative flex flex-col md:flex-row gap-6 items-center md:items-center mt-12">
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
                       <h1 className="text-3xl font-bold text-slate-900">{employee.Employee_Name__c}</h1>
                       <div className="flex items-center justify-center gap-3 text-slate-500 mt-1">
                          <span className="flex items-center gap-1"><Briefcase className="w-4 h-4" /> {employee.Role__c || "Role not set"}</span>
                          <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                          <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {employee.Employee_Address__c.city || "Location not set"}</span>
                       </div>
                   </div>
                   <div className="flex gap-3 justify-center items-center">
                       {['HR', 'Admin'].includes(currentUserRole) && (
                           <button
                             onClick={() => {
                                 const isActivating = !employee.Active__c;
                                 Modal.confirm({
                                     title: `Are you sure you want to ${isActivating ? 'activate' : 'deactivate'} this user?`,
                                     content: isActivating 
                                         ? 'By activating this user, a welcome email with account setup instructions will be sent automatically.' 
                                         : 'Deactivating this user will prevent them from logging in.',
                                     okText: isActivating ? 'Activate & Send Email' : 'Deactivate',
                                     okType: isActivating ? 'primary' : 'danger',
                                     cancelText: 'Cancel',
                                     onOk: async () => {
                                         try {
                                             const res = await fetch(`/api/employees/${employeeId}/toggle-active`, {
                                                 method: 'POST',
                                                 headers: { 'Content-Type': 'application/json' },
                                                 body: JSON.stringify({ active: isActivating })
                                             });
                                             if (!res.ok) throw new Error('Failed');
                                             message.success(`User ${isActivating ? 'activated' : 'deactivated'} successfully`);
                                             queryClient.invalidateQueries({ queryKey: ["employee", employeeId] });
                                         } catch (e) {
                                             message.error("Failed to update status");
                                         }
                                     }
                                 });
                             }}
                             className={cn(
                                 "flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold transition border",
                                 employee.Active__c 
                                     ? "bg-red-50 text-red-600 border-red-100 hover:bg-red-100" 
                                     : "bg-green-50 text-green-600 border-green-100 hover:bg-green-100"
                             )}
                         >
                             <Power className="w-4 h-4" /> 
                             {employee.Active__c ? 'Deactivate' : 'Activate'}
                         </button>
                       )}

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

      {warningMsg && (
          <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-r-lg shadow-sm flex items-start gap-4 animate-in slide-in-from-top-2">
             <AlertTriangle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
             <div>
                 <h4 className="font-bold text-orange-800">Please check your inputs</h4>
                 <p className="text-sm text-orange-700 mt-1">{warningMsg}</p>
             </div>
             <button onClick={() => setWarningMsg(null)} className="ml-auto text-orange-400 hover:text-orange-600">
                 <X className="w-4 h-4" />
             </button>
          </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Sidebar Nav */}
          <div className="lg:col-span-1">
             <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-2 space-y-1">
                 {[
                     { id: "personal", label: "Personal Details", icon: User },
                     { id: "employment", label: "Employment Info", icon: Building2 },
                     { id: "assets", label: "Assets", icon: Laptop },
                     { id: "bank", label: "Bank Details", icon: CreditCard },
                     { id: "documents", label: "Documents", icon: FileText },
                     { id: "security", label: "Security", icon: Lock },
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
                 <h3 className="font-bold text-lg mb-4">Employee Status</h3>
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
                         <p className="font-mono">{employee.Employee_Id__c || 'Not set'}</p>
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
                                          <Field label="Employee Name" value={employee.Employee_Name__c} fieldKey="Employee_Name__c" isEditing={isEditing} formData={formData} setFormData={setFormData} error={errors.Employee_Name__c} placeholder="e.g. John Doe" />
                                          <Field label="Email Address" value={employee.Employee_Email__c} fieldKey="Employee_Email__c" type="email" isEditing={isEditing} formData={formData} setFormData={setFormData} error={errors.Employee_Email__c} placeholder="e.g. john@example.com" />
                                          <Field label="Phone Number" value={employee.Employee_Phone__c} fieldKey="Employee_Phone__c" type="tel" isEditing={isEditing} formData={formData} setFormData={setFormData} error={errors.Employee_Phone__c} placeholder="+91 9876543210" />
                                          <Field label="Date of Birth" value={employee.Birthdate__c} fieldKey="Birthdate__c" type="date" isEditing={isEditing} formData={formData} setFormData={setFormData} error={errors.Birthdate__c} />
                                          <Field label="Gender" value={employee.Gender__c} fieldKey="Gender__c" isEditing={isEditing} formData={formData} setFormData={setFormData} options={[{label: 'Male', value:'Male'}, {label:'Female', value:'Female'}, {label:'Other', value:'Other'}]} type="select" />
                                      </div>
                                  </div>

                                  <div className="border-t border-slate-100 pt-8">
                                      <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                                          <MapPin className="w-5 h-5 text-indigo-500" /> Address
                                      </h2>
                                      <div className="grid grid-cols-1 gap-y-6">
                                          <Field label="Street" value={employee.Employee_Address__c?.street} fieldKey="Employee_Address__Street__s" isEditing={isEditing} formData={formData} setFormData={setFormData} />
                                           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                              <Field label="City" value={employee.Employee_Address__c?.city} fieldKey="Employee_Address__City__s" isEditing={isEditing} formData={formData} setFormData={setFormData} />
                                              <Field label="State" value={employee.Employee_Address__c?.state} fieldKey="Employee_Address__StateCode__s" isEditing={isEditing} formData={formData} setFormData={setFormData} />
                                           </div>
                                           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                              <Field label="Zip / Postal" value={employee.Employee_Address__c?.postalCode} fieldKey="Employee_Address__PostalCode__s" isEditing={isEditing} formData={formData} setFormData={setFormData} />
                                              <Field label="Country" value={employee.Employee_Address__c?.country} fieldKey="Employee_Address__CountryCode__s" isEditing={isEditing} formData={formData} setFormData={setFormData} />
                                           </div>
                                          {/* Coordinates & Accuracy */}
                                          {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                             <Field label="Latitude" value={employee.Employee_Address__Latitude__s} fieldKey="Employee_Address__Latitude__s" type="number" isEditing={isEditing} formData={formData} setFormData={setFormData} />
                                             <Field label="Longitude" value={employee.Employee_Address__Longitude__s} fieldKey="Employee_Address__Longitude__s" type="number" isEditing={isEditing} formData={formData} setFormData={setFormData} />
                                             <Field label="Geocode Accuracy" value={employee.Employee_Address__GeocodeAccuracy__s} fieldKey="Employee_Address__GeocodeAccuracy__s" isEditing={isEditing} formData={formData} setFormData={setFormData} />
                                          </div> */}
                                      </div>
                                  </div>

                                  <div className="border-t border-slate-100 pt-8">
                                      <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                                          <Phone className="w-5 h-5 text-red-500" /> Emergency Contact
                                      </h2>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                          <Field label="Contact Name" value={employee.Emergency_Contact_Name__c} fieldKey="Emergency_Contact_Name__c" isEditing={isEditing} formData={formData} setFormData={setFormData} error={errors.Emergency_Contact_Name__c} />
                                          <Field label="Contact Number" value={employee.Emergency_Contact_Number__c} fieldKey="Emergency_Contact_Number__c" isEditing={isEditing} formData={formData} setFormData={setFormData} pattern = '^(?:(?:\\+|0{0,2})91(\\s*[\\-]\\s*)?|?)?\\d{9}$' type = 'tel' error={errors.Emergency_Contact_Number__c} />
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
                                          <Field 
                                            label="Department" 
                                            value={employee.Department__c} 
                                            fieldKey="Department__c" 
                                            isEditing={isEditing && ['HR', 'Admin'].includes(currentUserRole)} 
                                            formData={formData} 
                                            setFormData={setFormData}
                                            error={errors.Department__c}
                                            type="select" 
                                            options={[
                                                {label: 'HR', value: 'HR'},
                                                {label: 'IT', value: 'IT'},
                                                {label: 'Finance', value: 'Finance'},
                                                {label: 'Marketing', value: 'Marketing'},
                                                {label: 'Admin', value: 'Admin'},
                                            ]} 
                                          />
                                          <Field 
                                            label="Role" 
                                            value={employee.Role__c} 
                                            fieldKey="Role__c" 
                                            isEditing={isEditing && ['HR', 'Admin'].includes(currentUserRole)} 
                                            formData={formData} 
                                            setFormData={setFormData}
                                            error={errors.Role__c}
                                            type="select"
                                            options={[
                                                {label: 'Intern', value: 'Intern'},
                                                {label: 'Developer', value: 'Developer'},
                                                {label: 'Manager', value: 'Manager'},
                                                {label: 'HR', value: 'HR'},
                                                {label: 'Admin', value: 'Admin'},
                                                {label: 'BDE', value: 'BDE'},
                                                {label: 'Marketing', value: 'Marketing'},
                                                {label: 'Finance', value: 'Finance'},
                                            ]}
                                          />
                                          <Field 
                                            label="Job Title" 
                                            value={employee.Title__c} 
                                            fieldKey="Title__c" 
                                            isEditing={isEditing && ['HR', 'Admin'].includes(currentUserRole)} 
                                            formData={formData} 
                                            setFormData={setFormData}
                                            type="select"
                                            options={titles}
                                            placeholder="Select Job Title" 
                                          />
                                          <Field label="Joining Date" value={employee.Joining_Date__c} fieldKey="Joining_Date__c" type="date" isEditing={isEditing && ['HR', 'Admin'].includes(currentUserRole)} formData={formData} setFormData={setFormData} error={errors.Joining_Date__c} />
                                          <Field label="Total Experience" value={employee.Experience__c} fieldKey="Experience__c" isEditing={isEditing && ['HR', 'Admin'].includes(currentUserRole)} formData={formData} setFormData={setFormData} placeholder="e.g. 5 Years" />
                                          <div className="space-y-1 flex flex-col">
                                              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Manager / Team Lead</label>
                                              {isEditing && ['HR', 'Admin'].includes(currentUserRole) ? (
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
                                                              label: `${e.Employee_Name__c || ''}`.trim()
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
                                          <Field label="Base Salary" value={employee.Base_Salary__c} fieldKey="Base_Salary__c" type="number" isEditing={isEditing && ['HR', 'Admin'].includes(currentUserRole)} formData={formData} setFormData={setFormData} />
                                          <Field label="CTC" value={employee.Salary_CTC__c} fieldKey="Salary_CTC__c" type="number" isEditing={isEditing && ['HR', 'Admin'].includes(currentUserRole)} formData={formData} setFormData={setFormData} />
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
                                          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2"><CreditCard className="w-4 h-4"/> Account Details</h3>
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                              <Field label="Bank Name" value={bankFormData.Name} fieldKey="Name" isEditing={true} formData={bankFormData} setFormData={setBankFormData} placeholder="e.g. HDFC Bank" error={bankErrors.Name} required />
                                              <Field label="Branch Name" value={bankFormData.Bank_Branch_Name__c} fieldKey="Bank_Branch_Name__c" isEditing={true} formData={bankFormData} setFormData={setBankFormData} placeholder="e.g. Koramangala" error={bankErrors.Bank_Branch_Name__c} required />
                                              <Field label="Account Number" value={bankFormData.Bank_Account_Number__c} fieldKey="Bank_Account_Number__c" isEditing={true} formData={bankFormData} setFormData={setBankFormData} type="password" placeholder="Enter Account Number" error={bankErrors.Bank_Account_Number__c} required />
                                              <Field label="IFSC Code" value={bankFormData.IFSC__c} fieldKey="IFSC__c" isEditing={true} formData={bankFormData} setFormData={setBankFormData} placeholder="e.g. HDFC0001234" error={bankErrors.IFSC__c} required />
                                          </div>
                                          <div className="flex items-center gap-2 mb-4">
                                              <input type="checkbox" id="primary" checked={bankFormData.Primary_Account__c} onChange={e => setBankFormData({...bankFormData, Primary_Account__c: e.target.checked})} />
                                              <label htmlFor="primary" className="text-sm text-slate-700">Set as Primary Account</label>
                                          </div>
                                          <div className="flex justify-end gap-3">
                                              <button onClick={() => { 
                                                setBankFormData({
                                                    Name: "",
                                                    Bank_Branch_Name__c: "",
                                                    Bank_Account_Number__c: "",
                                                    IFSC__c: "",
                                                    Primary_Account__c: false
                                                })
                                                setBankErrors({
                                                    Name: "",
                                                    Bank_Branch_Name__c: "",
                                                    Bank_Account_Number__c: "",
                                                    IFSC__c: ""
                                                })
                                                setShowBankForm(false)}} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg text-sm">Cancel</button>
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
                                                      <div className="flex items-center gap-2">
                                                          {bank.Primary_Account__c && <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium">Primary</span>}
                                                          {currentUserRole === 'Admin' && (
                                                              <button 
                                                                  onClick={() => {
                                                                      if(confirm("Are you sure you want to delete this bank account?")) {
                                                                          deleteBankMutation.mutate(bank.Id)
                                                                      }
                                                                  }}
                                                                  className="text-slate-400 hover:text-red-500 p-1"
                                                                  title="Remove Account"
                                                              >
                                                                  <Trash2 className="w-4 h-4" />
                                                              </button>
                                                          )}
                                                      </div>
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
                                           {docWarning && (
                                               <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm flex items-start gap-2">
                                                   <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                                                   <p>{docWarning}</p>
                                               </div>
                                           )}
                                           <div className="space-y-3">

                                               <div>
                                                   <label className="block text-sm font-medium text-slate-700 mb-1">Document Type</label>
                                                   <select 
                                                      className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-slate-50"
                                                      value={docType}
                                                      onChange={(e) => setDocType(e.target.value)}
                                                   >
                                                       {docConfigMap[docCategory] ? (
                                                           docConfigMap[docCategory].map((type: string) => (
                                                               <option key={type} value={type}>{type}</option>
                                                           ))
                                                       ) : (
                                                           <>
                                                               <option value="Resume">Resume</option>
                                                               <option value="Offer Letter">Offer Letter</option>
                                                               <option value="ID Proof">ID Proof</option>
                                                               <option value="Certificate">Certificate</option>
                                                               <option value="Payslip">Payslip</option>
                                                               <option value="Other">Other</option>
                                                           </>
                                                       )}
                                                   </select>
                                               </div>
                                               <div>
                                                   <label className="block text-sm font-medium text-slate-700 mb-1">File</label>
                                                   <input 
                                                      type="file" 
                                                      className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" 
                                                      onChange={(e) => {
                                                          setDocFile(e.target.files?.[0] || null)
                                                          setDocWarning(null)
                                                      }}
                                                   />
                                                   <p className="text-xs text-slate-400 mt-1 pl-1">Max file size: 10MB</p>
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
                                                      {['HR', 'Admin'].includes(currentUserRole) && (
                                                          <button 
                                                            onClick={() => {
                                                                if(confirm("Are you sure you want to delete this document?")) {
                                                                    deleteDocumentMutation.mutate(doc.Id)
                                                                }
                                                            }}
                                                            className="flex-1 bg-white border border-red-100 text-red-500 text-xs font-semibold py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-red-50 transition"
                                                          >
                                                              <Trash2 className="w-3 h-3" /> Delete
                                                          </button>
                                                      )}
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

                          {activeTab === "security" && (
                              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                                  <div>
                                      <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                                          <Shield className="w-5 h-5 text-purple-600" /> Security Settings
                                      </h2>
                                      
                                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
                                          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                              <div>
                                                  <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                                                      Two-Factor Authentication (2FA)
                                                      {employee.Is2FAEnabled__c ? (
                                                          <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-bold border border-green-200">Enabled</span>
                                                      ) : (
                                                          <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 text-xs font-bold border border-slate-300">Disabled</span>
                                                      )}
                                                  </h3>
                                                  <p className="text-slate-500 text-sm mt-1 max-w-xl">
                                                      Add an extra layer of security to your account by requiring a verification code from your authenticator app when you sign in on a new device.
                                                  </p>
                                              </div>
                                              <div>
                                                  {employee.Is2FAEnabled__c ? (
                                                      <button 
                                                          onClick={() => {
                                                              if(confirm("Are you sure you want to disable 2FA? Your account will be less secure.")) {
                                                                  handleDisable2FA()
                                                              }
                                                          }}
                                                          className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-semibold hover:bg-red-100 transition"
                                                      >
                                                          Disable 2FA
                                                      </button>
                                                  ) : (
                                                      <button 
                                                          onClick={handleSetup2FA}
                                                          disabled={is2FALoading}
                                                          className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-black transition shadow-lg flex items-center gap-2"
                                                      >
                                                          {is2FALoading ? <Spin size="small" className="invert" /> : <Lock className="w-4 h-4" />}
                                                          Enable 2FA
                                                      </button>
                                                  )}
                                              </div>
                                          </div>
                                      </div>
                                  </div>

                                  {/* 2FA Setup Modal */}
                                  {show2FAModal && (
                                      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                                          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-lg relative overflow-hidden">
                                              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-purple-500 to-indigo-600"></div>
                                              
                                              <button onClick={() => setShow2FAModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
                                                  <X className="w-5 h-5" />
                                              </button>

                                              <div className="text-center mb-6">
                                                  <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                                      <Lock className="w-6 h-6" />
                                                  </div>
                                                  <h3 className="text-2xl font-bold text-slate-900">Setup 2FA</h3>
                                                  <p className="text-slate-500 mt-2 text-sm">Scan the QR code below with your authenticator app (Google Authenticator, Authy, etc.)</p>
                                              </div>

                                              <div className="flex flex-col items-center gap-6 mb-8">
                                                  <div className="p-4 bg-white border-2 border-slate-100 rounded-xl shadow-sm">
                                                      {twoFAQRCode ? (
                                                          <Image src={twoFAQRCode} alt="QR Code" width={180} height={180} />
                                                      ) : (
                                                          <div className="w-[180px] h-[180px] flex items-center justify-center text-slate-400 bg-slate-50">
                                                              <Spin />
                                                          </div>
                                                      )}
                                                  </div>
                                                  <div className="text-center">
                                                      <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold mb-1">Manual Entry Code</p>
                                                      <code className="bg-slate-100 px-3 py-1.5 rounded text-slate-700 font-mono text-sm border border-slate-200 select-all">
                                                          {twoFASecret}
                                                      </code>
                                                  </div>
                                              </div>

                                              <div className="space-y-4">
                                                  <div>
                                                      <label className="block text-sm font-medium text-slate-700 mb-2">Enter 6-digit verification code</label>
                                                      <input 
                                                          type="text" 
                                                          value={otpCode}
                                                          onChange={(e) => {
                                                              const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 6)
                                                              setOtpCode(val)
                                                          }}
                                                          placeholder="000000"
                                                          className="w-full text-center text-2xl tracking-[0.5em] font-mono p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition"
                                                      />
                                                  </div>
                                                  <button 
                                                      onClick={handleVerify2FA}
                                                      disabled={otpCode.length !== 6 || is2FALoading}
                                                      className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-lg shadow-purple-500/25 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                                  >
                                                      {is2FALoading ? <Spin size="small" className="invert" /> : "Verify & Activate"}
                                                  </button>
                                              </div>
                                          </div>
                                      </div>
                                  )}
                              </div>
                          )}
                          
                          {activeTab === "assets" && (
                              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                                  <div>
                                      <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                                          <Laptop className="w-5 h-5 text-indigo-600" /> Active Assets
                                      </h2>
                                      
                                      {(() => {
                                          const historyList = employee.assetHistory || [];
                                          const activeAssets = historyList.filter((h: any) => !h.AMS_Returned_Date__c);
                                          const returnedAssets = historyList.filter((h: any) => h.AMS_Returned_Date__c);

                                          return (
                                              <div className="space-y-8">
                                                  {/* Active Assets */}
                                                  {activeAssets.length > 0 ? (
                                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                          {activeAssets.map((history: any) => {
                                                              const asset = history.AMS_Asset__r || {};
                                                              return (
                                                                  <div key={history.Id} className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition group shadow-sm">
                                                                      <div className="flex justify-between items-start mb-3">
                                                                          <div className="flex items-center gap-3">
                                                                              <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                                                                  <Laptop className="w-5 h-5" />
                                                                              </div>
                                                                              <div>
                                                                                  <h3 className="font-semibold text-slate-800">{asset.Name || "Asset"}</h3>
                                                                                  <p className="text-xs text-slate-500">{asset.AMS_Product__r?.Name || "Unknown Product"}</p>
                                                                              </div>
                                                                          </div>
                                                                          <span className="px-2.5 py-1 rounded-full text-xs font-medium border bg-green-50 text-green-700 border-green-100">
                                                                              Active
                                                                          </span>
                                                                      </div>
                                                                      
                                                                      <div className="grid grid-cols-2 gap-y-2 text-sm mt-4 pt-4 border-t border-slate-100">
                                                                          <div>
                                                                              <p className="text-slate-400 text-xs uppercase tracking-wider mb-0.5">Serial Number</p>
                                                                              <p className="font-mono text-slate-700">{asset.AMS_Asset_Serial_Number__c || "-"}</p>
                                                                          </div>
                                                                          <div>
                                                                              <p className="text-slate-400 text-xs uppercase tracking-wider mb-0.5">Category</p>
                                                                              <p className="text-slate-700">{asset.AMS_Product__r?.AMS_Category__c || "-"}</p>
                                                                          </div>
                                                                          <div>
                                                                              <p className="text-slate-400 text-xs uppercase tracking-wider mb-0.5">Assigned Date</p>
                                                                              <p className="text-slate-700">{history.AMS_Assigned_Date__c ? new Date(history.AMS_Assigned_Date__c).toLocaleDateString() : "-"}</p>
                                                                          </div>
                                                                           <div>
                                                                              <p className="text-slate-400 text-xs uppercase tracking-wider mb-0.5">Warranty</p>
                                                                              <p className="text-slate-700">{asset.AMS_Warranty_Expiry_Date__c ? new Date(asset.AMS_Warranty_Expiry_Date__c).toLocaleDateString() : "-"}</p>
                                                                          </div>
                                                                      </div>
                                                                  </div>
                                                              )
                                                          })}
                                                      </div>
                                                  ) : (
                                                      <div className="text-center py-10 bg-slate-50 rounded-xl border-dashed border-2 border-slate-200">
                                                          <Laptop className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                                                          <p className="text-slate-500 text-sm">No active assets currently assigned.</p>
                                                      </div>
                                                  )}

                                                  {/* History Section */}
                                                  {returnedAssets.length > 0 && (
                                                      <div className="border border-slate-200 rounded-2xl overflow-hidden">
                                                          <button 
                                                              onClick={() => setShowAssetHistory(!showAssetHistory)}
                                                              className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition text-left"
                                                          >
                                                              <div className="flex items-center gap-2 font-semibold text-slate-700">
                                                                  <History className="w-5 h-5 text-slate-500" />
                                                                  <span>Asset History ({returnedAssets.length})</span>
                                                              </div>
                                                              {showAssetHistory ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                                                          </button>
                                                          
                                                          {showAssetHistory && (
                                                              <div className="p-4 bg-slate-50/50 border-t border-slate-200 animate-in slide-in-from-top-2">
                                                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                      {returnedAssets.map((history: any) => {
                                                                          const asset = history.AMS_Asset__r || {};
                                                                          return (
                                                                              <div key={history.Id} className="bg-white border border-slate-200/60 rounded-xl p-5 opacity-90 hover:opacity-100 hover:shadow-sm transition">
                                                                                  <div className="flex justify-between items-start mb-3">
                                                                                      <div className="flex items-center gap-3">
                                                                                          <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center">
                                                                                              <Laptop className="w-5 h-5" />
                                                                                          </div>
                                                                                          <div>
                                                                                              <h3 className="font-semibold text-slate-700">{asset.Name || "Asset"}</h3>
                                                                                              <p className="text-xs text-slate-500">{asset.AMS_Product__r?.Name || "Unknown Product"}</p>
                                                                                          </div>
                                                                                      </div>
                                                                                      <span className="px-2.5 py-1 rounded-full text-xs font-medium border bg-slate-100 text-slate-600 border-slate-200">
                                                                                          Returned
                                                                                      </span>
                                                                                  </div>
                                                                                  
                                                                                  <div className="grid grid-cols-2 gap-y-2 text-sm mt-4 pt-4 border-t border-slate-100">
                                                                                      <div>
                                                                                          <p className="text-slate-400 text-xs uppercase tracking-wider mb-0.5">Serial Number</p>
                                                                                          <p className="font-mono text-slate-600">{asset.AMS_Asset_Serial_Number__c || "-"}</p>
                                                                                      </div>
                                                                                      <div>
                                                                                          <p className="text-slate-400 text-xs uppercase tracking-wider mb-0.5">Assigned Date</p>
                                                                                          <p className="text-slate-600">{history.AMS_Assigned_Date__c ? new Date(history.AMS_Assigned_Date__c).toLocaleDateString() : "-"}</p>
                                                                                      </div>
                                                                                      <div>
                                                                                          <p className="text-slate-400 text-xs uppercase tracking-wider mb-0.5">Returned Date</p>
                                                                                          <p className="text-slate-600">{history.AMS_Returned_Date__c ? new Date(history.AMS_Returned_Date__c).toLocaleDateString() : "-"}</p>
                                                                                      </div>
                                                                                  </div>
                                                                              </div>
                                                                          )
                                                                      })}
                                                                  </div>
                                                              </div>
                                                          )}
                                                      </div>
                                                  )}
                                              </div>
                                          )
                                      })()}
                                  </div>
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
