"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { 
  Building2, 
  Mail, 
  Calendar, 
  Clock, 
  Globe, 
  Save,
  Briefcase,
  ArrowLeft
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { OrganizationSetting } from "@/lib/types/admin"

// Mock Data matching the CMDT spec
const defaultSettings: OrganizationSetting = {
  Company_Name__c: "Acme Corp",
  Company_Email__c: "hr@acme.com",
  Financial_Year_Start_Month__c: 4,
  Working_Days__c: "Monday,Tuesday,Wednesday,Thursday,Friday",
  Work_Start_Time__c: "09:00",
  Work_End_Time__c: "18:00",
  Timezone__c: "Asia/Kolkata",
  Max_Leave_Carryover_Days__c: 12,
  Probation_Period_Months__c: 6
}

export default function OrganizationSettingsPage() {
  const [settings, setSettings] = useState<OrganizationSetting>(defaultSettings)
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    setLoading(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500))
    setLoading(false)
    setIsEditing(false)
    toast.success("Organization settings updated successfully")
  }

  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
  const selectedDays = settings.Working_Days__c.split(",")

  const toggleDay = (day: string) => {
    if (!isEditing) return
    const current = new Set(selectedDays)
    if (current.has(day)) {
        current.delete(day)
    } else {
        current.add(day)
    }
    const newDays = Array.from(current).sort((a, b) => daysOfWeek.indexOf(a) - daysOfWeek.indexOf(b)).join(",")
    setSettings({ ...settings, Working_Days__c: newDays })
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <Link href="/dashboard/admin" className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors w-fit">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back to Admin</span>
      </Link>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Organization Settings</h1>
          <p className="text-slate-500 mt-2">Configure your company's core details and operational preferences.</p>
        </div>
        <button 
            onClick={() => isEditing ? handleSave() : setIsEditing(true)}
            disabled={loading}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-all ${
                isEditing 
                ? "bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-200"
                : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
            }`}
        >
            {loading ? (
                <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
                <>
                    <Save className="w-4 h-4" />
                    {isEditing ? "Save Changes" : "Edit Settings"}
                </>
            )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - General Info */}
        <div className="space-y-6 lg:col-span-2">
           {/* Company Identity Card */}
           <motion.div 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm"
           >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-50 rounded-lg">
                    <Building2 className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">Company Identity</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Company Name</label>
                    <input 
                        type="text" 
                        value={settings.Company_Name__c}
                        onChange={(e) => setSettings({...settings, Company_Name__c: e.target.value})}
                        disabled={!isEditing}
                        className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-500 transition-all"
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Official Email (HR)</label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                        <input 
                            type="email" 
                            value={settings.Company_Email__c}
                            onChange={(e) => setSettings({...settings, Company_Email__c: e.target.value})}
                            disabled={!isEditing}
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-500 transition-all"
                        />
                    </div>
                 </div>
              </div>
           </motion.div>

           {/* Work Schedule Card */}
           <motion.div 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.1 }}
             className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm"
           >
              <div className="flex items-center gap-3 mb-6">
                 <div className="p-2 bg-orange-50 rounded-lg">
                    <Clock className="w-5 h-5 text-orange-600" />
                 </div>
                 <h3 className="text-lg font-semibold text-slate-900">Work Schedule</h3>
              </div>

              <div className="space-y-6">
                  {/* Working Days */}
                  <div className="space-y-3">
                      <label className="text-sm font-medium text-slate-700">Working Days</label>
                      <div className="flex flex-wrap gap-2" onClick={(e) => toggleDay((e.target as any).id)}>
                          {daysOfWeek.map(day => (
                              <button
                                key={day}
                                id={day}
                                disabled={!isEditing}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                    selectedDays.includes(day)
                                        ? "bg-slate-900 text-white shadow-md shadow-slate-200"
                                        : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                                } ${!isEditing && !selectedDays.includes(day) ? 'opacity-50' : ''}`}
                              >
                                  {day.slice(0,3)}
                              </button>
                          ))}
                      </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-700">Start Time</label>
                          <input 
                              type="time" 
                              value={settings.Work_Start_Time__c}
                              onChange={(e) => setSettings({...settings, Work_Start_Time__c: e.target.value})}
                              disabled={!isEditing}
                              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-500"
                          />
                       </div>
                       <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-700">End Time</label>
                          <input 
                              type="time" 
                              value={settings.Work_End_Time__c}
                              onChange={(e) => setSettings({...settings, Work_End_Time__c: e.target.value})}
                              disabled={!isEditing}
                              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-500"
                          />
                       </div>
                  </div>
              </div>
           </motion.div>
        </div>

        {/* Right Column - Regional & Policy */}
        <div className="space-y-6">
            <motion.div 
             initial={{ opacity: 0, x: 20 }}
             animate={{ opacity: 1, x: 0 }}
             transition={{ delay: 0.2 }}
             className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm"
           >
              <div className="flex items-center gap-3 mb-6">
                 <div className="p-2 bg-purple-50 rounded-lg">
                    <Globe className="w-5 h-5 text-purple-600" />
                 </div>
                 <h3 className="text-lg font-semibold text-slate-900">Regional</h3>
              </div>
              
              <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Timezone</label>
                    <select 
                        value={settings.Timezone__c}
                        onChange={(e) => setSettings({...settings, Timezone__c: e.target.value})}
                        disabled={!isEditing}
                        className="w-full px-4 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-500"
                    >
                        <option>Asia/Kolkata</option>
                        <option>America/New_York</option>
                        <option>Europe/London</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Fiscal Year Start Month</label>
                    <select 
                        value={settings.Financial_Year_Start_Month__c}
                        onChange={(e) => setSettings({...settings, Financial_Year_Start_Month__c: parseInt(e.target.value)})}
                        disabled={!isEditing}
                        className="w-full px-4 py-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-500"
                    >
                        {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                            <option key={m} value={m}>{new Date(0, m-1).toLocaleString('default', { month: 'long' })}</option>
                        ))}
                    </select>
                  </div>
              </div>
            </motion.div>

            <motion.div 
             initial={{ opacity: 0, x: 20 }}
             animate={{ opacity: 1, x: 0 }}
             transition={{ delay: 0.3 }}
             className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm"
           >
              <div className="flex items-center gap-3 mb-6">
                 <div className="p-2 bg-green-50 rounded-lg">
                    <Calendar className="w-5 h-5 text-green-600" />
                 </div>
                 <h3 className="text-lg font-semibold text-slate-900">Policies</h3>
              </div>
              
              <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Probation Period (Months)</label>
                    <div className="relative">
                        <Briefcase className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                        <input 
                            type="number" 
                            value={settings.Probation_Period_Months__c}
                            onChange={(e) => setSettings({...settings, Probation_Period_Months__c: parseInt(e.target.value)})}
                            disabled={!isEditing}
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-500"
                        />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Max Leave Carryover (Days)</label>
                    <input 
                        type="number" 
                        value={settings.Max_Leave_Carryover_Days__c}
                        onChange={(e) => setSettings({...settings, Max_Leave_Carryover_Days__c: parseInt(e.target.value)})}
                        disabled={!isEditing}
                        className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-500"
                    />
                  </div>
              </div>
            </motion.div>
        </div>
      </div>
    </div>
  )
}
