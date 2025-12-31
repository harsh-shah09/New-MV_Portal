"use client"

import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { 
  LayoutDashboard, 
  Users, 
  CalendarDays, 
  BookOpen, 
  Banknote, 
  Tag, 
  FileCheck, 
  Calendar,
  LogOut,
  Bell,
  Settings,
  ChevronRight,
  Menu,
  X,
  User
} from "lucide-react"
import { logout } from "@/lib/auth"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/employees", label: "Employees", icon: Users },
  { href: "/leaves", label: "Leave", icon: CalendarDays },
  { href: "/training", label: "Training", icon: BookOpen },
  { href: "/payroll", label: "Payroll", icon: Banknote },
  { href: "/assets", label: "Assets", icon: Tag },
  { href: "/nda", label: "NDA", icon: FileCheck },
  { href: "/calendar", label: "Calendar", icon: Calendar },
]

export function Sidebar({ 
  open, 
  setOpen 
}: { 
  open?: boolean; 
  setOpen?: (open: boolean) => void 
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [isMobile, setIsMobile] = useState(false)

  const { data: user } = useQuery({
      queryKey: ['me'],
      queryFn: async () => {
          const res = await fetch('/api/me');
          if(!res.ok) return null;
          return res.json();
      }
  })

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024)
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  const handleLogout = () => {
    logout()
    router.push("/auth/login")
  }

  const handleProfileClick = () => {
      if(user?.id) {
          router.push(`/employees/${user.id}`)
      }
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white text-slate-800 relative overflow-hidden border-r border-slate-200">
      {/* Background Gradients (Subtle for Light Mode) */}
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white via-slate-50 to-blue-50/20 z-0"></div>
      <div className="absolute top-0 left-0 w-full h-64 bg-cyan-100/30 blur-[100px] z-0"></div>
      
      {/* Logo Section */}
      <div className="relative z-10 flex items-center gap-3 p-6 border-b border-slate-100">
        <div className="relative group cursor-pointer">
          <div className="absolute -inset-1 bg-gradient-to-r from-cyan-400 to-blue-600 rounded-lg blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
          <div className="relative bg-white rounded-lg p-1.5 ring-1 ring-slate-100 shadow-sm">
            <Image 
              src="/mv_logo.png" 
              alt="MV Portal" 
              width={40} 
              height={40} 
              className="w-8 h-8 object-contain"
            />
          </div>
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">MV Portal</span>
          <span className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">HR Management</span>
        </div>
      </div>

      {/* Navigation */}
      <div className="relative z-10 flex-1 overflow-y-auto py-6 px-3 space-y-1 scrollbar-hide">
        <div className="mb-2 px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Main Menu
        </div>
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
          
          return (
            <Link 
              key={item.href} 
              href={item.href}
              onClick={() => isMobile && setOpen?.(false)}
              className="block"
            >
              <div 
                className={cn(
                  "group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300",
                  isActive 
                    ? "text-white shadow-md shadow-blue-500/15" 
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-pill"
                    className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-xl -z-10"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <item.icon className={cn("w-5 h-5", isActive ? "text-white" : "text-slate-500 group-hover:text-cyan-600 transition-colors")} />
                <span className="font-medium">{item.label}</span>
                {isActive && (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="ml-auto"
                  >
                    <ChevronRight className="w-4 h-4 text-white/80" />
                  </motion.div>
                )}
              </div>
            </Link>
          )
        })}
      </div>

      {/* Notifications & Profile */}
      <div className="relative z-10 p-4 border-t border-slate-100 space-y-4 bg-slate-50/50">
        {/* Notification Preview */}
        <div className="px-3 py-3 bg-white rounded-xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
              <Bell className="w-3.5 h-3.5 text-cyan-500" />
              Notifications
            </div>
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-100 text-cyan-700 text-[10px] font-bold">3</span>
          </div>
          <p className="text-[11px] text-slate-500 line-clamp-1">New leave request from Vivek</p>
        </div>

        {/* Profile Card */}
        <div 
          onClick={handleProfileClick}
          className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-all group cursor-pointer"
        >
          <div className="relative h-10 w-10 shrink-0">
             <div className="relative h-full w-full rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 overflow-hidden">
                {user?.profilePhoto ? (
                    <Image src={user.profilePhoto} width={40} height={40} className="w-full h-full object-cover" alt="Profile" />
                ) : (
                    <User size={20} />
                )}
            </div>
            <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-white"></div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-cyan-600 transition-colors">
                {user ? `${user.firstName} ${user.lastName}` : 'Loading...'}
            </p>
            <p className="text-xs text-slate-500 truncate">{user?.email || '...'}</p>
          </div>
          <button 
            onClick={(e) => {
                e.stopPropagation();
                handleLogout();
            }}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-red-500 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )

  if (isMobile) {
    return (
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen?.(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed inset-y-0 left-0 w-72 bg-white z-50 lg:hidden shadow-2xl"
            >
                <div className="absolute right-4 top-4 z-50">
                    <button onClick={() => setOpen?.(false)} className="text-slate-500 hover:text-slate-800">
                        <X className="w-6 h-6" />
                    </button>
                </div>
              <SidebarContent />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    )
  }

  return (
    <div className="hidden lg:block w-72 h-screen sticky top-0 shadow-xl shadow-slate-200/50 z-40">
      <SidebarContent />
    </div>
  )
}
