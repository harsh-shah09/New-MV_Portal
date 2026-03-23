"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { DashboardSkeleton } from "./components/dashboard-skeleton"
import { EmployeeDashboard } from "./components/employee-dashboard"
import { HRDashboard } from "./components/hr-dashboard"
import { useQuery } from "@tanstack/react-query"
import { verifySession } from "@/lib/auth"
import { PageContainer } from "@/components/page-container"
import { Switch } from "antd"

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
      setViewMode("default")
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

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["dashboard", role, viewMode],
    queryFn: () => fetch(`/api/dashboard?view=${viewMode}`).then((res) => {
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
  })

  if (isLoading || isFetching || !role) return <DashboardSkeleton />

  return (
    <PageContainer>
      <div className="bg-white p-2 rounded-xl relative">
      {canAccessHRView && (
        <div className="flex justify-end mb-4 absolute top-[1%] right-[2%]">
          <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-lg shadow-sm border">
            <span className="text-sm font-medium text-gray-700">My Dashboard</span>
            <Switch
              checked={viewMode === 'hr'}
              onChange={handleViewModeChange}
              className="bg-gray-300"
            />
            <span className="text-sm font-medium text-gray-700">HR Dashboard</span>
          </div>
        </div>
      )}
      {viewMode === 'hr' && canAccessHRView ? (
        <HRDashboard data={data} />
      ) : (
        <EmployeeDashboard data={data} />
      )}
      </div>
    </PageContainer>
  )
}
