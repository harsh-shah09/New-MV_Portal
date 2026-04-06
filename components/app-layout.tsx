"use client"

import { Sidebar } from "@/components/sidebar"
import { MobileHeader } from "@/components/mobile-header"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"
// import { OnboardingWizard } from "@/components/onboarding-wizard";
import { AppTour } from "@/components/app-tour";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [isClient, setIsClient] = useState(false)
  
  useEffect(() => {
    setIsClient(true)
  }, [])

  const isPublic = pathname === "/" || pathname.startsWith("/auth") || pathname.startsWith("/welcome")
  const [sidebarOpen, setSidebarOpen] = useState(false)

  if (!isClient) return null

  if (isPublic) {
    return <>{children}</>
  }

  return (
    <div className="flex min-h-screen relative">
      {/* <OnboardingWizard /> */}
      <AppTour />
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      <div className="flex-1 flex flex-col min-w-0 min-h-screen transition-all duration-300 ease-in-out relative z-10"> 
            <MobileHeader onMenuClick={() => setSidebarOpen(true)} />
         <main className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 hover:scrollbar-thumb-slate-300">
            {children}
         </main>
      </div>
    </div>
  )
}
