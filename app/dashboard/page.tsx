"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { DashboardSkeleton } from "./components/dashboard-skeleton"
import { EmployeeDashboard } from "./components/employee-dashboard"
import { HRDashboard } from "./components/hr-dashboard"
import { useQuery } from "@tanstack/react-query"
import { verifySession } from "@/lib/auth"


export default function DashboardPage() {
  const router = useRouter()
  const [role, setRole] = useState<string | null>(null)
  const [title, setTitle] = useState<string | null>(null)
  
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

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["dashboard", role],
    queryFn: () => fetch("/api/dashboard").then((res) => {
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
    <div className="min-h-screen bg-slate-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {(isHR || isAdmin) ? (
          <HRDashboard data={data} />
        ) : (
          <EmployeeDashboard data={data} />
        )}
      </div>
    </div>
  )
}
