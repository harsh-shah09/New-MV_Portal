"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { MainNav } from "@/components/main-nav"
import { getAuthToken } from "@/lib/auth"
import { KPIStats } from "./components/kpi-stats"
import { ChartSection } from "./components/chart-section"
import { RecentActivities } from "./components/recent-activities"
import { QuickActions } from "./components/quick-actions"
import { StatsOverview } from "./components/stats-overview"
import { Users, CalendarClock, Clock, Award, Calendar, CheckCircle, PartyPopper } from "lucide-react"

const kpiStats = [
  { title: "Total Employees", value: 245, trend: 5, icon: Users, color: "blue" as const },
  { title: "Active Leaves", value: 12, trend: -3, icon: CalendarClock, color: "amber" as const },
  { title: "Pending Approvals", value: 8, trend: 2, icon: Clock, color: "red" as const },
  { title: "Training Completed", value: 156, trend: 12, icon: Award, color: "green" as const },
]

const recentActivities = [
  {
    id: "1",
    type: "leave" as const,
    message: "John Doe requested 5-day annual leave",
    timestamp: "2 hours ago",
    icon: Calendar,
    color: "blue" as const,
  },
  {
    id: "2",
    type: "training" as const,
    message: "Jane Smith completed React Advanced Course",
    timestamp: "5 hours ago",
    icon: CheckCircle,
    color: "green" as const,
  },
  {
    id: "3",
    type: "employee" as const,
    message: "Mike Johnson joined Engineering team",
    timestamp: "1 day ago",
    icon: PartyPopper,
    color: "blue" as const,
  },
  {
    id: "4",
    type: "approval" as const,
    message: "Payroll for June processed successfully",
    timestamp: "2 days ago",
    icon: CheckCircle,
    color: "green" as const,
  },
]

const statsOverview = [
  {
    title: "Department Summary",
    items: [
      { label: "Engineering", value: 45, sublabel: "Highest headcount" },
      { label: "Sales", value: 38, sublabel: "Active team" },
      { label: "HR", value: 12, sublabel: "Support team" },
      { label: "Marketing", value: 20, sublabel: "Growing team" },
    ],
  },
  {
    title: "Payroll Status",
    items: [
      { label: "June Processed", value: "245", sublabel: "All employees" },
      { label: "Total Amount", value: "$2.1M", sublabel: "Monthly spend" },
      { label: "Pending", value: "0", sublabel: "All paid" },
      { label: "Next Run", value: "Jul 1", sublabel: "Scheduled" },
    ],
  },
]

export default function DashboardPage() {
  const router = useRouter()

  useEffect(() => {
    if (!getAuthToken()) {
      router.push("/auth/login")
    }
  }, [router])

  return (
    <div className="min-h-screen bg-slate-50/50">
      <MainNav />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="mb-10">
          <h1 className="text-4xl font-extrabold text-slate-900 mb-2 tracking-tight">Dashboard Overview</h1>
          <p className="text-slate-500 text-lg">Welcome back! Here's what's happening in your organization today.</p>
        </div>

        {/* KPI Cards */}
        <KPIStats stats={kpiStats} />

        {/* Charts */}
        <div className="mt-8">
            <ChartSection />
        </div>

        {/* Recent Activities and Stats Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
          <div className="lg:col-span-1">
            <RecentActivities activities={recentActivities} />
          </div>
          <div className="lg:col-span-2">
            <StatsOverview stats={statsOverview} />
          </div>
        </div>

        {/* Quick Actions */}
        <QuickActions />
      </div>
    </div>
  )
}
