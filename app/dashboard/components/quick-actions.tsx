import Link from "next/link"
import { UserPlus, CalendarCheck, Banknote, BookOpen } from "lucide-react"

interface QuickAction {
  label: string
  href: string
  icon: any
  description: string
  color: string
}

const actions: QuickAction[] = [
  {
    label: "Add Employee",
    href: "/employees",
    icon: UserPlus,
    description: "Create new employee records",
    color: "text-cyan-600 bg-cyan-50",
  },
  {
    label: "Approve Leave",
    href: "/leaves",
    icon: CalendarCheck,
    description: "Review pending requests",
    color: "text-blue-600 bg-blue-50",
  },
  {
    label: "Process Payroll",
    href: "/payroll",
    icon: Banknote,
    description: "Run monthly payroll",
    color: "text-green-600 bg-green-50",
  },
  {
    label: "View Training",
    href: "/training",
    icon: BookOpen,
    description: "Check training progress",
    color: "text-purple-600 bg-purple-50",
  },
]

export function QuickActions() {
  return (
    <div className="glass-card rounded-2xl p-6 mt-8 bg-white/60 border border-white/60 shadow-lg backdrop-blur-xl">
      <h3 className="text-xl font-bold bg-gradient-to-r from-cyan-900 to-blue-900 bg-clip-text text-transparent mb-6">Quick Actions</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {actions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="group relative p-4 rounded-xl border border-white/50 bg-white/40 hover:bg-white/90 transition-all duration-300 shadow-sm hover:shadow-cyan-500/10 hover:-translate-y-1"
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${action.color} group-hover:scale-110 transition-transform duration-300 shadow-sm`}>
                <action.icon className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-gray-800 group-hover:text-cyan-700 transition">{action.label}</h4>
            <p className="text-sm text-gray-500 mt-1">{action.description}</p>
            
            <div className="absolute inset-0 border-2 border-transparent group-hover:border-cyan-200/50 rounded-xl transition-all duration-300 pointer-events-none" />
          </Link>
        ))}
      </div>
    </div>
  )
}
