"use client"

import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { LayoutDashboard, Users, CalendarDays, BookOpen, Banknote, Tag, FileCheck, Calendar } from "lucide-react"

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
  const router = useRouter()

  const handleLogout = () => {
    localStorage.removeItem("authToken")
    localStorage.removeItem("userRole")
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
                    src="/mv_logo.png" 
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
    </>
  )
}
