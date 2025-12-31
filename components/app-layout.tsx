"use client"

import { Sidebar } from "@/components/sidebar"
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
         <div className="lg:hidden p-4 border-b bg-white flex items-center gap-4 sticky top-0 z-30 shadow-sm">
            <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-slate-100 rounded-lg">
                <Menu className="w-6 h-6 text-slate-700" />
            </button>
            <span className="font-bold text-lg text-slate-800">MV Portal</span>
         </div>
         <main className="flex-1 overflow-y-auto">
            {children}
         </main>
      </div>
    </div>
  )
}
