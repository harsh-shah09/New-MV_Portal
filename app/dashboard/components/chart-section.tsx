"use client"

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

const departmentData = [
  { name: "Engineering", employees: 45, budget: 450000 },
  { name: "Sales", employees: 38, budget: 320000 },
  { name: "HR", employees: 12, budget: 120000 },
  { name: "Marketing", employees: 20, budget: 180000 },
  { name: "Finance", employees: 15, budget: 150000 },
  { name: "Support", employees: 25, budget: 200000 },
]

const leaveData = [
  { month: "Jan", approved: 24, pending: 5, rejected: 2 },
  { month: "Feb", approved: 28, pending: 3, rejected: 1 },
  { month: "Mar", approved: 32, pending: 4, rejected: 2 },
  { month: "Apr", approved: 26, pending: 6, rejected: 3 },
  { month: "May", approved: 30, pending: 2, rejected: 1 },
  { month: "Jun", approved: 35, pending: 5, rejected: 2 },
]

const trainingData = [
  { name: "Completed", value: 156, fill: "#0891b2" }, // Cyan-600
  { name: "In Progress", value: 42, fill: "#2563eb" }, // Blue-600
  { name: "Pending", value: 18, fill: "#f59e0b" },    // Amber-500
]

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/90 backdrop-blur-md p-3 rounded-lg shadow-lg border border-white/50 text-xs">
        <p className="font-bold text-gray-800 mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
                {entry.name}: {entry.value}
            </p>
        ))}
      </div>
    );
  }
  return null;
};

export function ChartSection() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      {/* Employees by Department */}
      <div className="glass-card bg-white/60 border border-white/60 rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-bold text-gray-800 mb-6">Employees by Department</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={departmentData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} />
            <YAxis tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(0,0,0,0.05)'}} />
            <Bar dataKey="employees" fill="url(#colorGradient)" radius={[6, 6, 0, 0]} />
            <defs>
                <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.8}/>
                </linearGradient>
            </defs>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Leave Requests Trend */}
      <div className="glass-card bg-white/60 border border-white/60 rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-bold text-gray-800 mb-6">Leave Requests Trend</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={leaveData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="month" tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} />
            <YAxis tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend iconType="circle" />
            <Line type="monotone" dataKey="approved" stroke="#0891b2" strokeWidth={3} dot={{r: 4, fill: '#0891b2', strokeWidth: 2, stroke: '#fff'}} />
            <Line type="monotone" dataKey="pending" stroke="#f59e0b" strokeWidth={3} dot={{r: 4, fill: '#f59e0b', strokeWidth: 2, stroke: '#fff'}} />
            <Line type="monotone" dataKey="rejected" stroke="#ef4444" strokeWidth={3} dot={{r: 4, fill: '#ef4444', strokeWidth: 2, stroke: '#fff'}} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Training Progress */}
      <div className="glass-card bg-white/60 border border-white/60 rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-bold text-gray-800 mb-6">Training Progress</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={trainingData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={5}
              dataKey="value"
            >
              {trainingData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} strokeWidth={0} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="bottom" height={36}/>
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Budget Allocation */}
      <div className="glass-card bg-white/60 border border-white/60 rounded-2xl p-6 shadow-sm flex flex-col">
        <h3 className="text-lg font-bold text-gray-800 mb-6">Budget by Department</h3>
        <div className="space-y-5 flex-1 overflow-auto pr-2 custom-scrollbar">
          {departmentData.map((dept) => (
            <div key={dept.name}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold text-gray-700">{dept.name}</span>
                <span className="text-sm font-bold text-gray-900">${(dept.budget / 1000).toFixed(0)}K</span>
              </div>
              <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full"
                  style={{ width: `${(dept.budget / 450000) * 100}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
