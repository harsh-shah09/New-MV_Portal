import { motion } from "framer-motion"
import { Activity, Clock, FileText, UserPlus, FileCheck } from "lucide-react"

interface ActivityItem {
  id: string
  type: "leave" | "training" | "employee" | "approval"
  message: string
  timestamp: string
  icon: any
  color: "blue" | "green" | "amber" | "red"
}

interface RecentActivitiesProps {
  activities: ActivityItem[]
}

const colorClasses = {
  blue: "bg-blue-100 text-blue-700 ring-blue-500/20",
  green: "bg-green-100 text-green-700 ring-green-500/20",
  amber: "bg-amber-100 text-amber-700 ring-amber-500/20",
  red: "bg-red-100 text-red-700 ring-red-500/20",
}

const iconMap: any = {
  Activity: Activity,
  leave: Clock,
  training: FileText,
  employee: UserPlus,
  approval: FileCheck,
};

export function RecentActivities({ activities }: RecentActivitiesProps) {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const item = {
    hidden: { opacity: 0, x: -20 },
    show: { opacity: 1, x: 0 }
  }

  if (!activities) return null;

  return (
    <div className="glass-card rounded-2xl p-6 bg-white/60 border border-white/60 backdrop-blur-xl h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold bg-gradient-to-r from-cyan-900 to-blue-900 bg-clip-text text-transparent">
          Recent Activities
        </h3>
        <span className="text-xs font-medium px-2 py-1 bg-white/50 rounded-full text-slate-500 border border-white">
          Today
        </span>
      </div>
      
      <motion.div 
        className="space-y-6 relative flex-1"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {/* Vertical line connecting timeline */}
        <div className="absolute left-[1.2rem] top-2 bottom-4 w-px bg-slate-200/60 -z-10" />

        {activities.map((activity) => {
          const IconComponent = typeof activity.icon === 'string' ? iconMap[activity.icon] || iconMap[activity.type] || Activity : activity.icon;
          return (
            <motion.div 
              key={activity.id} 
              variants={item}
              className="flex items-start gap-4 group cursor-default"
            >
              <div
                className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${colorClasses[activity.color] || colorClasses.blue} ring-4 ring-white shadow-sm z-10 group-hover:scale-110 transition-transform duration-200`}
              >
                <IconComponent className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex justify-between items-start gap-2">
                  <p className="text-sm font-semibold text-gray-800 group-hover:text-blue-700 transition-colors line-clamp-2">
                    {activity.message}
                  </p>
                  <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                    {activity.timestamp}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                  {activity.type.charAt(0).toUpperCase() + activity.type.slice(1)}
                </p>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
      
      <div className="mt-6 pt-4 border-t border-slate-100 block text-center">
        <button className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline transition-all">
          View All Activity
        </button>
      </div>
    </div>
  )
}
