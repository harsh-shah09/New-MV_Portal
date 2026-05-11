"use client"

import { Sidebar } from "@/components/sidebar"
import { MobileHeader } from "@/components/mobile-header"
import { usePathname } from "next/navigation"
import { useState, useEffect, createContext } from "react"
// import { OnboardingWizard } from "@/components/onboarding-wizard";
import { AppTour } from "@/components/app-tour";

export const LayoutContext = createContext({
  hideSidebar: false,
  setHideSidebar: (val: boolean) => {}
});

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [isClient, setIsClient] = useState(false)
  const [hideSidebar, setHideSidebar] = useState(false)
  
  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    setHideSidebar(false)
  }, [pathname])

  const isPublic = pathname === "/" || pathname.startsWith("/auth") || pathname.startsWith("/welcome") || hideSidebar
  const [sidebarOpen, setSidebarOpen] = useState(false)

  if (!isClient) return null

  if (isPublic) {
    return (
      <LayoutContext.Provider value={{ hideSidebar, setHideSidebar }}>
        {children}
      </LayoutContext.Provider>
    )
  }

  return (
    <LayoutContext.Provider value={{ hideSidebar, setHideSidebar }}>
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
    </LayoutContext.Provider>
  )
}
