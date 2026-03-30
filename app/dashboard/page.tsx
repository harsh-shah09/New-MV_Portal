"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { DashboardSkeleton } from "./components/dashboard-skeleton"
import { EmployeeDashboard } from "./components/employee-dashboard"
import { HRDashboard } from "./components/hr-dashboard"
import { useQuery } from "@tanstack/react-query"
import { verifySession } from "@/lib/auth"
import { PageContainer } from "@/components/page-container"
import { Spin, Switch } from "antd"

const DASHBOARD_VIEW_STORAGE_KEY = "dashboard-view-mode"


export default function DashboardPage() {
  const router = useRouter()
  const [role, setRole] = useState<string | null>(null)
  const [title, setTitle] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"default" | "hr">("default")
  
  useEffect(() => {
    let mounted = true
    const loadSession = async () => {
      try {
        const session = await verifySession()
        if (mounted) {
          setRole(session?.role ?? null)
          setTitle(session?.title ?? null)
        }
      } catch (err) {
        if (mounted) setRole(null)
        console.error(err)
      }
    }
    loadSession()
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    if (!role) return

    const isHR = role === "HR"
    const isAdmin = role === "Admin"
    const canAccessHRView = isHR || isAdmin

    if (!canAccessHRView) {
      setViewMode("default")
      return
    }

    const savedView = window.localStorage.getItem(DASHBOARD_VIEW_STORAGE_KEY)
    if (savedView === "hr" || savedView === "default") {
      setViewMode(savedView)
    } else {
      setViewMode(isAdmin ? "hr" : "default")
    }
  }, [role])

  const isHR = role === "HR"
  const isAdmin = role === "Admin"
  const canAccessHRView = isHR || isAdmin

  const handleViewModeChange = (checked: boolean) => {
    if (!canAccessHRView) return

    const nextViewMode = checked ? "hr" : "default"
    setViewMode(nextViewMode)
    window.localStorage.setItem(DASHBOARD_VIEW_STORAGE_KEY, nextViewMode)
  }

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", role, viewMode],
    queryFn: () => fetch(`/api/dashboard?view=${viewMode}&role=${role}`).then((res) => {
      if (!res.ok) {
        if (res.status === 401) {
          router.push("/auth/login")
          throw new Error("Unauthorized")
        }
        throw new Error("Failed to fetch dashboard data")
      }
      return res.json()
    }),
    enabled: !!role,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  })

  if (isLoading || !role) {
    return(
     <div className="w-full h-screen flex items-center justify-center">
        <Spin size="large" tip="Loading Dashboard..." />
      </div>
    )
  }
  return (
    <PageContainer>
      <div className="bg-white p-2 sm:p-4 rounded-xl flex flex-col gap-2 sm:gap-4">
        {canAccessHRView && (
          <div className="flex w-full justify-center sm:justify-end px-2 pt-2">
            <div className={`lg:absolute lg:right-16 lg:mt-10 flex items-center gap-2 sm:gap-3 bg-white px-3 sm:px-4 py-2 sm:py-2 rounded-xl shadow-sm border border-slate-100`}>
              <span className="text-xs sm:text-sm font-medium text-slate-600">My Dashboard</span>
              <Switch 
                checked={viewMode === 'hr'}
                onChange={handleViewModeChange}
                className="bg-slate-200"
              />
              <span className="text-xs sm:text-sm font-medium text-slate-600">{isAdmin ? 'Admin Dashboard' : 'HR Dashboard'}</span>
            </div>
            </div>
        )}
      {viewMode === 'hr' && canAccessHRView ? (
        <HRDashboard data={data} dashboardRole={isAdmin ? 'Admin' : 'HR'} />
      ) : (
        <EmployeeDashboard data={data} hideTeamMembersWidget={isAdmin} />
      )}
      </div>
    </PageContainer>
  )
}
