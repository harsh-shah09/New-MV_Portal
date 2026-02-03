"use client"

import { useState, useEffect, useRef } from "react"
import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { 
  LayoutDashboard, 
  Users, 
  CalendarDays, 
  Banknote, 
  Tag, 
  FileCheck, 
  Settings,
  Menu,
  X,
  User as UserIcon,
  Bell,
  LogOut,
  CalendarRange,
  ChevronDown
} from "lucide-react"
import { logout } from "@/lib/auth"
import { cn } from "@/lib/utils"

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
  const [scrolled, setScrolled] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  const { data: user } = useQuery({
      queryKey: ['me'],
      queryFn: async () => {
          const res = await fetch('/api/me');
          if(!res.ok) return null;
          return res.json();
      }
  })

  useEffect(() => {
    const handleScroll = () => {
        setScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)
    // Mobile Check
    const checkMobile = () => setIsMobile(window.innerWidth < 1024)
    checkMobile()
    window.addEventListener("resize", checkMobile)
    
    // Check click outside profile popup
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
        window.removeEventListener('scroll', handleScroll)
        window.removeEventListener("resize", checkMobile)
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [])

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/leaves", label: "Leave", icon: CalendarDays },
    { href: "/holidays", label: "Holidays", icon: CalendarRange },
    { href: "/assets", label: "Assets", icon: Tag },
  ];

  if(user?.role?.includes('HR') || user?.role?.includes('Admin')) {
    navItems.push({ href: "/employees", label: "Employees", icon: Users });
  }

  if (user?.role?.includes('HR') || user?.role?.includes('Admin')) {
    navItems.push({ href: "/payroll", label: "Payroll", icon: Banknote });
    navItems.push({ href: "/my-payrolls", label: "My Payslips", icon: Banknote });
  } else {
    navItems.push({ href: "/my-payrolls", label: "My Payslips", icon: Banknote });
  }

  if (user?.role?.includes('HR')) {
     navItems.push({ href: "/nda", label: "Docs", icon: FileCheck });
  }
  
  if (user?.role?.includes('Admin')) {
      navItems.push({ href: "/admin", label: "Admin", icon: Settings });
  }

  const { data: notifications } = useQuery({
      queryKey: ['notifications'],
      queryFn: async () => {
           const res = await fetch('/api/notifications');
           if (!res.ok) return [];
           return res.json();
      }
  })
  
  const unreadCount = notifications?.filter((n: any) => !n.Is_Read__c)?.length || 0;

  const handleLogout = () => {
    logout()
    router.push("/auth/login")
  }

  const MobileSidebarContent = () => (
    <div className="flex flex-col h-full bg-white text-slate-800 relative overflow-hidden">
       <div className="p-6 border-b border-slate-100/50">
          <Link href="/dashboard" onClick={() => setOpen?.(false)} className="flex items-center gap-3 group">
             <div className="relative w-10 h-10 p-2 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl border border-indigo-100/50 shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all duration-300">
                <Image src="/mv_logo.png" alt="MV Portal" fill className="object-contain p-1.5" />
             </div>
             <div className="flex flex-col">
                <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent group-hover:from-indigo-600 group-hover:to-blue-600 transition-all duration-300">MV Portal</span>
                <span className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold group-hover:text-indigo-400 transition-colors">Employee Hub</span>
             </div>
          </Link>
       </div>
       <div className="flex-1 overflow-y-auto py-4 space-y-1 px-3">
         {navItems.map((item) => {
             const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
             return (
                 <Link key={item.href} href={item.href} onClick={() => setOpen?.(false)} className="block">
                     <div className={cn("flex items-center gap-3 px-4 py-3 rounded-xl transition-all", isActive ? "bg-blue-50 text-blue-600 font-medium" : "text-slate-600 hover:bg-slate-50")}>
                         <item.icon className="w-5 h-5" />
                         <span>{item.label}</span>
                     </div>
                 </Link>
             )
         })}
       </div>
       
       {/* Mobile Logout / Profile */}
       <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-slate-100 overflow-hidden relative">
                 {user?.profilePhoto ? (
                    <Image src={user.profilePhoto} alt="Profile" fill className="object-cover" />
                 ) : (
                    <UserIcon className="w-5 h-5 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-slate-400" />
                 )}
              </div>
              <div>
                  <p className="font-medium text-slate-900">{user?.name}</p>
                  <p className="text-xs text-slate-500">{user?.role}</p>
              </div>
          </div>
          <button 
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 p-2.5 rounded-lg border border-red-100 text-red-600 hover:bg-red-50 transition-colors"
          >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
          </button>
       </div>
    </div>
  )

  return (
    <>
      {/* Desktop Top Bar */}
      <div className={cn(
          "hidden lg:flex items-center justify-between px-6 h-20 w-full transition-all duration-300",
          scrolled ? "bg-white/95 backdrop-blur-md shadow-md border-b border-slate-100" : "bg-white shadow-sm border-b border-slate-200"
      )}>
          {/* Left: Logo & Nav */}
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="flex items-center gap-3">
                <div className="relative h-9 w-9">
                    <Image src="/mv_logo.png" alt="Logo" fill className="object-contain" />
                </div>
                <span className="font-bold text-xl tracking-tight text-slate-800 hidden xl:block">MV Portal</span>
            </Link>

             {/* Navigation (Horizontal) */}
            <nav className="flex items-center gap-1 bg-slate-50/50 p-1 rounded-2xl border border-slate-200/50">
                {navItems.map((item) => {
                     const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
                     return (
                         <Link key={item.href} href={item.href} className="relative px-4 py-2 text-sm font-medium transition-colors rounded-xl overflow-hidden group">
                             <span className={cn("relative z-10 flex items-center gap-2 transition-colors", isActive ? "text-blue-600 font-semibold" : "text-slate-500 hover:text-slate-700")}>
                                 <item.icon className={cn("w-4 h-4", isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-500")} />
                                 {item.label}
                             </span>
                             {isActive && (
                                 <motion.div 
                                    layoutId="navbar-pill"
                                    className="absolute inset-0 bg-white shadow-sm border border-slate-100 rounded-xl z-0"
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                 />
                             )}
                         </Link>
                     )
                })}
            </nav>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-5">
              {/* Notification Bell */}
              <div 
                  className="relative cursor-pointer text-slate-500 hover:text-blue-600 transition-colors p-2.5 rounded-full hover:bg-slate-100 border border-transparent hover:border-slate-200"
                  onClick={() => router.push('/notifications')}
              >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white animate-pulse" />
                  )}
              </div>

              <div className="h-6 w-px bg-slate-200 mx-1"></div>

              {/* Profile Dropdown */}
              <div className="relative" ref={profileRef}>
                  <div 
                    className="cursor-pointer"
                    onClick={() => setProfileOpen(!profileOpen)}
                  >
                       <div className="h-10 w-10 rounded-full ring-2 ring-slate-100 hover:ring-blue-100 transition-all overflow-hidden relative">
                          {user?.profilePhoto ? (
                              <Image src={user.profilePhoto} alt="Profile" fill className="object-cover" />
                          ) : (
                              <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-400">
                                  <UserIcon className="w-5 h-5" />
                              </div>
                          )}
                       </div>
                  </div>

                  {/* Popup Menu */}
                  <AnimatePresence>
                      {profileOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className="absolute right-0 top-14 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-50 origin-top-right"
                          >
                              <div className="px-4 py-3 mb-2 bg-slate-50/50 rounded-xl border border-slate-100/50">
                                  <p className="font-semibold text-slate-800 truncate">{user?.name || 'User'}</p>
                                  <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                                  <span className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700">
                                      {user?.role}
                                  </span>
                              </div>
                              
                              <Link 
                                href={`/employees/${user?.id}`}
                                onClick={() => setProfileOpen(false)}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              >
                                  <UserIcon className="w-4 h-4" />
                                  My Profile
                              </Link>
                              
                              <div className="my-1 border-t border-slate-100"></div>
                              
                              <button 
                                onClick={handleLogout}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors"
                              >
                                  <LogOut className="w-4 h-4" />
                                  Log Out
                              </button>
                          </motion.div>
                      )}
                  </AnimatePresence>
              </div>
          </div>
      </div>

      {/* Mobile Top Bar */}
      <div className="lg:hidden flex items-center justify-between px-4 h-16 bg-white border-b border-slate-200 sticky top-0 z-50">
         <div className="flex items-center gap-3">
            <button 
                onClick={() => setOpen?.(true)} 
                className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
                <Menu className="w-6 h-6" />
            </button>
            <span className="font-bold text-lg text-slate-800">MV Portal</span>
         </div>
         
         <div 
            className="relative h-8 w-8 rounded-full bg-slate-100 overflow-hidden ring-1 ring-slate-200" 
            onClick={() => setOpen?.(true)} // Clicking profile mobile opens sidebar too for simplicity, or router push
         >
             {user?.profilePhoto ? (
                 <Image src={user.profilePhoto} alt="Profile" fill className="object-cover" />
             ) : (
                 <UserIcon className="w-4 h-4 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-slate-500" />
             )}
         </div>
      </div>

      {/* Mobile Sidebar Drawer Overlay */}
      <AnimatePresence>
        {(open && isMobile) && (
          <div className="fixed inset-0 z-[60] lg:hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen?.(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="absolute inset-y-0 left-0 w-80 shadow-2xl h-full"
            >
                <MobileSidebarContent />
                <button 
                    onClick={() => setOpen?.(false)}
                    className="absolute top-4 right-4 p-2 bg-white/80 rounded-full text-slate-500 shadow-sm border border-slate-100"
                >
                    <X className="w-5 h-5" />
                </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}