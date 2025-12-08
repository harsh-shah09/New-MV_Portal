import { ArrowUpRight, ArrowDownRight, LucideIcon } from "lucide-react"

interface KPICard {
  title: string
  value: string | number
  trend?: number
  icon: any
  color: "blue" | "amber" | "red" | "green" | "cyan"
}

interface KPIStatsProps {
  stats: KPICard[]
}

const colorClasses = {
  blue: "text-blue-600 bg-blue-50 border-blue-100",
  amber: "text-amber-600 bg-amber-50 border-amber-100",
  red: "text-red-600 bg-red-50 border-red-100",
  green: "text-green-600 bg-green-50 border-green-100",
  cyan: "text-cyan-600 bg-cyan-50 border-cyan-100",
}

export function KPIStats({ stats }: KPIStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => (
        <div key={index} className="glass-card hover:shadow-xl transition-all duration-300 rounded-2xl p-6 bg-white/70 border border-white/60">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">{stat.title}</p>
              <p className="text-3xl font-extrabold text-gray-800 tracking-tight">{stat.value}</p>
            </div>
            <div className={`p-3 rounded-xl border shadow-sm ${colorClasses[stat.color] || colorClasses.blue}`}>
                {/* Check if icon is a component or string */}
                {typeof stat.icon === 'string' ? stat.icon : <stat.icon className="w-6 h-6" />}
            </div>
          </div>
          {stat.trend !== undefined && (
            <div className={`flex items-center gap-1 text-xs font-bold ${stat.trend >= 0 ? "text-green-600 bg-green-50 px-2 py-1 rounded-full inline-block" : "text-red-600 bg-red-50 px-2 py-1 rounded-full inline-block"}`}>
              {stat.trend >= 0 ? <ArrowUpRight className="w-3 h-3 inline" /> : <ArrowDownRight className="w-3 h-3 inline" />}
              {Math.abs(stat.trend)}% vs last month
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
