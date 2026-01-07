"use client"

import { Menu, Bell, LogOut, User as UserIcon } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { logout } from "@/lib/auth"
import { motion, AnimatePresence } from "framer-motion"

export function MobileHeader({ onMenuClick }: { onMenuClick: () => void }) {
  const router = useRouter()
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  const { data: user } = useQuery({
      queryKey: ['me'],
      queryFn: async () => {
          const res = await fetch('/api/me');
          if(!res.ok) return null;
          return res.json();
      }
  })

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

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div className="lg:hidden px-4 py-3 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 sticky top-0 z-30 supports-[backdrop-filter]:bg-white/60">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                 <button 
                    onClick={onMenuClick} 
                    className="p-2 -ml-2 hover:bg-slate-100/80 rounded-xl transition-colors text-slate-600 active:scale-95"
                 >
                     <Menu className="w-6 h-6" />
                 </button>
                 <div className="flex flex-col">
                    <span className="font-bold text-lg leading-none bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">MV Portal</span>
                 </div>
            </div>

            <div className="flex items-center gap-1.5">
                {/* Notification */}
                <button 
                    onClick={() => router.push('/notifications')}
                    className="relative p-2.5 rounded-full hover:bg-slate-100 text-slate-500 hover:text-blue-600 transition-colors active:scale-95"
                >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                         <span className="absolute top-2 right-2.5 flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                         </span>
                    )}
                </button>

                {/* Profile Dropdown */}
                <div className="relative" ref={profileRef}>
                    <button 
                        onClick={() => setIsProfileOpen(!isProfileOpen)}
                        className="flex items-center gap-2 p-1 pl-2 rounded-full hover:bg-slate-100 transition-all border border-transparent hover:border-slate-200"
                    >
                         <div className="relative h-8 w-8 rounded-full ring-2 ring-white shadow-sm overflow-hidden bg-slate-100">
                            {user?.profilePhoto ? (
                                <Image src={user.profilePhoto} width={32} height={32} alt="Profile" className="object-cover w-full h-full" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-400">
                                    <UserIcon className="w-5 h-5" />
                                </div>
                            )}
                         </div>
                    </button>

                    <AnimatePresence>
                        {isProfileOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                transition={{ duration: 0.2 }}
                                className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl ring-1 ring-slate-900/5 py-2 origin-top-right overflow-hidden"
                            >
                                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                                    <p className="text-sm font-semibold text-slate-900 truncate">
                                        {user ? `${user.firstName} ${user.lastName}` : 'Guest'}
                                    </p>
                                    <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                                </div>
                                <div className="p-1">
                                    <button 
                                        onClick={() => {
                                            if (user?.id) router.push(`/employees/${user.id}`)
                                            setIsProfileOpen(false)
                                        }}
                                        className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors"
                                    >
                                        <UserIcon className="w-4 h-4" />
                                        View Profile
                                    </button>
                                    <button 
                                        onClick={handleLogout}
                                        className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        Sign out
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    </div>
  )
}
