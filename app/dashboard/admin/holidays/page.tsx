"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { 
  Calendar, 
  MapPin, 
  MoreHorizontal, 
  Plus, 
  Search, 
  Filter,
  CalendarDays,
  ArrowLeft
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { Holiday } from "@/lib/types/admin"

// Mock Data
const mockHolidays: Holiday[] = [
  {
    Id: "1",
    Holiday_Name__c: "Republic Day",
    Holiday_Date__c: "2024-01-26",
    Year__c: 2024,
    Holiday_Type__c: "National Holiday",
    Applicable_Locations__c: ["All"],
    Active__c: true
  },
  {
     Id: "2",
     Holiday_Name__c: "Holi",
     Holiday_Date__c: "2024-03-25",
     Year__c: 2024,
     Holiday_Type__c: "National Holiday",
     Applicable_Locations__c: ["All"],
     Active__c: true
  },
  {
     Id: "3",
     Holiday_Name__c: "Maharashtra Day",
     Holiday_Date__c: "2024-05-01",
     Year__c: 2024,
     Holiday_Type__c: "Regional Holiday",
     Applicable_Locations__c: ["Mumbai", "Pune"],
     Active__c: true
  },
  {
     Id: "4",
     Holiday_Name__c: "Independence Day",
     Holiday_Date__c: "2024-08-15",
     Year__c: 2024,
     Holiday_Type__c: "National Holiday",
     Applicable_Locations__c: ["All"],
     Active__c: true
  },
  {
     Id: "5",
     Holiday_Name__c: "Diwali",
     Holiday_Date__c: "2024-11-01",
     Year__c: 2024,
     Holiday_Type__c: "National Holiday",
     Applicable_Locations__c: ["All"],
     Active__c: true
  }
]

export default function HolidaysPage() {
  const [year, setYear] = useState(2024)
  const [holidays, setHolidays] = useState(mockHolidays)
  
  const filteredHolidays = holidays.filter(h => h.Year__c === year)

  const getTypeColor = (type: string) => {
      switch(type) {
          case 'National Holiday': return 'bg-purple-100 text-purple-700 border-purple-200';
          case 'Regional Holiday': return 'bg-orange-100 text-orange-700 border-orange-200';
          case 'Optional Holiday': return 'bg-blue-100 text-blue-700 border-blue-200';
          default: return 'bg-slate-100 text-slate-700 border-slate-200';
      }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <Link href="/dashboard/admin" className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors w-fit">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back to Admin</span>
      </Link>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Holiday Calendar</h1>
          <p className="text-slate-500 mt-2">Manage annual holidays and regional leaves.</p>
        </div>
        <button 
           onClick={() => toast.info("Create Holiday modal would open here")}
           className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200"
        >
             <Plus className="w-4 h-4" />
             <span>Add Holiday</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 bg-white p-2 rounded-xl border border-slate-100 shadow-sm w-fit">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg text-slate-600 font-medium">
              <CalendarDays className="w-4 h-4" />
              <select 
                value={year} 
                onChange={(e) => setYear(parseInt(e.target.value))}
                className="bg-transparent border-none focus:outline-none cursor-pointer"
              >
                  <option value={2023}>2023</option>
                  <option value={2024}>2024</option>
                  <option value={2025}>2025</option>
              </select>
          </div>
          <div className="h-6 w-px bg-slate-200"></div>
          <div className="relative">
              <Search className="absolute left-3 top-2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search holidays..." 
                className="pl-9 pr-4 py-1.5 w-64 rounded-lg text-sm focus:outline-none focus:bg-slate-50 transition-colors"
              />
          </div>
      </div>

      {/* List */}
      <motion.div 
        layout
        className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm"
      >
          <div className="grid grid-cols-12 gap-4 p-4 border-b border-slate-100 bg-slate-50/50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <div className="col-span-1 text-center">Date</div>
              <div className="col-span-4">Holiday Name</div>
              <div className="col-span-3">Type</div>
              <div className="col-span-3">Location</div>
              <div className="col-span-1 text-right">Actions</div>
          </div>
          
          <div className="divide-y divide-slate-100">
             {filteredHolidays.map((holiday, index) => (
                 <motion.div 
                    key={holiday.Id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-slate-50/50 transition-colors group"
                 >
                     {/* Date Box */}
                     <div className="col-span-1 flex flex-col items-center justify-center p-2 rounded-lg bg-white border border-slate-200 shadow-sm group-hover:border-blue-200 group-hover:shadow-blue-100 transition-all">
                         <span className="text-xs font-bold text-slate-400 uppercase">
                             {new Date(holiday.Holiday_Date__c).toLocaleString('default', { month: 'short' })}
                         </span>
                         <span className="text-xl font-bold text-slate-800">
                             {new Date(holiday.Holiday_Date__c).getDate()}
                         </span>
                     </div>

                     <div className="col-span-4">
                         <p className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">{holiday.Holiday_Name__c}</p>
                         <p className="text-xs text-slate-500">{new Date(holiday.Holiday_Date__c).toLocaleString('default', { weekday: 'long' })}</p>
                     </div>

                     <div className="col-span-3">
                         <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getTypeColor(holiday.Holiday_Type__c)}`}>
                             {holiday.Holiday_Type__c}
                         </span>
                     </div>

                     <div className="col-span-3 flex items-center gap-2 text-sm text-slate-600">
                         <MapPin className="w-4 h-4 text-slate-400" />
                         <span className="truncate">{holiday.Applicable_Locations__c.join(", ")}</span>
                     </div>

                     <div className="col-span-1 flex justify-end">
                         <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                             <MoreHorizontal className="w-4 h-4" />
                         </button>
                     </div>
                 </motion.div>
             ))}
          </div>
          
          {filteredHolidays.length === 0 && (
              <div className="p-12 text-center text-slate-500">
                  <Calendar className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                  <p>No holidays found for {year}</p>
              </div>
          )}
      </motion.div>
    </div>
  )
}
