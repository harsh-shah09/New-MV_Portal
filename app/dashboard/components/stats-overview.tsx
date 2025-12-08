interface StatOverview {
  title: string
  items: {
    label: string
    value: string | number
    sublabel?: string
  }[]
}

interface StatsOverviewProps {
  stats: StatOverview[]
}

export function StatsOverview({ stats }: StatsOverviewProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 h-full">
      {stats.map((stat, index) => (
        <div key={index} className="glass-card rounded-2xl p-6 bg-white/60 border border-white/60 backdrop-blur-xl hover:shadow-lg transition-all duration-300">
          <h3 className="text-lg font-bold text-gray-800 mb-5 pb-2 border-b border-gray-100">{stat.title}</h3>
          <div className="space-y-4">
            {stat.items.map((item, itemIndex) => (
              <div
                key={itemIndex}
                className="flex justify-between items-center"
              >
                <div>
                  <p className="text-sm font-medium text-gray-600">{item.label}</p>
                  {item.sublabel && <p className="text-xs text-gray-400 mt-0.5">{item.sublabel}</p>}
                </div>
                <p className="text-lg font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
