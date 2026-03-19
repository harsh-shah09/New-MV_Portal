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

const DASHBOARD_VIEW_STORAGE_KEY = "hr-dashboard-view-mode"


export default function DashboardPage() {
  const router = useRouter()
  const [role, setRole] = useState<string | null>(null)
  const [title, setTitle] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'hr' | 'employee'>('hr')
  
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
    if (role !== "HR") return

    const savedViewMode = window.localStorage.getItem(DASHBOARD_VIEW_STORAGE_KEY)
    if (savedViewMode === "hr" || savedViewMode === "employee") {
      setViewMode(savedViewMode)
    }
  }, [role])

  const handleViewModeChange = (checked: boolean) => {
    const nextViewMode = checked ? "hr" : "employee"
    setViewMode(nextViewMode)

    if (role === "HR") {
      window.localStorage.setItem(DASHBOARD_VIEW_STORAGE_KEY, nextViewMode)
    }
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

  const isHR = role === 'HR'
  const isAdmin = role === 'Admin'

  return (
    <PageContainer>
      <div className="bg-white p-2 rounded-xl">
      {isHR && (
        <div className="flex justify-end mb-4">
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
      {(isHR && viewMode === 'hr') || isAdmin ? (
        <HRDashboard data={data} />
      ) : (
        <EmployeeDashboard data={data} />
      )}
      </div>
    </PageContainer>
  )
}
