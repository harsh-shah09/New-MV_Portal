"use client"

import { useState, useRef, useEffect, useMemo } from "react"
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
    Eye,
    Building2,
    CheckCircle2,
    Shield,
    Lock,
    Power,
    AlertTriangle,
    Laptop,
    History,
    ChevronDown,
    ChevronUp,
    Leaf
} from "lucide-react"
import { generate2FASecretAction, verifyAndEnable2FAAction, disable2FAAction, getEmployeeTitles, sendWelcomeEmailAction } from "@/app/employees/[id]/actions"
import { message, Spin, Select, Modal, Form, DatePicker, Space, Button, Pagination } from "antd"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import dayjs from "dayjs"
import { cn } from "@/lib/utils"
import { Field } from "./field-component"
import { EmployeeSalaryHistoryTab } from "./employee-salary-history-tab"

interface ViewProps {
    employeeId: string;
    currentUserRole?: string;
    currentUserEmployeeId?: string;
}

export function EmployeeProfileView({ employeeId, currentUserRole = "Employee", currentUserEmployeeId }: ViewProps) {
    // --- Query Parameter <-> Tab mapping ---
    type TabId = "personal" | "employment" | "salary-history" | "bank" | "documents" | "security" | "assets" | "leaves"
    
    const getTabFromQuery = (): TabId => {
        if (typeof window === "undefined") return "personal"
        const params = new URLSearchParams(window.location.search)
        const tab = params.get("tab")?.toLowerCase()
        const validTabs: TabId[] = ["personal", "employment", "salary-history", "bank", "documents", "security", "assets", "leaves"]
        return validTabs.includes(tab as TabId) ? (tab as TabId) : "personal"
    }

    const [activeTab, setActiveTab] = useState<TabId>(getTabFromQuery)
    const [showAssetHistory, setShowAssetHistory] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const queryClient = useQueryClient()
    const [titles, setTitles] = useState<{ label: string, value: string }[]>([])
    const [leaveFilters, setLeaveFilters] = useState({ status: '', type: '', dateRange: [null, null] as [any, any] })
    const [currentPage, setCurrentPage] = useState(1);
    const [sendingEmail, setSendingEmail] = useState(false);
    const itemsPerPage = 6;
    useEffect(() => {
        getEmployeeTitles().then(setTitles).catch(console.error)
    }, [])

    // --- Sync query param → tab on browser back/forward ---
    useEffect(() => {
        const onPopState = () => setActiveTab(getTabFromQuery())
        window.addEventListener("popstate", onPopState)
        return () => window.removeEventListener("popstate", onPopState)
    }, [])

    // --- Sync tab → query param whenever activeTab changes ---
    useEffect(() => {
        if (typeof window !== "undefined") {
            const params = new URLSearchParams(window.location.search)
            const currentTab = params.get("tab")
            if (currentTab !== activeTab) {
                const newParams = new URLSearchParams(window.location.search)
                newParams.set("tab", activeTab)
                window.history.replaceState(null, "", `?${newParams.toString()}`)
            }
        }
    }, [activeTab])

    // --- Tab change handler ---
    const handleTabChange = (tab: TabId) => {
        setActiveTab(tab)
    }

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
    const [form] = Form.useForm()
    const [formData, setFormData] = useState<any>({})
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [warningMsg, setWarningMsg] = useState<string | null>(null)
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const phonePattern = /^(?:\+91\d{10}|\d{10})$/

    // --- Experience Helpers ---
    const decimalToYearsMonths = (decimal: number | string | null | undefined): { years: number; months: number } => {
        const val = parseFloat(String(decimal || 0))
        if (isNaN(val) || val < 0) return { years: 0, months: 0 }
        const years = Math.floor(val)
        const months = Math.round((val - years) * 12)
        return { years, months }
    }

    const yearsMonthsToDecimal = (years: number | string, months: number | string): number => {
        const y = parseInt(String(years || 0), 10) || 0
        const m = parseInt(String(months || 0), 10) || 0
        return parseFloat((y + m / 12).toFixed(10))
    }

    const formatExperienceDisplay = (decimal: number | string | null | undefined): string => {
        const { years, months } = decimalToYearsMonths(decimal)
        if (years === 0 && months === 0) return 'Not set'
        const parts: string[] = []
        if (years > 0) parts.push(`${years} ${years === 1 ? 'year' : 'years'}`)
        if (months > 0) parts.push(`${months} ${months === 1 ? 'month' : 'months'}`)
        return parts.join(' ')
    }

    const validateForm = () => {
        const newErrors: Record<string, string> = {}

        // Always validate based on the activeTab
        if (activeTab === 'personal') {
            const employeeName = formData.Employee_Name__c?.trim()
            const email = formData.Employee_Email__c?.trim()
            const phone = formData.Employee_Phone__c?.trim()
            const companyEmail = formData.Company_Email__c?.trim()
            const normalizedPhone = phone?.replace(/[\s-]/g, "")
            const emergencyPhone = formData.Emergency_Contact_Number__c?.trim()
            const normalizedEmergencyPhone = emergencyPhone?.replace(/[\s-]/g, "")
            const gender = formData.Gender__c?.trim()

            // Required Basic Information
            if (!employeeName) {
                newErrors.Employee_Name__c = "Employee name is required"
            }

            if (!email) {
                newErrors.Employee_Email__c = "Email address is required"
            } else if (!emailPattern.test(email)) {
                newErrors.Employee_Email__c = "Please enter a valid email address"
            }

            if (companyEmail && !emailPattern.test(companyEmail)) {
                newErrors.Company_Email__c = "Please enter a valid company email address"
            }

            if (!phone) {
                newErrors.Employee_Phone__c = "Phone number is required"
            } else if (!normalizedPhone || !phonePattern.test(normalizedPhone)) {
                newErrors.Employee_Phone__c = "Phone must be 10 digits or +91 followed by 10 digits"
            }

            if (!formData.Birthdate__c) {
                newErrors.Birthdate__c = "Date of birth is required"
            }

            if (!gender) {
                newErrors.Gender__c = "Gender is required"
            } else if (!["Male", "Female"].includes(gender)) {
                newErrors.Gender__c = "Please select a valid gender"
            }

            if (emergencyPhone && (!normalizedEmergencyPhone || !phonePattern.test(normalizedEmergencyPhone))) {
                newErrors.Emergency_Contact_Number__c = "Emergency contact must be 10 digits or +91 followed by 10 digits"
            }

            // Date Validation
            if (formData.Birthdate__c) {
                const dob = new Date(formData.Birthdate__c)
                if (dob > new Date()) {
                    newErrors.Birthdate__c = "Date of birth cannot be in the future"
                }
            }
        }

        if (activeTab === 'employment') {
            if (formData.Joining_Date__c && formData.Birthdate__c) {
                if (new Date(formData.Joining_Date__c) < new Date(formData.Birthdate__c)) {
                    newErrors.Joining_Date__c = "Joining date cannot be before birth date"
                }
            }

            // Required Employment Fields - only for non-Employee roles
            if (currentUserRole !== "Employee") {
                if (!formData.Role__c) newErrors.Role__c = "Role is required"
                if (!formData.Department__c) newErrors.Department__c = "Department is required"
            }
        }

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
            const expParsed = decimalToYearsMonths(employee.Experience__c)
            setFormData({
                Employee_Name__c: employee.Employee_Name__c,
                Employee_Email__c: employee.Employee_Email__c,
                Company_Email__c: employee.Company_Email__c,
                Employee_Phone__c: employee.Employee_Phone__c,
                Birthdate__c: employee.Birthdate__c,
                Gender__c: employee.Gender__c,
                Employee_Address__c: employee.Employee_Current_Address__c || {},
                Employee_Address__Street__s: employee.Employee_Current_Address__c?.street || '',
                Employee_Address__City__s: employee.Employee_Current_Address__c?.city || '',
                Employee_Address__StateCode__s: employee.Employee_Current_Address__c?.state || '',
                Employee_Address__PostalCode__s: employee.Employee_Current_Address__c?.postalCode || '',
                Employee_Address__CountryCode__s: employee.Employee_Current_Address__c?.country || '',
                Emergency_Contact_Name__c: employee.Emergency_Contact_Name__c,
                Emergency_Contact_Number__c: employee.Emergency_Contact_Number__c,
                Technology__c: employee.Technology__c,
                Enrollment_Number__c: employee.Enrollment_Number__c,
                exp_years: expParsed.years,
                exp_months: expParsed.months,
                Experience__c: employee.Experience__c,
                Department__c: employee.Department__c,
                Role__c: employee.Role__c,
                Title__c: employee.Title__c,
                Team_Lead__c: employee.Team_Lead__c,
                Joining_Date__c: employee.Joining_Date__c,
                Onboarding_Date__c: employee.Onboarding_Date__c,
                Base_Salary__c: employee.Base_Salary__c,
                Salary_CTC__c: employee.Salary_CTC__c,
                Company_Security_Deduction__c: employee.Company_Security_Deduction__c,
                Status__c: employee.Status__c
            })
            setIsEditing(true)
        }
    }

    const handleSave = () => {
        if (validateForm()) {
            setWarningMsg(null)

            // Prepare payload with Address Object
            const payload = { ...formData };
            payload.Employee_Name__c = payload.Employee_Name__c?.trim();
            payload.Employee_Email__c = payload.Employee_Email__c?.trim();
            payload.Company_Email__c = payload.Company_Email__c?.trim();
            payload.Employee_Phone__c = payload.Employee_Phone__c?.trim()?.replace(/[\s-]/g, '');
            payload.Emergency_Contact_Number__c = payload.Emergency_Contact_Number__c?.trim()?.replace(/[\s-]/g, '');
            payload.Employee_Current_Address__c = JSON.stringify(
                {
                    street: formData.Employee_Address__Street__s,
                    city: formData.Employee_Address__City__s,
                    state: formData.Employee_Address__StateCode__s,
                    postalCode: formData.Employee_Address__PostalCode__s,
                    country: formData.Employee_Address__CountryCode__s
                }
            );

            // Remove flattened address fields from payload
            delete payload.Employee_Address__Street__s;
            delete payload.Employee_Address__c;
            delete payload.Employee_Address__City__s;
            delete payload.Employee_Address__StateCode__s;
            delete payload.Employee_Address__PostalCode__s;
            delete payload.Employee_Address__CountryCode__s;

            // Convert years + months UI fields to decimal Experience__c for Salesforce
            payload.Experience__c = yearsMonthsToDecimal(payload.exp_years ?? 0, payload.exp_months ?? 0)
            delete payload.exp_years
            delete payload.exp_months

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
        Primary_Account__c: true
    })
    const [bankErrors, setBankErrors] = useState<Record<string, string>>({})

    const [showDocModal, setShowDocModal] = useState(false)
    const [docFile, setDocFile] = useState<File | null>(null)
    const [docCategory, setDocCategory] = useState("Intern Docs")
    const [docType, setDocType] = useState("Resume")

    // Custom document upload modal state
    const [showCustomDocModal, setShowCustomDocModal] = useState(false)
    const [customDocName, setCustomDocName] = useState("")
    const [customDocCategory, setCustomDocCategory] = useState("Personal")
    const [customDocFile, setCustomDocFile] = useState<File | null>(null)
    const customDocFileInputRef = useRef<HTMLInputElement>(null)

    // Tile-based document upload state
    const [selectedDocTile, setSelectedDocTile] = useState<string | null>(null)
    const [tileUploadFile, setTileUploadFile] = useState<File | null>(null)
    const tileFileInputRef = useRef<HTMLInputElement>(null)

    // Passbook upload state
    const [showPassbookUpload, setShowPassbookUpload] = useState(false)
    const [passbookFile, setPassbookFile] = useState<File | null>(null)
    const passbookFileInputRef = useRef<HTMLInputElement>(null)

    const [isDocPreviewOpen, setIsDocPreviewOpen] = useState(false)
    const [docPreviewUrl, setDocPreviewUrl] = useState<string | null>(null)
    const [docPreviewTitle, setDocPreviewTitle] = useState<string>("Document Preview")

    const openDocumentPreview = (url?: string, title?: string) => {
        if (!url) {
            message.error("Document URL not available")
            return
        }
        setDocPreviewUrl(url)
        setDocPreviewTitle(title || "Document Preview")
        setIsDocPreviewOpen(true)
    }

    const handleDocumentDownload = async (documentId?: string, title?: string) => {
        if (!documentId) {
            message.error("Document ID not available")
            return
        }

        const toastKey = `doc-download-${Date.now()}`
        message.loading({ content: "Preparing download...", key: toastKey, duration: 0 })

        try {
            const params = new URLSearchParams({
                documentId,
                filename: title || "document"
            })

            const response = await fetch(`/api/documents/download?${params.toString()}`)
            if (!response.ok) throw new Error("Failed to download file")

            const blob = await response.blob()
            const contentDisposition = response.headers.get("content-disposition") || ""
            const filenameMatch = contentDisposition.match(/filename="?([^";]+)"?/i)
            const fallbackTitle = (title || "document").trim().replace(/[^a-zA-Z0-9._-]+/g, "_") || "document"
            const filename = filenameMatch?.[1] || fallbackTitle

            const objectUrl = URL.createObjectURL(blob)
            const link = document.createElement("a")
            link.href = objectUrl
            link.download = filename
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(objectUrl)

            message.success({ content: "Download started", key: toastKey })
        } catch {
            message.error({ content: "Unable to download this document", key: toastKey })
        }
    }

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

    // Filter Categories based on Role & Experience
    const filteredCategories = useMemo(() => {
        if (!docConfigMap) return [];

        const role = (employee?.Role__c || "").toLowerCase();
        const experienceStr = String(employee?.Experience__c || "");
        const experience = parseInt(experienceStr.match(/\d+/)?.[0] || "0");
        const isFresher = experience === 0; // Simple heuristic for fresher

        return docCategories.filter(cat => {
            const c = cat.toLowerCase();

            // 1. Common Documents (Always show)
            if (c.includes("common")) return true;

            // 2. Intern Documents (Show only for Interns)
            if (role === "intern") {
                if (c.includes("intern")) return true;
            }

            // 3. Fresher Documents (Show for 0 Exp)
            // If role is NOT intern
            if (role !== "intern") {
                if (isFresher && c.includes("fresher")) return true;

                // 4. Experience Documents (Show for Exp > 0 or non-freshers)
                if (!isFresher && c.includes("experience")) return true;
            }

            return false;
        });
    }, [docCategories, employee]);

    const displayCategories = filteredCategories.length > 0 ? filteredCategories : docCategories;

    // Auto-select Category based on filtered list
    useEffect(() => {
        if (showDocModal && displayCategories.length > 0) {
            if (!displayCategories.includes(docCategory)) {
                setDocCategory(displayCategories[0]);
                const types = docConfigMap[displayCategories[0]];
                if (types && types.length > 0) setDocType(types[0]);
            }
        }
    }, [showDocModal, displayCategories, docCategory, docConfigMap]);

    // Update types when category changes manually
    useEffect(() => {
        if (docCategory && docConfigMap[docCategory]) {
            const types = docConfigMap[docCategory];
            if (!types.includes(docType)) {
                setDocType(types[0] || "");
            }
        }
    }, [docCategory, adminConfigs]);

    // --- Required Document Tiles ---
    // Determine which role-specific MDT config applies for this employee
    const getRoleDocCategory = (): string | null => {
        if (!employee) return null;
        const role = (employee.Role__c || '').toLowerCase();
        const experience = employee.Experience__c;

        // 1. Intern — role explicitly says "intern"
        if (role.includes('intern')) return 'Intern_Documents';

        // 2. Fresher — experience is 0 or absent
        const expNum = parseFloat(experience);
        if (experience === null || experience === undefined || experience === '' || expNum === 0 || isNaN(expNum)) {
            return 'Freshers_Documents';
        }

        // 3. Experienced — experience > 0
        if (expNum > 0) return 'Experience_Documents';

        return null;
    };

    const requiredDocTiles: string[] = useMemo(() => {
        if (!adminConfigs?.documents) return [];
        const allDocs = adminConfigs.documents as any[];
        const commonRecord = allDocs.find((d: any) => d.DeveloperName === 'Common_Documents');
        const commonDocs: string[] = commonRecord
            ? (commonRecord.Value__c || '').split(',').map((s: string) => s.trim()).filter(Boolean)
            : [];
        const roleCategory = getRoleDocCategory();
        let roleDocs: string[] = [];
        if (roleCategory) {
            const roleRecord = allDocs.find((d: any) => d.DeveloperName === roleCategory);
            if (roleRecord) {
                roleDocs = (roleRecord.Value__c || '').split(',').map((s: string) => s.trim()).filter(Boolean);
            }
        }
        // Merge, dedup
        return Array.from(new Set([...commonDocs, ...roleDocs]));
    }, [adminConfigs, employee]);

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

    const setPrimaryBankMutation = useMutation({
        mutationFn: async (bankId: string) => {
            const res = await fetch(`/api/employees/${employeeId}/bank`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bankId, primaryAccount: true })
            })
            if (!res.ok) {
                const data = await res.json().catch(() => ({}))
                throw new Error(data?.error || 'Failed to update primary account')
            }
            return res.json()
        },
        onSuccess: () => {
            message.success("Primary account updated")
            queryClient.invalidateQueries({ queryKey: ["employee", employeeId] })
        },
        onError: (error: any) => {
            message.error(error?.message || "Failed to update primary account")
        }
    })

    const canManageBankAccounts = ['HR', 'Admin'].includes(currentUserRole)

    const handleAddBank = () => {
        if (!canManageBankAccounts) {
            message.error("Only HR or Admin can add bank accounts")
            return
        }

        const newErrors: Record<string, string> = {}

        if (!bankFormData.Name) newErrors.Name = "Bank Name is required"
        if (!bankFormData.Bank_Branch_Name__c) newErrors.Bank_Branch_Name__c = "Branch Name is required"

        if (!bankFormData.Bank_Account_Number__c) {
            newErrors.Bank_Account_Number__c = "Account Number is required"
        } else if (!/^\d{9,18}$/.test(bankFormData.Bank_Account_Number__c)) {
            newErrors.Bank_Account_Number__c = "Invalid account number (9-18 digits)"
        }

        if (!bankFormData.IFSC__c) {
            newErrors.IFSC__c = "IFSC Code is required"
        } else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(bankFormData.IFSC__c)) {
            newErrors.IFSC__c = "Invalid IFSC Code format"
        }

        setBankErrors(newErrors)

        if (Object.keys(newErrors).length === 0) {
            addBankMutation.mutate(bankFormData)
        }
    }

    // Maps MDT DeveloperName → Salesforce Document_Category__c picklist value
    const MDT_TO_PICKLIST: Record<string, string> = {
        Common_Documents: 'Personal',
        Intern_Documents: 'Intern Docs',
        Freshers_Documents: 'Fresher Docs',
        Experience_Documents: 'Experience Docs',
    }

    // --- Passbook upload handler ---
    const handlePassbookFileSelected = (file: File) => {
        if (file.size > 10 * 1024 * 1024) {
            message.error("File size exceeds 10MB limit.")
            return
        }
        setPassbookFile(file)

        const formData = new FormData()
        formData.append("file", file)
        formData.append("employeeId", employeeId)
        formData.append("type", "document")
        formData.append("category", "Personal")
        formData.append("docType", "Passbook")
        customDocMutation.mutate(formData)
    }

    // --- Custom document upload handler ---
    const handleCustomDocumentUpload = () => {
        if (!customDocName.trim()) {
            message.error("Please enter a document name")
            return
        }
        if (!customDocFile) {
            message.error("Please select a file")
            return
        }
        if (customDocFile.size > 10 * 1024 * 1024) {
            message.error("File size exceeds 10MB limit.")
            return
        }

        const formData = new FormData()
        formData.append("file", customDocFile)
        formData.append("employeeId", employeeId)
        formData.append("type", "document")
        formData.append("category", customDocCategory)
        formData.append("docType", customDocName.trim())
        
        customDocMutation.mutate(formData)
        
        // Reset modal on success (will happen in mutation success callback)
    }

    // --- Tile-based document upload handler ---
    const handleTileFileSelected = (file: File, docName: string) => {
        if (file.size > 10 * 1024 * 1024) {
            message.error("File size exceeds 10MB limit.")
            return
        }
        setTileUploadFile(file)
        setSelectedDocTile(docName)

        // Determine which MDT category this doc belongs to (Common or role-specific)
        const allDocs = adminConfigs?.documents as any[] || []
        const commonRecord = allDocs.find((d: any) => d.DeveloperName === 'Common_Documents')
        const commonDocs: string[] = commonRecord
            ? (commonRecord.Value__c || '').split(',').map((s: string) => s.trim()).filter(Boolean)
            : []
        const mdtKey = commonDocs.includes(docName) ? 'Common_Documents' : (getRoleDocCategory() || 'Common_Documents')
        const category = MDT_TO_PICKLIST[mdtKey] ?? 'Personal'

        const formData = new FormData()
        formData.append("file", file)
        formData.append("employeeId", employeeId)
        formData.append("type", "document")
        formData.append("category", category)
        formData.append("docType", docName)
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
            setShowCustomDocModal(false)
            setCustomDocName("")
            setCustomDocCategory("Personal")
            setCustomDocFile(null)
            //   setUploadingType(null) // Reset loading state
            queryClient.invalidateQueries({ queryKey: ["employee", employeeId] })
        },
        onError: () => {
            message.error("Upload failed")
            //   setUploadingType(null)
        }
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

    const verifyDocumentMutation = useMutation({
        mutationFn: async ({ docId, action }: { docId: string, action: 'approve' | 'reject' }) => {
            const res = await fetch('/api/documents/verify', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ documentId: docId, action })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed to verify document')
            return data
        },
        onSuccess: (_data, variables) => {
            message.success(`Document ${variables.action === 'approve' ? 'approved' : 'rejected'} successfully`)
            queryClient.invalidateQueries({ queryKey: ["employee", employeeId] })
        },
        onError: (error: any) => {
            message.error(error?.message || 'Failed to verify document')
        }
    })

    const isScreenActionLoading =
        updateMutation.isPending ||
        uploadMutation.isPending ||
        addBankMutation.isPending ||
        setPrimaryBankMutation.isPending ||
        deleteBankMutation.isPending ||
        customDocMutation.isPending ||
        deleteDocumentMutation.isPending ||
        verifyDocumentMutation.isPending ||
        is2FALoading


    if (isLoading) return <div className="flex h-screen items-center justify-center"><Spin size="large" /></div>
    if (!employee) return <div className="flex h-screen items-center justify-center text-red-500">Employee not found</div>

    const viewedEmployeeRole = (employee.Role__c || "").trim()
    const normalizedCurrentRole = (currentUserRole || "").trim().toLowerCase()
    const isAdminUser = normalizedCurrentRole === 'admin'
    const isHrUser = normalizedCurrentRole === 'hr'
    const normalizeSfId = (id?: string) => (id || '').trim().toLowerCase().slice(0, 15)
    const isOwnProfile =
        normalizeSfId(currentUserEmployeeId) !== '' &&
        normalizeSfId(currentUserEmployeeId) === normalizeSfId(employee?.Id || employeeId)
    const canViewCompensation = isAdminUser || (!isHrUser && isOwnProfile) || (isHrUser && isOwnProfile)
    const canViewSalaryHistory = isAdminUser || (!isHrUser && isOwnProfile) || (isHrUser && isOwnProfile)
    const canToggleUserActive =
        currentUserRole === 'Admin'
            ? true
            : currentUserRole === 'HR'
                ? !['HR', 'Admin'].includes(viewedEmployeeRole)
                : false
    if (isScreenActionLoading) {
        return (
            <div className="fixed z-[999] overflow-hidden inset-0 backdrop-blur-xs flex items-center justify-center">
                <div className="bg-white rounded-xl shadow-xl px-6 py-5 flex items-center gap-3 border border-slate-100">
                    <Spin size="large" />
                    <span className="text-sm font-semibold text-slate-700">Processing...</span>
                </div>
            </div>
        )
    }
    return (
        <div className="w-full mx-auto px-8 max-h-[85vh] overflow-y-auto space-y-8 animate-in fade-in duration-500">
            {/* {isScreenActionLoading && (
                <div className="fixed z-[999] h-[80vh] overflow-hidden inset-0 backdrop-blur-sm flex items-center justify-center">
                    <div className="bg-white rounded-xl shadow-xl px-6 py-5 flex items-center gap-3 border border-slate-100">
                        <Spin size="large" />
                        <span className="text-sm font-semibold text-slate-700">Processing...</span>
                    </div>
                </div>
            )} */}

            {/* Header Profile Card */}
            <div className="relative bg-gradient-to-r from-cyan-500 to-blue-600 rounded-3xl overflow-hidden shadow-2xl">

                <div className="relative flex flex-col sm:flex-row items-center sm:items-center gap-5 px-6 py-6 sm:py-5 sm:px-8">
                    {/* Avatar */}
                    <div className="relative group shrink-0">
                        <div className="w-24 h-24 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full border-[3px] border-white/80 shadow-xl bg-white/20 backdrop-blur-md flex items-center justify-center overflow-hidden">
                            {employee.Profile_Photo__c && !uploadMutation.isPending ? (
                                <Image key={employee.Profile_Photo__c} src={employee.Profile_Photo__c} alt="Profile" width={96} height={96} className="w-full h-full object-cover" />
                            ) : uploadMutation.isPending ? (
                                <Spin size="small" />
                            ) : (
                                <User className="w-10 h-10 text-white/70" />
                            )}
                        </div>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="absolute bottom-0.5 right-0.5 p-2 sm:p-1.5 rounded-full bg-black/70 backdrop-blur-sm text-white shadow-md opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:bg-black active:scale-95"
                            title="Change Photo"
                        >
                            <Camera className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                        </button>
                        <input type="file" hidden ref={fileInputRef} accept="image/*" onChange={handleFileChange} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 text-center sm:text-left">
                        <h1 className="text-2xl sm:text-3xl w-68 font-bold text-white leading-tight truncate capitalize">
                            {employee.Employee_Name__c}
                        </h1>
                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-3 gap-y-1 text-white/80 mt-1.5 text-sm">
                            <span className="flex font-bold items-center gap-1.5">
                                <Briefcase className="w-3.5 h-3.5 shrink-0" />
                                {employee.Role__c || 'Role not set'}
                            </span>
                            <span className="w-1 h-1 rounded-full bg-white/40 hidden sm:inline-block"></span>
                            <span className="flex font-bold items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5 shrink-0" />
                                {(employee.Employee_Current_Address__c && employee.Employee_Current_Address__c.city) || 'Location not set'}
                            </span>
                        </div>
                    </div>

                    {/* Action Button */}
                    {canToggleUserActive && (
                        <div className="shrink-0 flex items-center gap-3">
                            <button
                                onClick={async () => {
                                    if (!employee.Employee_Email__c) {
                                        message.error("Employee Email is required to send welcome email.");
                                        return;
                                    }
                                    setSendingEmail(true);
                                    try {
                                        const res = await sendWelcomeEmailAction(employeeId, employee.Employee_Email__c, employee.Employee_Name__c);
                                        if (res.error) throw new Error(res.error);
                                        message.success("Welcome Email sent successfully.");
                                    } catch (e) {
                                        message.error("Failed to send Welcome Email.");
                                    } finally {
                                        setSendingEmail(false);
                                    }
                                }}
                                disabled={sendingEmail || !employee.Employee_Email__c}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all border shadow-lg bg-white border-gray-200 text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Mail className="w-4 h-4" />
                                {sendingEmail ? 'Sending...' : 'Send Welcome Email'}
                            </button>
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
                                                queryClient.invalidateQueries({ queryKey: ['employee', employeeId] });
                                            } catch (e) {
                                                message.error('Failed to update status');
                                            }
                                        }
                                    });
                                }}
                                disabled={!employee.Active__c && !employee.Company_Email__c}
                                className={cn(
                                    'flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all border shadow-lg',
                                    (!employee.Active__c && !employee.Company_Email__c) && 'opacity-50 cursor-not-allowed',
                                    employee.Active__c
                                        ? 'bg-red-600/90 text-white border-red-500/50 hover:bg-red-700'
                                        : 'bg-green-600/90 text-white border-green-500/50 hover:bg-green-700'
                                )}
                            >
                                <Power className="w-4 h-4" />
                                {employee.Active__c ? 'Deactivate' : 'Activate'}
                            </button>
                        </div>
                    )}
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
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-2 grid gap-2 grid-cols-3 md:grid-cols-2 lg:grid-cols-1">
                        {[
                            { id: "personal", label: "Personal Details", icon: User },
                            { id: "employment", label: "Employment Details", icon: Building2 },
                            ...(canViewSalaryHistory ? [{ id: "salary-history", label: "Salary History", icon: History }] : []),
                            { id: "assets", label: "Assets", icon: Laptop },
                            { id: "bank", label: "Bank Details", icon: CreditCard },
                            { id: "documents", label: "Documents", icon: FileText },
                            //  { id: "leaves", label: "Leaves", icon: Leaf },
                            { id: "security", label: "Security", icon: Lock },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => handleTabChange(tab.id as TabId)}
                                className={cn(
                                    "w-full min-w-0 flex flex-col lg:flex-row items-center justify-center lg:justify-start gap-1 lg:gap-3 px-2 lg:px-4 py-3 rounded-xl font-medium transition-all duration-200 text-center lg:text-left",
                                    activeTab === tab.id
                                        ? "bg-blue-50 text-blue-700 shadow-sm"
                                        : "text-slate-600 hover:bg-slate-50"
                                )}
                            >
                                <tab.icon className={cn("w-5 h-5 shrink-0 flex-none", activeTab === tab.id ? "text-blue-600" : "text-slate-400")} />
                                <span className="text-sm">{tab.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Quick Stats or Info */}
                    <div className="mt-4 lg:mt-6 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-4 lg:p-6 text-white shadow-xl flex flex-row lg:flex-col justify-between items-center lg:items-start gap-4 lg:gap-0 lg:space-y-4">
                        <h3 className="font-bold text-lg hidden lg:block mb-4">Employee Status</h3>
                        <div className="flex flex-row lg:flex-col justify-around w-full lg:space-y-4">
                            <div className="text-center lg:text-left">
                                <p className="text-slate-400 text-[10px] lg:text-xs uppercase tracking-wider mb-1 lg:mb-0">Status</p>
                                <p className="font-semibold flex items-center justify-center lg:justify-start gap-1.5 lg:gap-2 text-sm lg:text-base">
                                    <span className="w-1.5 h-1.5 lg:w-2 lg:h-2 rounded-full bg-green-400"></span>
                                    {employee.Status__c}
                                </p>
                            </div>
                            <div className="w-px h-8 bg-slate-700 block lg:hidden" />
                            <div className="text-center lg:text-left">
                                <p className="text-slate-400 text-[10px] lg:text-xs uppercase tracking-wider mb-1 lg:mb-0">Employee ID</p>
                                <p className="font-mono text-sm lg:text-base">{employee.Name || 'Not set'}</p>
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
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                                                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 m-0">
                                                    <User className="w-5 h-5 text-blue-500" /> Basic Information
                                                </h2>
                                                <div className="flex w-full sm:w-auto justify-end">
                                                    {!isEditing ? (
                                                        <button
                                                            onClick={handleEditToggle}
                                                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition text-sm sm:text-base"
                                                        >
                                                            <Edit3 className="w-4 h-4" /> Edit Details
                                                        </button>
                                                    ) : (
                                                        <div className="flex w-full items-center gap-3">
                                                            <button
                                                                onClick={handleEditToggle}
                                                                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition text-sm sm:text-base"
                                                            >
                                                                <X className="w-4 h-4" /> Cancel
                                                            </button>
                                                            <button
                                                                onClick={handleSave}
                                                                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition shadow-lg shadow-blue-500/20 text-sm sm:text-base"
                                                            >
                                                                {updateMutation.isPending ? <Spin size="small" /> : <Save className="w-4 h-4" />} Save
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                                <Field label="Employee Name" value={employee.Employee_Name__c} fieldKey="Employee_Name__c" isEditing={isEditing} formData={formData} setFormData={setFormData} error={errors.Employee_Name__c} placeholder="e.g. John Doe" required />
                                                <Field label="Personal Email" value={employee.Employee_Email__c} fieldKey="Employee_Email__c" type="email" isEditing={isEditing} formData={formData} setFormData={setFormData} error={errors.Employee_Email__c} placeholder="e.g. john@example.com" required />
                                                <Field label="Company Email" value={employee.Company_Email__c} fieldKey="Company_Email__c" type="email" isEditing={isEditing} formData={formData} setFormData={setFormData} error={errors.Company_Email__c} placeholder="e.g. john@company.com" />
                                                <Field label="Phone Number" value={employee.Employee_Phone__c} fieldKey="Employee_Phone__c" type="tel" isEditing={isEditing} formData={formData} setFormData={setFormData} error={errors.Employee_Phone__c} placeholder="+919876543210 or 9876543210" required />
                                                <Field label="Date of Birth" value={employee.Birthdate__c} fieldKey="Birthdate__c" type="date" isEditing={isEditing} formData={formData} setFormData={setFormData} error={errors.Birthdate__c} required />
                                                <Field label="Gender" value={employee.Gender__c} fieldKey="Gender__c" isEditing={isEditing} formData={formData} setFormData={setFormData} options={[{ label: 'Male', value: 'Male' }, { label: 'Female', value: 'Female' }]} type="select" error={errors.Gender__c} required />
                                            </div>
                                        </div>

                                        <div className="border-t border-slate-100 pt-8">
                                            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                                                <MapPin className="w-5 h-5 text-indigo-500" />Current Address
                                            </h2>
                                            <div className="grid grid-cols-1 gap-y-6">
                                                <Field label="Street" value={employee.Employee_Current_Address__c?.street} fieldKey="Employee_Address__Street__s" isEditing={isEditing} formData={formData} setFormData={setFormData} />
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <Field label="City" value={employee.Employee_Current_Address__c?.city} fieldKey="Employee_Address__City__s" isEditing={isEditing} formData={formData} setFormData={setFormData} />
                                                    <Field label="State" value={employee.Employee_Current_Address__c?.state} fieldKey="Employee_Address__StateCode__s" isEditing={isEditing} formData={formData} setFormData={setFormData} />
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <Field label="Zip / Postal" value={employee.Employee_Current_Address__c?.postalCode} fieldKey="Employee_Address__PostalCode__s" isEditing={isEditing} formData={formData} setFormData={setFormData} />
                                                    <Field label="Country" value={employee.Employee_Current_Address__c?.country} fieldKey="Employee_Address__CountryCode__s" isEditing={isEditing} formData={formData} setFormData={setFormData} />
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
                                                <Phone className="w-5 h-5 text-blue-500" /> Emergency Contact
                                            </h2>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                                <Field label="Contact Name" value={employee.Emergency_Contact_Name__c} fieldKey="Emergency_Contact_Name__c" isEditing={isEditing} formData={formData} setFormData={setFormData} error={errors.Emergency_Contact_Name__c} />
                                                <Field label="Contact Number" value={employee.Emergency_Contact_Number__c} fieldKey="Emergency_Contact_Number__c" isEditing={isEditing} formData={formData} setFormData={setFormData} pattern="^(?:\\+91\\d{10}|\\d{10})$" type="tel" error={errors.Emergency_Contact_Number__c} placeholder="+919876543210 or 9876543210" />
                                            </div>
                                        </div>
                                        <div className="border-t border-slate-100 pt-8 mt-8">
                                            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                                                <FileText className="w-5 h-5 text-purple-500" /> Academic & Other Details
                                            </h2>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                                <Field label="Technology" value={employee.Technology__c} fieldKey="Technology__c" isEditing={isEditing} formData={formData} setFormData={setFormData} placeholder="e.g. React" />
                                                <Field label="Enrollment Number" value={employee.Enrollment_Number__c} fieldKey="Enrollment_Number__c" isEditing={isEditing} formData={formData} setFormData={setFormData} placeholder="e.g. EN12345" />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === "employment" && (
                                    <div className="space-y-8">
                                        <div>
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                                                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 m-0">
                                                    <Briefcase className="w-5 h-5 text-blue-500" /> Employment Details
                                                </h2>
                                                {['HR', 'Admin'].includes(currentUserRole) && (
                                                    <div className="flex w-full sm:w-auto justify-end">
                                                        {!isEditing ? (
                                                            <button
                                                                onClick={handleEditToggle}
                                                                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition text-sm sm:text-base"
                                                            >
                                                                <Edit3 className="w-4 h-4" /> Edit Details
                                                            </button>
                                                        ) : (
                                                            <div className="flex w-full items-center gap-3">
                                                                <button
                                                                    onClick={handleEditToggle}
                                                                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition text-sm sm:text-base"
                                                                >
                                                                    <X className="w-4 h-4" /> Cancel
                                                                </button>
                                                                <button
                                                                    onClick={handleSave}
                                                                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition shadow-lg shadow-blue-500/20 text-sm sm:text-base"
                                                                >
                                                                    {updateMutation.isPending ? <Spin size="small" /> : <Save className="w-4 h-4" />} Save
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
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
                                                        { label: 'HR', value: 'HR' },
                                                        { label: 'IT', value: 'IT' },
                                                        { label: 'Finance', value: 'Finance' },
                                                        { label: 'Marketing', value: 'Marketing' },
                                                        { label: 'Admin', value: 'Admin' },
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
                                                        { label: 'Intern', value: 'Intern' },
                                                        { label: 'Developer', value: 'Developer' },
                                                        { label: 'Manager', value: 'Manager' },
                                                        { label: 'HR', value: 'HR' },
                                                        { label: 'Admin', value: 'Admin' },
                                                        { label: 'BDE', value: 'BDE' },
                                                        { label: 'Marketing', value: 'Marketing' },
                                                        { label: 'Finance', value: 'Finance' },
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

                                                {/* ── Total Experience: split into Years + Months ── */}
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                                        Total Experience
                                                    </label>
                                                    {isEditing && ['HR', 'Admin'].includes(currentUserRole) ? (
                                                        <div className="flex items-center gap-2">
                                                            {/* Years */}
                                                            <div className="flex-1 relative">
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    value={formData.exp_years ?? 0}
                                                                    onChange={(e) => {
                                                                        const y = Math.max(0, parseInt(e.target.value, 10) || 0)
                                                                        setFormData({ ...formData, exp_years: y })
                                                                    }}
                                                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition"
                                                                    placeholder="0"
                                                                />
                                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
                                                                    yr
                                                                </span>
                                                            </div>
                                                            <span className="text-slate-400 text-sm font-medium shrink-0">:</span>
                                                            {/* Months */}
                                                            <div className="flex-1 relative">
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    max="11"
                                                                    value={formData.exp_months ?? 0}
                                                                    onChange={(e) => {
                                                                        const m = Math.min(11, Math.max(0, parseInt(e.target.value, 10) || 0))
                                                                        setFormData({ ...formData, exp_months: m })
                                                                    }}
                                                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition"
                                                                    placeholder="0"
                                                                />
                                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
                                                                    mo
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <p className="font-medium text-slate-800 text-sm break-words py-1">
                                                            {formatExperienceDisplay(employee.Experience__c) !== 'Not set'
                                                                ? formatExperienceDisplay(employee.Experience__c)
                                                                : <span className="text-slate-400 italic">Not set</span>
                                                            }
                                                        </p>
                                                    )}
                                                    {/* Live preview while editing */}
                                                    {isEditing && ['HR', 'Admin'].includes(currentUserRole) && (
                                                        <p className="text-[11px] text-slate-400">
                                                            <span className="font-semibold text-slate-600">
                                                                {formatExperienceDisplay(yearsMonthsToDecimal(formData.exp_years ?? 0, formData.exp_months ?? 0))}
                                                            </span>
                                                        </p>
                                                    )}
                                                </div>
                                                <Field label="Joining Date" value={employee.Joining_Date__c} fieldKey="Joining_Date__c" type="date" isEditing={isEditing && ['HR', 'Admin'].includes(currentUserRole)} formData={formData} setFormData={setFormData} error={errors.Joining_Date__c} />
                                                <Field label="Onboarding Date" value={employee.Onboarding_Date__c} fieldKey="Onboarding_Date__c" type="date" isEditing={isEditing && ['HR', 'Admin'].includes(currentUserRole)} formData={formData} setFormData={setFormData} />

                                                <Field
                                                    label="Employment Status"
                                                    value={employee.Status__c}
                                                    fieldKey="Status__c"
                                                    isEditing={isEditing && ['HR', 'Admin'].includes(currentUserRole)}
                                                    formData={formData}
                                                    setFormData={setFormData}
                                                    error={errors?.Status__c}
                                                    type="select"
                                                    options={[
                                                        { label: 'Active', value: 'Active' },
                                                        { label: 'On Notice', value: 'On Notice' },
                                                        { label: 'Resigned', value: 'Resigned' },
                                                        { label: 'Terminated', value: 'Terminated' },
                                                    ]}
                                                />
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
                                                                options={employeesList?.filter((e: any) => e.Id !== employeeId && e.Status__c === 'Active' && e.Title__c === 'Team Lead' && e.Role__c === currentUserRole).map((e: any) => ({
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

                                        {canViewCompensation && (
                                            <div className="border-t border-slate-100 pt-8">
                                                <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                                                    <CreditCard className="w-5 h-5 text-green-500" /> Compensation
                                                </h2>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                                    <Field label="Base Salary" value={employee.Base_Salary__c} fieldKey="Base_Salary__c" type="number" isEditing={isEditing && currentUserRole === 'Admin'} formData={formData} setFormData={setFormData} />
                                                    <Field label="CTC" value={employee.Salary_CTC__c} fieldKey="Salary_CTC__c" type="number" isEditing={isEditing && currentUserRole === 'Admin'} formData={formData} setFormData={setFormData} />
                                                    <Field label="Security Deduction" value={employee.Company_Security_Deduction__c} fieldKey="Company_Security_Deduction__c" type="number" isEditing={isEditing && currentUserRole === 'Admin'} formData={formData} setFormData={setFormData} />
                                                </div>
                                            </div>
                                        )}
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
                                                className="text-sm font-semibold bg-slate-50 p-2 cursor-pointer hover:bg-slate-200 rounded-xl text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                            >
                                                <Plus className="w-4 h-4" /> Add Account
                                            </button>

                                        </div>

                                        {showBankForm && (
                                            <div className="mb-6 p-6 bg-slate-50 border border-blue-100 rounded-xl animate-in fade-in slide-in-from-top-2">
                                                <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2"><CreditCard className="w-4 h-4" /> Account Details</h3>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                                    <Field label="Bank Name" value={bankFormData.Name} fieldKey="Name" isEditing={true} formData={bankFormData} setFormData={setBankFormData} placeholder="e.g. HDFC Bank" error={bankErrors.Name} required />
                                                    <Field label="Branch Name" value={bankFormData.Bank_Branch_Name__c} fieldKey="Bank_Branch_Name__c" isEditing={true} formData={bankFormData} setFormData={setBankFormData} placeholder="e.g. Koramangala" error={bankErrors.Bank_Branch_Name__c} required />
                                                    <Field label="Account Number" value={bankFormData.Bank_Account_Number__c} fieldKey="Bank_Account_Number__c" isEditing={true} formData={bankFormData} setFormData={setBankFormData} type="password" placeholder="Enter Account Number" error={bankErrors.Bank_Account_Number__c} required />
                                                    <Field label="IFSC Code" value={bankFormData.IFSC__c} fieldKey="IFSC__c" isEditing={true} formData={bankFormData} setFormData={setBankFormData} placeholder="e.g. HDFC0001234" error={bankErrors.IFSC__c} required />
                                                </div>
                                                <div className="flex items-center gap-2 mb-4">
                                                    <input type="checkbox" id="primary" checked={bankFormData.Primary_Account__c} onChange={e => setBankFormData({ ...bankFormData, Primary_Account__c: e.target.checked })} />
                                                    <label htmlFor="primary" className="text-sm text-slate-700">Set as Primary Account</label>
                                                </div>

                                                {/* Passbook Upload in Bank Form */}
                                                <div className="border-t border-slate-200 pt-4 mt-4">
                                                    <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                                        <FileText className="w-4 h-4 text-blue-500" /> Upload Passbook (Optional)
                                                    </h4>
                                                    <label className="flex flex-col items-center justify-center gap-3 p-4 border-2 border-dashed border-blue-300 rounded-lg cursor-pointer hover:bg-blue-50/50 transition">
                                                        <input
                                                            ref={passbookFileInputRef}
                                                            type="file"
                                                            className="sr-only"
                                                            accept=".pdf,.jpg,.jpeg,.png"
                                                            disabled={customDocMutation.isPending}
                                                            onChange={(e) => {
                                                                const file = e.target.files?.[0]
                                                                if (file) handlePassbookFileSelected(file)
                                                                e.target.value = ''
                                                            }}
                                                        />
                                                        {customDocMutation.isPending ? (
                                                            <Spin size="small" />
                                                        ) : (
                                                            <>
                                                                <Upload className="w-5 h-5 text-blue-600" />
                                                                <div className="text-center">
                                                                    <p className="text-xs font-medium text-slate-700">Click to upload</p>
                                                                    <p className="text-[11px] text-slate-500 mt-0.5">PDF, JPG, PNG (max 10MB)</p>
                                                                </div>
                                                            </>
                                                        )}
                                                    </label>
                                                </div>

                                                <div className="flex justify-end gap-3 mt-4">
                                                    <button onClick={() => {
                                                        setBankFormData({
                                                            Name: "",
                                                            Bank_Branch_Name__c: "",
                                                            Bank_Account_Number__c: "",
                                                            IFSC__c: "",
                                                            Primary_Account__c: true
                                                        })
                                                        setBankErrors({
                                                            Name: "",
                                                            Bank_Branch_Name__c: "",
                                                            Bank_Account_Number__c: "",
                                                            IFSC__c: ""
                                                        })
                                                        setShowBankForm(false)
                                                    }} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg text-sm">Cancel</button>
                                                    <button
                                                        onClick={handleAddBank}
                                                        disabled={addBankMutation.isPending}
                                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
                                                    >
                                                        {addBankMutation.isPending && <Spin size="small" />}
                                                        {addBankMutation.isPending ? "Saving..." : "Save Account"}
                                                    </button>
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
                                                                {!bank.Primary_Account__c && (
                                                                    <button
                                                                        onClick={() => setPrimaryBankMutation.mutate(bank.Id)}
                                                                        disabled={setPrimaryBankMutation.isPending}
                                                                        className="text-xs px-2 py-1 rounded-md border border-blue-100 text-blue-600 hover:bg-blue-50 disabled:opacity-50"
                                                                        title="Set as Primary"
                                                                    >
                                                                        Set Primary
                                                                    </button>
                                                                )}
                                                                {currentUserRole === 'Admin' && (
                                                                    <button
                                                                        onClick={() => {
                                                                            if (confirm("Are you sure you want to delete this bank account?")) {
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

                                        {/* Display uploaded passbook */}
                                        {(() => {
                                            const passbookDoc = employee.documents?.find(
                                                (d: any) => d.Document_Type__c?.trim().toLowerCase() === 'passbook'
                                            )
                                            return passbookDoc ? (
                                                <div className="border-t border-slate-100 pt-8 mt-8">
                                                    <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                                                        <FileText className="w-5 h-5 text-blue-500" /> Passbook
                                                    </h2>
                                                    <div className="p-4 border border-slate-200 rounded-xl hover:shadow-md transition bg-white">
                                                        <div className="flex justify-between items-start mb-3">
                                                            <div className="flex items-center gap-3 flex-1">
                                                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                                                                    <FileText className="w-5 h-5 text-blue-600" />
                                                                </div>
                                                                <div>
                                                                    <h4 className="font-bold text-slate-800">Passbook</h4>
                                                                    <p className="text-xs text-slate-500">{passbookDoc.Status__c || 'Uploaded'}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-2 mt-4">
                                                            <button
                                                                type="button"
                                                                onClick={() => openDocumentPreview(passbookDoc.File_URL__c, 'Passbook')}
                                                                className="flex-1 bg-white border border-slate-200 text-slate-600 text-xs font-semibold py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-slate-50 transition"
                                                            >
                                                                <Eye className="w-3 h-3" /> View
                                                            </button>
                                                            {passbookDoc.File_URL__c && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleDocumentDownload(passbookDoc.Id, 'Passbook')}
                                                                    className="flex-1 bg-white border border-slate-200 text-slate-600 text-xs font-semibold py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-slate-50 transition"
                                                                >
                                                                    <Download className="w-3 h-3" /> Download
                                                                </button>
                                                            )}
                                                            {['HR', 'Admin'].includes(currentUserRole) && (
                                                                <button
                                                                    onClick={() => {
                                                                        Modal.confirm({
                                                                            title: 'Delete this passbook?',
                                                                            content: 'This action cannot be undone.',
                                                                            okText: 'Delete',
                                                                            okType: 'danger',
                                                                            cancelText: 'Cancel',
                                                                            centered: true,
                                                                            onOk: () => deleteDocumentMutation.mutate(passbookDoc.Id)
                                                                        })
                                                                    }}
                                                                    className="text-slate-400 hover:text-red-500 p-2 border border-slate-200 rounded-lg hover:border-red-200"
                                                                    title="Delete"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : null
                                        })()}
                                    </div>
                                )}

                                {activeTab === "documents" && (
                                    <div className="space-y-8">

                                        {/* ── Required Documents Tiles ── */}
                                        <div>
                                            <h2 className="text-xl font-bold text-slate-800 mb-1 flex items-center gap-2">
                                                <FileText className="w-5 h-5 text-orange-500" /> Documents
                                            </h2>
                                            <p className="text-sm text-slate-500 mb-5">Click on a tile to upload the corresponding document.</p>

                                            {requiredDocTiles.length === 0 ? (
                                                <div className="text-center py-10 bg-slate-50 rounded-xl border-dashed border-2 border-slate-200">
                                                    <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                                                    <p className="text-slate-400 text-sm">No document requirements configured yet.</p>
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                                    {requiredDocTiles.map((docName) => {
                                                        const uploaded = employee.documents?.find(
                                                            (d: any) => d.Document_Type__c?.trim().toLowerCase() === docName.trim().toLowerCase()
                                                        )
                                                        const tileStatus = uploaded?.Status__c || 'Uploaded'
                                                        const tileStatusLower = String(tileStatus).toLowerCase()
                                                        const tileStatusClass = tileStatusLower === 'rejected'
                                                            ? 'text-red-600'
                                                            : tileStatusLower === 'verified' || tileStatusLower === 'approved'
                                                                ? 'text-green-600'
                                                                : 'text-blue-600'
                                                        const isUploading = customDocMutation.isPending && selectedDocTile === docName
                                                        return (
                                                            <label
                                                                key={docName}
                                                                className={`relative flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 cursor-pointer transition-all select-none
                                                              ${isUploading
                                                                        ? 'border-blue-300 bg-blue-50 opacity-80 cursor-wait'
                                                                        : uploaded
                                                                            ? 'border-green-300 bg-green-50 hover:border-green-400'
                                                                            : 'border-dashed border-slate-300 bg-white hover:border-blue-400 hover:bg-blue-50/40'
                                                                    }`}
                                                            >
                                                                <input
                                                                    type="file"
                                                                    className="sr-only"
                                                                    disabled={isUploading || customDocMutation.isPending}
                                                                    onChange={(e) => {
                                                                        const file = e.target.files?.[0]
                                                                        if (file) handleTileFileSelected(file, docName)
                                                                        e.target.value = ''
                                                                    }}
                                                                />
                                                                {isUploading ? (
                                                                    <Spin size="default" />
                                                                ) : uploaded ? (
                                                                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                                                                        <CheckCircle2 className="w-6 h-6 text-green-600" />
                                                                    </div>
                                                                ) : (
                                                                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                                                                        <Upload className="w-5 h-5 text-orange-500" />
                                                                    </div>
                                                                )}
                                                                <span className="text-xs font-semibold text-center text-slate-700 leading-tight">{docName}</span>
                                                                {uploaded && (
                                                                    <span className={`text-[10px] font-medium ${tileStatusClass}`}>{tileStatus}</span>
                                                                )}
                                                                {!uploaded && !isUploading && (
                                                                    <span className="text-[10px] text-slate-400">Click to upload</span>
                                                                )}
                                                                {/* View link for uploaded docs
                                                                {uploaded && uploaded.File_URL__c && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation()
                                                                            openDocumentPreview(uploaded.File_URL__c, uploaded.Document_Type__c || docName)
                                                                        }}
                                                                        className="text-[10px] text-blue-500 hover:underline font-medium inline-flex items-center gap-1"
                                                                    >
                                                                        <Eye className="w-3 h-3" /> View
                                                                    </button>
                                                                )} */}
                                                            </label>
                                                        )
                                                    })}
                                                </div>
                                            )}
                                        </div>

                                        {/* ── All Uploaded Documents ── */}
                                        <div className="border-t border-slate-100 pt-6">
                                            <div className="flex justify-between items-center mb-4">
                                                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                                    <Download className="w-4 h-4 text-slate-500" /> Uploaded Documents
                                                </h3>
                                                {['HR', 'Admin'].includes(currentUserRole) && (
                                                <Button
                                                    type="primary"
                                                    onClick={() => setShowCustomDocModal(true)}
                                                    className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
                                                >
                                                    <Upload className="w-4 h-4" /> Upload Document
                                                </Button>
                                                )}
                                            </div>
                                            {(() => {
                                                const nonPayslipDocs = (employee.documents || []).filter(
                                                    (doc: any) => doc.Document_Type__c?.trim().toLowerCase() !== 'payslip'
                                                )
                                                const totalDocs = nonPayslipDocs.length;
                                                const startIndex = (currentPage - 1) * itemsPerPage;
                                                const paginatedDocs = nonPayslipDocs.slice(startIndex, startIndex + itemsPerPage);
                                                return totalDocs > 0 ? (
                                                    <>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                        {paginatedDocs.map((doc: any) => (
                                                            <div key={doc.Id} className="group p-4 border border-slate-200 rounded-xl hover:border-blue-300 hover:bg-blue-50/10 transition relative">
                                                                {/* Top row: icon + name + approve/reject */}
                                                                <div className="flex items-start gap-3">
                                                                    <div className="w-10 h-10 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                                                                        <FileText className="w-5 h-5" />
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <h4 className="font-semibold text-slate-800 truncate" title={doc.Document_Type__c}>{doc.Document_Type__c}</h4>
                                                                        <p className="text-xs text-slate-500">{doc.Document_Category__c} • {doc.Status__c}</p>
                                                                    </div>
                                                                    {/* Approve / Reject — top right */}
                                                                    {doc.Status__c === 'Uploaded' &&
                                                                        ((currentUserRole === 'HR' && employee.Role__c !== 'HR') || (currentUserRole === 'Admin' && employee.Role__c === 'HR')) && (
                                                                            <div className="flex items-center gap-1.5 shrink-0">
                                                                                <button
                                                                                    onClick={() => verifyDocumentMutation.mutate({ docId: doc.Id, action: 'approve' })}
                                                                                    disabled={verifyDocumentMutation.isPending}
                                                                                    className="bg-white border border-green-200 text-green-600 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-green-50 transition disabled:opacity-50"
                                                                                >
                                                                                    Approve
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => verifyDocumentMutation.mutate({ docId: doc.Id, action: 'reject' })}
                                                                                    disabled={verifyDocumentMutation.isPending}
                                                                                    className="bg-white border border-amber-200 text-amber-600 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-amber-50 transition disabled:opacity-50"
                                                                                >
                                                                                    Reject
                                                                                </button>
                                                                            </div>
                                                                        )
                                                                    }
                                                                </div>
                                                                {/* Bottom row: View / Download / Delete */}
                                                                <div className="mt-4 flex gap-2">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => openDocumentPreview(doc.File_URL__c, doc.Document_Type__c)}
                                                                        className="flex-1 bg-white border border-slate-200 text-slate-600 text-xs font-semibold py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-slate-50 transition"
                                                                    >
                                                                        <Eye className="w-3 h-3" /> View
                                                                    </button>
                                                                    {doc.File_URL__c && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleDocumentDownload(doc.Id, doc.Document_Type__c)}
                                                                            className="flex-1 bg-white border border-slate-200 text-slate-600 text-xs font-semibold py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-slate-50 transition"
                                                                        >
                                                                            <Download className="w-3 h-3" /> Download
                                                                        </button>
                                                                    )}
                                                                    {['HR', 'Admin'].includes(currentUserRole) && (
                                                                        <button
                                                                            onClick={() => {
                                                                                Modal.confirm({
                                                                                    title: 'Delete this document?',
                                                                                    content: 'This action cannot be undone. The document will be permanently removed.',
                                                                                    okText: 'Delete',
                                                                                    okType: 'danger',
                                                                                    cancelText: 'Cancel',
                                                                                    centered: true,
                                                                                    onOk: async () => {
                                                                                        deleteDocumentMutation.mutate(doc.Id)
                                                                                    }
                                                                                })
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
                                                    {/* Pagination */}
                                                    {totalDocs > itemsPerPage && (
                                                        <div className="flex justify-end mt-6">
                                                            <Pagination
                                                                current={currentPage}
                                                                total={totalDocs}
                                                                pageSize={itemsPerPage}
                                                                onChange={(page) => setCurrentPage(page)}
                                                                showSizeChanger={false}
                                                                className="ant-pagination-custom"
                                                                
                                                            />
                                                        </div>
                                                    )}
                                                </>
                                                ) : (
                                                    <div className="text-center py-10 bg-slate-50 rounded-xl border-dashed border-2 border-slate-200">
                                                        <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                                                        <p className="text-slate-500 text-sm">No documents uploaded yet.</p>
                                                    </div>
                                                )
                                            })()}
                                            
                                        </div>

                                        {/* Custom Document Upload Modal */}
                                        <Modal
                                            title="Upload Document"
                                            open={showCustomDocModal}
                                            onCancel={() => {
                                                setShowCustomDocModal(false)
                                                setCustomDocName("")
                                                setCustomDocCategory("Personal")
                                                setCustomDocFile(null)
                                            }}
                                            footer={[
                                                <Button
                                                    key="cancel"
                                                    type="default"
                                                    onClick={() => {
                                                        setShowCustomDocModal(false)
                                                        setCustomDocName("")
                                                        setCustomDocCategory("Personal")
                                                        setCustomDocFile(null)
                                                    }}
                                                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm"
                                                >
                                                    Cancel
                                                </Button>,
                                                <Button
                                                    title="Upload Document"
                                                    key="submit"
                                                    type="primary"
                                                    onClick={handleCustomDocumentUpload}
                                                    disabled={customDocMutation.isPending || !customDocName.trim() || !customDocFile}
                                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-2"
                                                >
                                                    {customDocMutation.isPending && <Spin size="small" />}
                                                    {customDocMutation.isPending ? "Uploading..." : "Upload"}
                                                </Button>
                                            ]}
                                        >
                                            <div className="space-y-4">
                                                {/* Document Name */}
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                                        Document Name <span className="text-red-500">*</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={customDocName}
                                                        onChange={(e) => setCustomDocName(e.target.value)}
                                                        placeholder="e.g., Experience Certificate, Aadhaar, etc."
                                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-400 outline-none transition"
                                                    />
                                                </div>

                                                {/* Category */}
                                                {/* <div>
                                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                                        Category <span className="text-red-500">*</span>
                                                    </label>
                                                    <select
                                                        value={customDocCategory}
                                                        onChange={(e) => setCustomDocCategory(e.target.value)}
                                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-400 outline-none transition"
                                                    >
                                                        <option value="Personal">Personal</option>
                                                        <option value="Intern Docs">Intern Docs</option>
                                                        <option value="Fresher Docs">Fresher Docs</option>
                                                        <option value="Experience Docs">Experience Docs</option>
                                                        <option value="Other">Other</option>
                                                    </select>
                                                </div> */}

                                                {/* File Upload */}
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                                        Upload File <span className="text-red-500">*</span>
                                                    </label>
                                                    <label className="flex flex-col items-center justify-center gap-3 p-6 border-2 border-dashed border-blue-300 rounded-lg cursor-pointer hover:bg-blue-50/50 transition">
                                                        <input
                                                            ref={customDocFileInputRef}
                                                            type="file"
                                                            className="sr-only"
                                                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                                            onChange={(e) => {
                                                                const file = e.target.files?.[0]
                                                                if (file) {
                                                                    setCustomDocFile(file)
                                                                }
                                                            }}
                                                        />
                                                        <Upload className="w-6 h-6 text-blue-600" />
                                                        <div className="text-center">
                                                            <p className="text-sm font-medium text-slate-700">
                                                                {customDocFile ? customDocFile.name : "Click to upload or drag and drop"}
                                                            </p>
                                                            <p className="text-xs text-slate-500 mt-1">PDF, DOC, DOCX, JPG, PNG (max 10MB)</p>
                                                        </div>
                                                    </label>
                                                </div>
                                            </div>
                                        </Modal>
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
                                                    <div className="w-full md:w-auto flex flex-col shrink-0">
                                                        {employee.Is2FAEnabled__c ? (
                                                            <button
                                                                onClick={() => {
                                                                    if (confirm("Are you sure you want to disable 2FA? Your account will be less secure.")) {
                                                                        handleDisable2FA()
                                                                    }
                                                                }}
                                                                className="w-full md:w-auto px-6 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-semibold hover:bg-red-100 transition whitespace-nowrap"
                                                            >
                                                                Disable 2FA
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={handleSetup2FA}
                                                                disabled={is2FALoading}
                                                                className="w-full md:w-auto px-6 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-black transition shadow-lg flex items-center justify-center gap-2 whitespace-nowrap text-center"
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
                                            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in">
                                                <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto relative">
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

                                {activeTab === "salary-history" && canViewSalaryHistory && (
                                    <EmployeeSalaryHistoryTab
                                        employeeId={employeeId}
                                        employeeName={employee?.Employee_Name__c}
                                        employeeCode={employee?.Enrollment_Number__c}
                                        currentUserRole={currentUserRole}
                                    />
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
                                {activeTab === 'leaves' && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                                        <div>
                                            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                                                <Leaf className="w-5 h-5 text-green-500" /> Leave History
                                            </h2>

                                            {/* Filters Section */}
                                            <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                                                    {/* Status Filter */}
                                                    <div>
                                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                                            Filter by Status
                                                        </label>
                                                        <select
                                                            value={leaveFilters.status}
                                                            onChange={(e) =>
                                                                setLeaveFilters({ ...leaveFilters, status: e.target.value })
                                                            }
                                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition"
                                                        >
                                                            <option value="">All Status</option>
                                                            <option value="applied">Applied</option>
                                                            <option value="approved">Approved</option>
                                                            <option value="rejected">Rejected</option>
                                                        </select>
                                                    </div>

                                                    {/* Leave Type Filter */}
                                                    <div>
                                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                                            Filter by Type
                                                        </label>
                                                        <select
                                                            value={leaveFilters.type}
                                                            onChange={(e) =>
                                                                setLeaveFilters({ ...leaveFilters, type: e.target.value })
                                                            }
                                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition"
                                                        >
                                                            <option value="">All Types</option>
                                                            <option value="Planned leave">Planned Leave</option>
                                                            <option value="Sick Leave">Sick Leave</option>
                                                            <option value="Emergency Leave">Emergency Leave</option>
                                                        </select>
                                                    </div>

                                                    {/* Date Range Filter */}
                                                    <div>
                                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                                            Date Range
                                                        </label>
                                                        <DatePicker.RangePicker
                                                            value={leaveFilters.dateRange[0] && leaveFilters.dateRange[1] ? [dayjs(leaveFilters.dateRange[0]), dayjs(leaveFilters.dateRange[1])] : null}
                                                            onChange={(dates) => {
                                                                setLeaveFilters({
                                                                    ...leaveFilters,
                                                                    dateRange: dates ? [dates[0]?.toDate(), dates[1]?.toDate()] : [null, null]
                                                                });
                                                            }}
                                                            className="w-full"
                                                            placeholder={['Start Date', 'End Date']}
                                                            format="DD/MM/YYYY"
                                                        />
                                                    </div>

                                                    {/* Reset Button */}
                                                    <div className="flex items-end">
                                                        <button
                                                            onClick={() => setLeaveFilters({ status: '', type: '', dateRange: [null, null] })}
                                                            className="w-full px-4 py-2 bg-slate-300 hover:bg-slate-400 text-slate-800 text-sm font-medium rounded-lg transition"
                                                        >
                                                            Clear Filters
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Table Section */}
                                            {(() => {
                                                const leaves = employee.leaveHistory || [];
                                                const filteredLeaves = leaves.filter((leave: any) => {
                                                    if (leaveFilters.status && leave.Status__c?.toLowerCase() !== leaveFilters.status.toLowerCase()) {
                                                        return false;
                                                    }
                                                    if (leaveFilters.type) {
                                                        const leaveType = (leave.Leave_Type__c || leave.leaveType || '').toLowerCase();
                                                        if (leaveType !== leaveFilters.type.toLowerCase()) {
                                                            return false;
                                                        }
                                                    }
                                                    if (leaveFilters.dateRange[0] && leaveFilters.dateRange[1]) {
                                                        const startDate = new Date(leave.Start_Date__c || leave.startDate);
                                                        const filterStart = new Date(leaveFilters.dateRange[0]);
                                                        const filterEnd = new Date(leaveFilters.dateRange[1]);
                                                        // Set end time to end of day for proper range comparison
                                                        filterEnd.setHours(23, 59, 59, 999);
                                                        if (startDate < filterStart || startDate > filterEnd) {
                                                            return false;
                                                        }
                                                    }
                                                    return true;
                                                });

                                                if (leaves.length === 0) {
                                                    return (
                                                        <div className="text-center py-12 bg-slate-50 rounded-xl border-dashed border-2 border-slate-200">
                                                            <Leaf className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                                                            <p className="text-slate-500 text-sm">No leave records found.</p>
                                                        </div>
                                                    );
                                                }

                                                return (
                                                    <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
                                                        <table className="w-full text-sm">
                                                            {/* Table Header */}
                                                            <thead className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                                                                <tr>
                                                                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Leave Type</th>
                                                                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Start Date</th>
                                                                    <th className="px-4 py-3 text-left font-semibold text-slate-700">End Date</th>
                                                                    <th className="px-4 py-3 text-center font-semibold text-slate-700">Days</th>
                                                                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Reason</th>
                                                                    <th className="px-4 py-3 text-center font-semibold text-slate-700">Status</th>
                                                                </tr>
                                                            </thead>

                                                            {/* Table Body */}
                                                            <tbody className="divide-y divide-slate-200">
                                                                {filteredLeaves.length > 0 ? (
                                                                    filteredLeaves.map((leave: any, idx: number) => {
                                                                        const statusLower = (leave.Status__c || 'pending').toLowerCase();
                                                                        const statusColors: Record<string, string> = {
                                                                            pending: 'bg-yellow-100 text-yellow-800',
                                                                            approved: 'bg-green-100 text-green-800',
                                                                            rejected: 'bg-red-100 text-red-800',
                                                                            cancelled: 'bg-gray-100 text-gray-800',
                                                                        };
                                                                        const statusClass = statusColors[statusLower] || 'bg-slate-100 text-slate-800';

                                                                        return (
                                                                            <tr key={idx} className="hover:bg-slate-50 transition">
                                                                                <td className="px-4 py-3 text-slate-800 font-medium">
                                                                                    {leave.Leave_Type__c || leave.leaveType || 'N/A'}
                                                                                </td>
                                                                                <td className="px-4 py-3 text-slate-700">
                                                                                    {leave.Start_Date__c || leave.startDate
                                                                                        ? new Date(leave.Start_Date__c || leave.startDate).toLocaleDateString('en-IN', {
                                                                                            year: 'numeric',
                                                                                            month: 'short',
                                                                                            day: 'numeric'
                                                                                        })
                                                                                        : 'N/A'}
                                                                                </td>
                                                                                <td className="px-4 py-3 text-slate-700">
                                                                                    {leave.End_Date__c || leave.endDate
                                                                                        ? new Date(leave.End_Date__c || leave.endDate).toLocaleDateString('en-IN', {
                                                                                            year: 'numeric',
                                                                                            month: 'short',
                                                                                            day: 'numeric'
                                                                                        })
                                                                                        : 'N/A'}
                                                                                </td>
                                                                                <td className="px-4 py-3 text-center text-slate-700 font-medium">
                                                                                    {leave.Number_of_Days__c || leave.duration || 0}
                                                                                </td>
                                                                                <td className="px-4 py-3 text-slate-700 max-w-xs truncate">
                                                                                    {leave.Reason__c || leave.reason || '-'}
                                                                                </td>
                                                                                <td className="px-4 py-3 text-center">
                                                                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusClass}`}>
                                                                                        {(leave.Status__c || 'Pending').charAt(0).toUpperCase() + (leave.Status__c || 'Pending').slice(1).toLowerCase()}
                                                                                    </span>
                                                                                </td>
                                                                            </tr>
                                                                        );
                                                                    })
                                                                ) : (
                                                                    <tr>
                                                                        <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                                                                            No leaves found matching your filters.
                                                                        </td>
                                                                    </tr>
                                                                )}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                );
                                            })()}

                                            {/* Summary Stats */}
                                            {(() => {
                                                const leaves = employee.leaveHistory || [];
                                                if (leaves.length === 0) return null;

                                                const stats = {
                                                    total: leaves.length,
                                                    approved: leaves.filter((l: any) => (l.Status__c || '').toLowerCase() === 'approved').length,
                                                    pending: leaves.filter((l: any) => (l.Status__c || '').toLowerCase() === 'applied').length,
                                                    rejected: leaves.filter((l: any) => (l.Status__c || '').toLowerCase() === 'rejected').length,
                                                    totalDays: leaves.reduce((sum: number, l: any) => sum + (l.Number_of_Days__c || l.duration || 0), 0)
                                                };

                                                return (
                                                    <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                                                            <p className="text-sm text-slate-600">Total Leaves</p>
                                                            <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
                                                        </div>
                                                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                                                            <p className="text-sm text-slate-600">Approved</p>
                                                            <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
                                                        </div>
                                                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                                                            <p className="text-sm text-slate-600">Pending</p>
                                                            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                                                        </div>
                                                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                                                            <p className="text-sm text-slate-600">Rejected</p>
                                                            <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
                                                        </div>
                                                        {/* <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
                                                      <p className="text-sm text-slate-600">Total Days</p>
                                                      <p className="text-2xl font-bold text-purple-600">{stats.totalDays}</p>
                                                  </div> */}
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            </div>
            <Modal
                title={docPreviewTitle}
                open={isDocPreviewOpen}
                onCancel={() => {
                    setIsDocPreviewOpen(false)
                    setDocPreviewUrl(null)
                }}
                footer={null}
                width="80vw"
                style={{ top: 20 }}
                destroyOnHidden
            >
                {docPreviewUrl && /\.(png|jpg|jpeg|gif|webp|svg)(\?|$)/i.test(docPreviewUrl) ? (
                    <div className="w-full max-h-[75vh] overflow-auto flex justify-center bg-slate-50 rounded-lg p-2">
                        <img src={docPreviewUrl} alt={docPreviewTitle} className="max-w-full max-h-[72vh] object-contain" />
                    </div>
                ) : (
                    <iframe
                        src={docPreviewUrl || undefined}
                        title={docPreviewTitle}
                        className="w-full h-[75vh] rounded-lg border border-slate-200"
                    />
                )}
            </Modal>
            <style jsx global>{`
        .input-std {
            @apply w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition;
        }
      `}</style>
        </div>
    )
}