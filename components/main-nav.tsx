"use client"

import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { LayoutDashboard, Users, CalendarDays, BookOpen, Banknote, Tag, FileCheck, Calendar } from "lucide-react"
import {logout} from "@/lib/auth"
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

export function MainNav() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const router = useRouter()

  const handleLogout = () => {
    setShowLogoutConfirm(true)
  }

  const confirmLogout = () => {
    window.localStorage.clear()
    logout()
    router.push("/auth/login")
  }

  return (
    <>
      <nav className="sticky top-0 z-50 w-full glass border-b border-white/10 bg-gradient-to-r from-cyan-600/90 to-blue-800/90 backdrop-blur-md text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-8">
              <Link href="/" className="flex items-center gap-3 font-bold text-xl hover:opacity-90 transition-opacity group">
                <div className="bg-white/10 p-1.5 rounded-lg backdrop-blur-sm group-hover:bg-white/20 transition-colors">
                  <Image 
                    src="/mv_logo1.png" 
                    alt="MV Portal" 
                    width={48} 
                    height={48} 
                    className="w-10 h-10 object-contain drop-shadow-md"
                  />
                </div>
                <div className="flex flex-col">
                  <span className="bg-gradient-to-r from-white to-blue-50 bg-clip-text text-transparent font-extrabold tracking-tight text-lg leading-none">
                    MV Portal
                  </span>
                  <span className="text-[10px] text-blue-100 font-medium tracking-wider uppercase opacity-80 leading-none mt-0.5">HR Management</span>
                </div>
              </Link>
              <div className="hidden lg:flex gap-1">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="px-3 py-2 rounded-lg text-sm font-medium hover:bg-white/20 hover:text-white transition-all duration-200 flex items-center gap-2"
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="lg:hidden p-2 hover:bg-white/20 rounded-md transition">
                ☰
              </button>
              <button
                onClick={handleLogout}
                className="btn-gradient px-4 py-2 rounded-lg text-sm font-medium transition active:scale-95"
              >
                Logout
              </button>
            </div>
          </div>

          {mobileMenuOpen && (
            <div className="lg:hidden pb-4 space-y-2 animate-in slide-in-from-top-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block px-3 py-2 rounded-md text-sm font-medium hover:bg-white/20 transition flex items-center gap-2"
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </nav>
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
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
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
