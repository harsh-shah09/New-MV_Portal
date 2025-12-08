interface Activity {
  id: string
  type: "leave" | "training" | "employee" | "approval"
  message: string
  timestamp: string
  icon: any
  color: "blue" | "green" | "amber" | "red"
}

interface RecentActivitiesProps {
  activities: Activity[]
}

export function RecentActivities({ activities }: RecentActivitiesProps) {
  const colorClasses = {
    blue: "bg-blue-100 text-blue-700",
    green: "bg-green-100 text-green-700",
    amber: "bg-amber-100 text-amber-700",
    red: "bg-red-100 text-red-700",
  }

  return (
    <div className="glass-card rounded-2xl p-6 bg-white/60 border border-white/60 backdrop-blur-xl h-full">
      <h3 className="text-xl font-bold bg-gradient-to-r from-cyan-900 to-blue-900 bg-clip-text text-transparent mb-6">Recent Activities</h3>
      <div className="space-y-4">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-start gap-4 pb-4 border-b border-black/5 last:border-b-0 group">
            <div
              className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${colorClasses[activity.color]} group-hover:scale-110 transition-transform duration-200 shadow-sm`}
            >
              {/* Check if icon is component or element */}
              {typeof activity.icon === 'function' || typeof activity.icon === 'object' ? <activity.icon className="w-5 h-5" /> : activity.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 group-hover:text-blue-700 transition-colors">{activity.message}</p>
              <p className="text-xs text-gray-500 mt-1">{activity.timestamp}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
