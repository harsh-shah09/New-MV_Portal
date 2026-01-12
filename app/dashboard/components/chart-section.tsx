"use client"

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

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

interface ChartSectionProps {
  stats?: any[];
}

export function ChartSection({ stats }: ChartSectionProps) {
  // Extract data from stats
  const departmentStats = stats?.find(s => s.title === 'Department Summary')?.items || [];
  const leaveStats = stats?.find(s => s.title === 'Leave Trends')?.items || [];

  const departmentData = departmentStats.map((item: any) => ({
      name: item.label,
      employees: item.value,
      budget: item.budget || 0
  }));

  // Sort department data by employee count for better visualization
  departmentData.sort((a:any, b:any) => b.employees - a.employees);

  const leaveData = leaveStats;

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

      {/* Budget Allocation */}
      {/* <div className="glass-card bg-white/60 border border-white/60 rounded-2xl p-6 shadow-sm flex flex-col">
        <h3 className="text-lg font-bold text-gray-800 mb-6">Budget by Department</h3>
        <div className="space-y-5 flex-1 overflow-auto pr-2 custom-scrollbar">
          {departmentData.length > 0 ? (
            departmentData.map((dept: any) => {
             // Calculate max budget for progress bar relative sizing
             const maxBudget = Math.max(...departmentData.map((d: any) => d.budget));
             return (
            <div key={dept.name}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold text-gray-700">{dept.name}</span>
                <span className="text-sm font-bold text-gray-900">₹{(dept.budget / 1000).toFixed(0)}K</span>
              </div>
              <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full"
                  style={{ width: `${(dept.budget / maxBudget) * 100}%` }}
                ></div>
              </div>
            </div>
          )})
          ) : (
              <p className="text-gray-500 text-sm">No budget data available.</p>
          )}
        </div>
      </div> */}

      {/* Leave Requests Trend */}
      {/* Making it full width as we removed the 4th card (Training) to keep balance if user wants, 
          but usually 2x2 grid is better. Since we have 3 cards now, maybe make this one wide or keep grid?
          User asked to remove Training Progress. Current grid is 2 columns.
          If we have 3 items: Emp by Dept, Budget, Leave Trend.
          Row 1: Emp, Budget
          Row 2: Leave Trend (Full width?) 
          Let's make Leave Trend full width or keep 2 col and have empty space. 
          Given "Make response and proper awesome UI", let's make the 3rd chart span full width or centered.
      */}
      {/* <div className="glass-card bg-white/60 border border-white/60 rounded-2xl p-6 shadow-sm lg:col-span-2">
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
      </div> */}

    </div>
  )
}
