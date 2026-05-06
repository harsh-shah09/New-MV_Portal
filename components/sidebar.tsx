"use client"

import { useState, useEffect } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
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
  CalendarRange,
  Bell,
  Settings,
  ChevronRight,
  Menu,
  X,
  User,
  FileText
} from "lucide-react"
import { logout } from "@/lib/auth"
import { cn } from "@/lib/utils"

/* Static definition removed. Dynamic navItems used below */

export function Sidebar({
  open,
  setOpen
}: {
  open?: boolean;
  setOpen?: (open: boolean) => void
}) {
  const pathname = usePathname()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isMobile, setIsMobile] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  const { data: user, isLoading: isUserLoading } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await fetch('/api/me');
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 0, // Always refetch on mount
    refetchOnWindowFocus: true, // Refetch when window regains focus
    refetchOnMount: true // Always refetch on component mount
  })

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/leaves", label: "Leave", icon: CalendarDays },
    { href: "/holidays", label: "Holidays", icon: CalendarRange },
    { href: "/handbook", label: "Handbook", icon: BookOpen },
    // { href: "/documents", label: "Documents", icon: FileText },
  ];

  if (user?.role?.includes('HR') || user?.role?.includes('Admin')) {
    navItems.push({ href: "/employees", label: "Employees", icon: Users });
    navItems.push({ href: "/assets", label: "Assets", icon: Tag });
  }
  // Add Payroll for Admin only; My Payslips for all roles
  if (user?.role?.includes('Admin')) {
    navItems.push({ href: "/payroll", label: "Payroll", icon: Banknote });
  }
  navItems.push({ href: "/my-payrolls", label: "My Payslips", icon: Banknote });

  // Add Document Manager for HR only
  if (user?.role?.includes('HR') || user?.role?.includes('Admin')) {
    navItems.push({ href: "/nda", label: "Document Manager", icon: FileCheck });
  }
  // Add Admin Console for HR/Admin
  if (user?.role?.includes('Admin')) {
    navItems.push({ href: "/admin", label: "Admin Console", icon: Settings });
  }
  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await fetch('/api/notifications');
      if (!res.ok) return [];
      return res.json();
    }
  })

  
  const unreadNotifications = notifications?.filter((n: any) =>
    n.Status__c === 'Unread' ||
    n.Is_Read__c === false ||
    n.Is_Read__c === 'false' ||
    !n.Is_Read__c
  ) || [];

  const unreadCount = unreadNotifications.length;

  const latestNotif = unreadCount > 0 ? unreadNotifications[0] : null;
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024)
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  // Open/close sidebar during guided tour on mobile
  useEffect(() => {
    const onTourStart = () => {
      if (window.innerWidth < 1024) {
        // Small delay so joyride initialises after the sidebar slides in
        setTimeout(() => setOpen?.(true), 50);
      }
    };
    const onTourEnd = () => {
      if (window.innerWidth < 1024) {
        setOpen?.(false);
      }
    };
    window.addEventListener('mv:tour:start', onTourStart);
    window.addEventListener('mv:tour:end',   onTourEnd);
    return () => {
      window.removeEventListener('mv:tour:start', onTourStart);
      window.removeEventListener('mv:tour:end',   onTourEnd);
    };
  }, [setOpen]);

  const handleLogout = async () => {
    setShowLogoutConfirm(true)
  }

  const confirmLogout = async () => {
    window.localStorage.clear()
    await logout()
    // Clear all React Query cache
    queryClient.clear()
    router.push("/auth/login")
  }

  const handleProfileClick = () => {
    if (user?.id) {
      router.push(`/employees/${user.id}`)
    }
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white text-slate-800 relative overflow-hidden border-r border-slate-200">
      {/* Background Gradients (Subtle for Light Mode) */}
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white via-slate-50 to-blue-50/20 z-0"></div>
      <div className="absolute top-0 left-0 w-full h-64 bg-cyan-100/30 blur-[100px] z-0"></div>

      {/* Logo Section */}
      <Link href={'#'} className="relative z-10 flex items-center gap-3 p-6 border-b border-slate-100 cursor-default">
        <div className="relative group cursor-pointer">
          <div className="absolute -inset-1 bg-gradient-to-r from-cyan-400 to-blue-600 rounded-lg blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
          <div className="relative bg-white rounded-lg p-1.5 ring-1 ring-slate-100 shadow-sm">
            <Image
              src="/mv_logo1.png"
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
      </Link>

      {/* Navigation */}
      <div className="relative z-10 flex-1 overflow-y-auto py-6 px-3 space-y-1 scrollbar-hide">
        <div className="mb-2 px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Main Menu
        </div>
        {isUserLoading ? (
          Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl animate-pulse mb-1">
              <div className="w-5 h-5 rounded bg-slate-200/60"></div>
              <div className="h-4 w-32 bg-slate-200/60 rounded"></div>
            </div>
          ))
        ) : (
          navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
            // derive tour key: "/my-payrolls" → "my-payrolls"
            const tourKey = item.href.replace(/^\//, '')

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => isMobile && setOpen?.(false)}
                data-tour={tourKey}
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
          })
        )}
      </div>

      {/* Notifications & Profile */}
      <div className="relative z-10 p-4 border-t border-slate-100 space-y-4 bg-slate-50/50 hidden lg:block">
        {/* Notification Preview */}
        <div
          onClick={() => router.push('/notifications')}
          className="px-3 py-3 bg-white rounded-xl border border-slate-100 shadow-sm cursor-pointer hover:shadow-md hover:border-blue-100 transition-all group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-600 group-hover:text-blue-600 transition-colors">
              <Bell className="w-3.5 h-3.5 text-cyan-500" />
              Notifications
            </div>
            {unreadCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-red-600 text-[10px] font-bold">
                {unreadCount}
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 line-clamp-1">
            {latestNotif ? latestNotif.Message__c : 'No New Notification'}
          </p>
        </div>

        {/* Profile Card */}
        {isUserLoading ? (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-100 shadow-sm animate-pulse">
            <div className="h-10 w-10 shrink-0 rounded-full bg-slate-200/60"></div>
            <div className="flex-1 min-w-0 space-y-2">
              <div className="h-4 w-24 bg-slate-200/60 rounded"></div>
              <div className="h-3 w-16 bg-slate-200/60 rounded"></div>
            </div>
            <div className="h-6 w-6 rounded-md bg-slate-200/60 ml-auto"></div>
          </div>
        ) : (
          <div
            data-tour="profile-card"
          onClick={handleProfileClick}
          className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-all group cursor-pointer relative"
        >
          <div className="relative h-10 w-10 shrink-0">
            <div className="relative h-full w-full rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 overflow-hidden">
              {user?.profilePhoto ? (
                <Image key={user?.id} src={user.profilePhoto} width={40} height={40} className="w-full h-full object-cover" alt="Profile" />
              ) : (
                <User size={20} />
              )}
            </div>
            <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-white"></div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p key={user?.id} className="text-sm font-semibold text-slate-800 truncate group-hover:text-cyan-600 transition-colors">
                {user ? `${user.name}` : 'Loading...'}
              </p>
              {/* Role Badge */}
              <span className={cn(
                "px-1.5 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wide",
                (user?.role?.includes('HR') || user?.role?.includes('Admin'))
                  ? "bg-purple-100 text-purple-700 border-purple-200"
                  : "bg-blue-50 text-blue-600 border-blue-100"
              )}>
                {user?.role || 'Employee'}
              </span>
            </div>
            <p className="text-xs text-slate-500 truncate">View Profile</p>
          </div>
          <div className="flex flex-col gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleLogout();
              }}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-red-500 transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
        )}
      </div>
      <LogoutConfirmModal 
        open={showLogoutConfirm} 
        onClose={() => setShowLogoutConfirm(false)} 
        onConfirm={confirmLogout} 
      />
    </div>
  )

  if (isMobile) {
    return (
      <>
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
        <LogoutConfirmModal 
          open={showLogoutConfirm} 
          onClose={() => setShowLogoutConfirm(false)} 
          onConfirm={confirmLogout} 
        />
      </>
    )
  }

  return (
    <>
      <div className="hidden lg:block w-72 h-screen sticky top-0 shadow-xl shadow-slate-200/50 z-40">
        <SidebarContent />
      </div>
      <LogoutConfirmModal 
        open={showLogoutConfirm} 
        onClose={() => setShowLogoutConfirm(false)} 
        onConfirm={confirmLogout} 
      />
    </>
  )
}

function LogoutConfirmModal({ open, onClose, onConfirm }: { open: boolean; onClose: () => void; onConfirm: () => void }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all border border-gray-100">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
              <LogOut className="w-6 h-6 text-red-500" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Logout Confirmation</h3>
              <p className="text-sm text-gray-600">
                Are you sure you want to logout? You will need to login again to access your account.
              </p>
            </div>
          </div>
        </div>
        <div className="px-6 py-4 bg-gray-50 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-700 rounded-lg font-medium transition-colors border border-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
          >
            Yes, Logout
          </button>
        </div>
      </div>
    </div>
  )
}