"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { DashboardSkeleton } from "./components/dashboard-skeleton"
import { EmployeeDashboard } from "./components/employee-dashboard"
import { HRDashboard } from "./components/hr-dashboard"
import { useQuery } from "@tanstack/react-query"
import { verifySession } from "@/lib/auth"
import { motion } from "framer-motion"
import { Sun, Moon, CloudRain, Snowflake, Zap, CloudSun } from "lucide-react"

export default function DashboardPage() {
  const router = useRouter()
  const [role, setRole] = useState<string | null>(null)
  const [title, setTitle] = useState<string | null>(null)
  
  // Greeting State
  const [greeting, setGreeting] = useState("Good Day")
  const [currentDate, setCurrentDate] = useState("")
  const [currentTime, setCurrentTime] = useState("")
  const [season, setSeason] = useState("Day")

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

  // Time & Greeting Logic
  useEffect(() => {
    const updateTime = () => {
        const now = new Date()
        const hour = now.getHours()
        const month = now.getMonth() // 0-11
        
        // Greeting
        if (hour >= 5 && hour < 12) setGreeting("Good Morning")
        else if (hour >= 12 && hour < 17) setGreeting("Good Afternoon")
        else if (hour >= 17 && hour < 22) setGreeting("Good Evening")
        else setGreeting("Good Night")

        // Date String
        setCurrentDate(now.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))
        
        // Time String
        setCurrentTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }))

        // Season/Weather Approximation
        // North Hemisphere
        if (month >= 2 && month <= 4) setSeason("Spring")
        else if (month >= 5 && month <= 7) setSeason("Summer")
        else if (month >= 8 && month <= 10) setSeason("Autumn")
        else setSeason("Winter")
    }
    
    updateTime()
    const interval = setInterval(updateTime, 60000) // Update minute every minute
    return () => clearInterval(interval)
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

  const getSeasonIcon = () => {
      if (season === "Spring") return <CloudSun className="w-8 h-8 text-yellow-500" />
      if (season === "Summer") return <Sun className="w-8 h-8 text-orange-500" />
      if (season === "Autumn") return <CloudRain className="w-8 h-8 text-blue-400" />
      if (season === "Winter") return <Snowflake className="w-8 h-8 text-cyan-400" />
      return <Sun className="w-8 h-8 text-yellow-500" />
  }

  const getGradient = () => {
      // Dynamic gradient based on time/greeting?
      if (greeting.includes("Morning")) return "from-cyan-500 to-blue-600"
      if (greeting.includes("Afternoon")) return "from-blue-500 to-indigo-600"
      if (greeting.includes("Evening")) return "from-indigo-600 to-purple-700"
      if (greeting.includes("Night")) return "from-slate-800 to-slate-900"
      return "from-blue-600 to-indigo-600"
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Dynamic Greeting Header */}
      <motion.div 
         initial={{ y: -20, opacity: 0 }}
         animate={{ y: 0, opacity: 1 }}
         transition={{ duration: 0.5 }}
         className={`relative overflow-hidden rounded-3xl bg-gradient-to-r ${getGradient()} p-8 text-white shadow-xl shadow-blue-900/10`}
      >
          {/* Background Decor */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none"></div>

          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
              <div>
                  <div className="flex items-center gap-2 text-blue-100 mb-1 text-sm font-medium uppercase tracking-wider">
                      {getSeasonIcon()}
                      <span>{season} Season</span>
                  </div>
                  <h1 className="text-4xl md:text-5xl font-bold mb-2 tracking-tight">
                      {greeting}<span className="text-white/90">{data?.employeeName ? `, ${data.employeeName.split(' ')[0]}` : ''}</span>
                  </h1>
                  <p className="text-lg text-blue-50/80 font-light max-w-xl">
                      {isHR || isAdmin ? "Overview of organization performance and employee activities." : "Welcome back to your employee portal. Here's your summary."}
                  </p>
              </div>
              <div className="text-right">
                  <p className="text-3xl font-bold font-mono tracking-wider">{currentTime}</p>
                  <p className="text-blue-200 font-medium">{currentDate}</p>
              </div>
          </div>
      </motion.div>

      {/* Dashboard Content */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        {(isHR || isAdmin) ? (
          <HRDashboard data={data} />
        ) : (
          <EmployeeDashboard data={data} />
        )}
      </motion.div>
    </div>
  )
}
