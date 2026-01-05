"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

import { KPIStats } from "./components/kpi-stats"
import { ChartSection } from "./components/chart-section"
import { RecentActivities } from "./components/recent-activities"
import { QuickActions } from "./components/quick-actions"
import { StatsOverview } from "./components/stats-overview"
import { DashboardSkeleton } from "./components/dashboard-skeleton"
import { useQuery } from "@tanstack/react-query"


export default function DashboardPage() {
  const router = useRouter()
  const { data,
    isLoading,
    isFetching } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => fetch("/api/dashboard").then((res) => {
      // console.log(res)
      return res.json()
    }),
    placeholderData: {
      kpiStats: [],
      recentActivities: [],
      statsOverview: [],
    },
  })

  if(isLoading || isFetching) return <DashboardSkeleton />

  return (
    <div className="min-h-screen bg-slate-50/50">

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="mb-10">
          <h1 className="text-4xl font-extrabold text-slate-900 mb-2 tracking-tight">Dashboard Overview</h1>
          <p className="text-slate-500 text-lg">Welcome back! Here's what's happening in your organization today.</p>
        </div>

        {/* KPI Cards */}
        <KPIStats stats={data?.kpiStats} />

        {/* Charts */}
        <div className="mt-8">
            <ChartSection stats={data?.statsOverview} />
        </div>

        {/* Recent Activities and Stats Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
          <div className="lg:col-span-1">
            <RecentActivities activities={data?.recentActivities} />
          </div>
          <div className="lg:col-span-2">
            <StatsOverview stats={data?.statsOverview?.filter((s:any) => s.title !== 'Leave Trends')} />
          </div>
        </div>

        {/* Quick Actions */}
        <QuickActions />
      </div>
    </div>
  )
}
