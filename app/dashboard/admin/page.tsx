"use client"

import { motion } from "framer-motion"
import { 
  Building2, 
  CalendarDays, 
  FileText, 
  Users, 
  Shield, 
  Mail, 
  GitBranch, 
  CalendarRange,
  ChevronRight,
  Settings
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

const adminModules = [
  {
    title: "Organization Settings",
    description: "Manage company details, work hours, and general configuration.",
    icon: Building2,
    href: "/dashboard/admin/organization",
    color: "text-blue-600",
    bg: "bg-blue-50",
    gradient: "from-blue-500 to-cyan-500"
  },
  {
    title: "Leave Types",
    description: "Configure leave quotas, carryover rules, and approval policies.",
    icon: CalendarDays,
    href: "/dashboard/admin/leaves",
    color: "text-green-600",
    bg: "bg-green-50",
    gradient: "from-green-500 to-emerald-500"
  },
  {
    title: "Document Types",
    description: "Define mandatory documents and verification requirements.",
    icon: FileText,
    href: "/dashboard/admin/documents",
    color: "text-purple-600",
    bg: "bg-purple-50",
    gradient: "from-purple-500 to-violet-500"
  },
  {
    title: "Departments",
    description: "Structure your organization hierarchy and cost centers.",
    icon: Users,
    href: "/dashboard/admin/departments",
    color: "text-orange-600",
    bg: "bg-orange-50",
    gradient: "from-orange-500 to-amber-500"
  },
  {
    title: "Roles & Permissions",
    description: "Manage access controls and platform capabilities.",
    icon: Shield,
    href: "/dashboard/admin/roles",
    color: "text-red-600",
    bg: "bg-red-50",
    gradient: "from-red-500 to-rose-500"
  },
  {
    title: "Email Templates",
    description: "Customize automated email notifications and triggers.",
    icon: Mail,
    href: "/dashboard/admin/emails",
    color: "text-sky-600",
    bg: "bg-sky-50",
    gradient: "from-sky-500 to-blue-500"
  },
  {
    title: "Approval Workflows",
    description: "Design approval chains for leaves and documents.",
    icon: GitBranch,
    href: "/dashboard/admin/workflows",
    color: "text-indigo-600",
    bg: "bg-indigo-50",
    gradient: "from-indigo-500 to-purple-500"
  },
  {
    title: "Holiday Calendar",
    description: "Set up annual holidays and optional leaves.",
    icon: CalendarRange,
    href: "/dashboard/admin/holidays",
    color: "text-pink-600",
    bg: "bg-pink-50",
    gradient: "from-pink-500 to-rose-500"
  }
]

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
}

export default function AdminDashboardPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Admin Console</h1>
          <p className="text-slate-500 mt-2">Manage your organization settings and preferences from one central hub.</p>
        </div>
        {/* <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-slate-200 shadow-sm text-sm text-slate-600">
           <Settings className="w-4 h-4" />
           <span>System Configuration</span>
        </div> */}
      </div>

      {/* Grid */}
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
      >
        {adminModules.map((module) => (
          <Link href={module.href} key={module.href} legacyBehavior>
             <motion.a 
                variants={item}
                className="group relative bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 cursor-pointer overflow-hidden"
             >
                <div className={`absolute top-0 right-0 p-24 opacity-5 bg-gradient-to-br ${module.gradient} blur-3xl rounded-full -mr-12 -mt-12 transition-all group-hover:opacity-10`}></div>
                
                <div className="relative z-10">
                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 duration-300", module.bg)}>
                        <module.icon className={cn("w-6 h-6", module.color)} />
                    </div>
                    
                    <h3 className="text-lg font-semibold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
                        {module.title}
                    </h3>
                    
                    <p className="text-sm text-slate-500 leading-relaxed mb-4">
                        {module.description}
                    </p>

                    <div className="flex items-center text-sm font-medium text-slate-400 group-hover:text-blue-600 transition-colors">
                        <span>Configure</span>
                        <ChevronRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
                    </div>
                </div>
             </motion.a>
          </Link>
        ))}
      </motion.div>
    </div>
  )
}
