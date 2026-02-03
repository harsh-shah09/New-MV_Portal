"use client"

import { Sidebar } from "@/components/sidebar"
import { MobileHeader } from "@/components/mobile-header"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import { Menu } from "lucide-react"


import { OnboardingWizard } from "@/components/onboarding-wizard";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [isClient, setIsClient] = useState(false)
  
  useEffect(() => {
    setIsClient(true)
  }, [])

  const isPublic = pathname === "/" || pathname.startsWith("/auth")
  const [sidebarOpen, setSidebarOpen] = useState(false)

  if (!isClient) return null

  if (isPublic) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col font-sans text-slate-900">
      <OnboardingWizard />
      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-50 w-full backdrop-blur-sm bg-white/80 border-b border-slate-200/60 shadow-sm supports-[backdrop-filter]:bg-white/60">
          <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      </div>
      
      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {children}
      </main>
    </div>
  )
}
