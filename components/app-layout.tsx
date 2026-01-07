"use client"

import { Sidebar } from "@/components/sidebar"
import { MobileHeader } from "@/components/mobile-header"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import { Menu } from "lucide-react"

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
    <div className="flex min-h-screen bg-slate-50/50">
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      <div className="flex-1 flex flex-col min-w-0 min-h-screen transition-all duration-300 ease-in-out"> 
            <MobileHeader onMenuClick={() => setSidebarOpen(true)} />
         <main className="flex-1 overflow-y-auto">
            {children}
         </main>
      </div>
    </div>
  )
}
