"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { CalendarRange, Plus, Edit2, Trash2, X, Calendar, ChevronDown } from "lucide-react"

interface Holiday {
  id: string
  name: string
  date: string
  day: string
  year: string
}

interface BulkHolidayRow {
  name: string
  date: string
  day: string
}

export default function HolidaysPage() {
  const router = useRouter()
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null)
  const [editFormData, setEditFormData] = useState({
    name: "",
    date: "",
    day: "",
    year: "",
  })
  const [bulkRows, setBulkRows] = useState<BulkHolidayRow[]>(
    Array(12).fill({ name: "", date: "", day: "" })
  )
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString())
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletingHolidayId, setDeletingHolidayId] = useState<string | null>(null)

  // Fetch holidays
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["holidays"],
    queryFn: () => fetch("/api/holidays").then((res) => {
      if (!res.ok) {
        if (res.status === 401) {
          router.push("/auth/login")
          throw new Error("Unauthorized")
        }
        throw new Error("Failed to fetch holidays")
      }
      return res.json()
    }),
  })

  const holidays: Holiday[] = data?.holidays || []
  const userRole = data?.userRole
  const isHR = userRole === 'HR' || userRole === 'Admin'

  // Get unique years from holidays
  const availableYears = [...new Set(holidays.map(h => String(h.year)))].sort((a, b) => parseInt(b) - parseInt(a))
  
  // Add current year if not in list
  const currentYear = new Date().getFullYear().toString()
  if (!availableYears.includes(currentYear)) {
    availableYears.unshift(currentYear)
  }

  // Filter holidays by selected year (ensure both are strings for comparison)
  const filteredHolidays = holidays.filter(h => String(h.year) === String(selectedYear)).sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  console.log("Holidays data:", { 
    totalHolidays: holidays.length, 
    availableYears, 
    selectedYear, 
    filteredCount: filteredHolidays.length,
    userRole,
    isHR,
    sampleHoliday: holidays[0]
  })

  // Auto-fill day when date is selected in bulk form
  const updateBulkRowDate = (index: number, date: string) => {
    const newRows = [...bulkRows]
    newRows[index] = { ...newRows[index], date }
    
    if (date) {
      const dateObj = new Date(date)
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      newRows[index].day = days[dateObj.getDay()]
    }
    
    setBulkRows(newRows)
  }

  // Auto-fill day when date is selected in edit form
  useEffect(() => {
    if (editFormData.date) {
      const date = new Date(editFormData.date)
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      setEditFormData(prev => ({ ...prev, day: days[date.getDay()] }))
    }
  }, [editFormData.date])

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Filter out empty rows
    const validRows = bulkRows.filter(row => row.name.trim() && row.date)

    if (validRows.length === 0) {
      alert("Please add at least one holiday")
      return
    }

    try {
      // Prepare holidays data
      const holidays = validRows.map(row => ({
        name: row.name,
        date: row.date,
        day: row.day,
        year: selectedYear,
      }))

      // Send bulk insert request
      const response = await fetch("/api/holidays", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ holidays }),
      })

      if (!response.ok) {
        const error = await response.json()
        alert(error.error || "Failed to create holidays")
        return
      }

      const result = await response.json()
      refetch()
      setShowBulkModal(false)
      setBulkRows(Array(12).fill({ name: "", date: "", day: "" }))
      alert(result.message || `Successfully created ${validRows.length} holiday(s)!`)
    } catch (error) {
      console.error("Error creating holidays:", error)
      alert("Failed to create holidays")
    }
  }

  const handleEdit = (holiday: Holiday) => {
    setEditingHoliday(holiday)
    setEditFormData({
      name: holiday.name,
      date: holiday.date,
      day: holiday.day,
      year: holiday.year,
    })
    setShowEditModal(true)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingHoliday) return

    try {
      const response = await fetch("/api/holidays", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          holidayId: editingHoliday.id,
          ...editFormData,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        alert(error.error || "Failed to update holiday")
        return
      }

      refetch()
      setShowEditModal(false)
      setEditingHoliday(null)
      alert("Holiday updated successfully!")
    } catch (error) {
      console.error("Error updating holiday:", error)
      alert("Failed to update holiday")
    }
  }

  const handleDelete = async () => {
    if (!deletingHolidayId) return

    try {
      const response = await fetch(`/api/holidays?id=${deletingHolidayId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json()
        alert(error.error || "Failed to delete holiday")
        return
      }

      refetch()
      setShowDeleteConfirm(false)
      setDeletingHolidayId(null)
      alert("Holiday deleted successfully!")
    } catch (error) {
      console.error("Error deleting holiday:", error)
      alert("Failed to delete holiday")
    }
  }

  const openDeleteConfirm = (id: string) => {
    setDeletingHolidayId(id)
    setShowDeleteConfirm(true)
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
            <CalendarRange className="w-10 h-10 text-indigo-600" />
            Holiday Calendar
          </h1>
          <p className="text-gray-600 mt-1">View and manage company holidays</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Year Filter */}
          <div className="relative">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="appearance-none bg-white border-2 border-gray-200 rounded-xl px-4 py-3 pr-10 font-semibold text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none cursor-pointer"
            >
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          </div>

          {isHR && (
            <button
              onClick={() => setShowBulkModal(true)}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center gap-2 whitespace-nowrap"
            >
              <Plus className="w-5 h-5" />
              Add Holidays
            </button>
          )}
        </div>
      </div>

      {filteredHolidays.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
          <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
            <Calendar className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Holidays for {selectedYear}</h3>
          <p className="text-gray-500">No holidays have been added for this year yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider">#</th>
                  <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider">Holiday Name</th>
                  <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider">Day</th>
                  {isHR && (
                    <th className="px-6 py-4 text-center text-sm font-bold uppercase tracking-wider">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredHolidays.map((holiday, index) => {
                  const holidayDate = new Date(holiday.date)
                  const formattedDate = holidayDate.toLocaleDateString('en-US', { 
                    month: 'long', 
                    day: 'numeric',
                    year: 'numeric'
                  })
                  
                  return (
                    <tr key={holiday.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-semibold text-gray-500">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-base font-semibold text-gray-900">{holiday.name}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-700">{formattedDate}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800">
                          {holiday.day}
                        </span>
                      </td>
                      {isHR && (
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleEdit(holiday)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openDeleteConfirm(holiday.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bulk Add Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-8 overflow-hidden transform transition-all">
            <div className="p-6 bg-gradient-to-r from-indigo-600 to-purple-600">
              <div className="flex items-center justify-between text-white">
                <h3 className="text-xl font-bold">
                  Add Holidays for {selectedYear}
                </h3>
                <button
                  onClick={() => {
                    setShowBulkModal(false)
                    setBulkRows(Array(12).fill({ name: "", date: "", day: "" }))
                  }}
                  className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <form onSubmit={handleBulkSubmit} className="p-6">
              <div className="mb-4 text-sm text-gray-600">
                Fill in the holidays below. You can add up to 12 holidays at once. Empty rows will be skipped.
              </div>
              
              <div className="overflow-x-auto max-h-[60vh] overflow-y-auto border rounded-xl">
                <table className="w-full">
                  <thead className="bg-gray-100 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">#</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Holiday Name</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Day</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {bulkRows.map((row, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-semibold text-gray-500">
                          {index + 1}
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={row.name}
                            onChange={(e) => {
                              const newRows = [...bulkRows]
                              newRows[index] = { ...newRows[index], name: e.target.value }
                              setBulkRows(newRows)
                            }}
                            placeholder="e.g., New Year's Day"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="date"
                            value={row.date}
                            onChange={(e) => updateBulkRowDate(index, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={row.day}
                            readOnly
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowBulkModal(false)
                    setBulkRows(Array(12).fill({ name: "", date: "", day: "" }))
                  }}
                  className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-semibold transition-all transform hover:scale-105"
                >
                  Save All Holidays
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingHoliday && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all">
            <div className="p-6 bg-gradient-to-r from-indigo-600 to-purple-600">
              <div className="flex items-center justify-between text-white">
                <h3 className="text-xl font-bold">Edit Holiday</h3>
                <button
                  onClick={() => {
                    setShowEditModal(false)
                    setEditingHoliday(null)
                  }}
                  className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Holiday Name *
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  placeholder="e.g., New Year's Day"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-gray-700"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Date *
                </label>
                <input
                  type="date"
                  required
                  value={editFormData.date}
                  onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-gray-700"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Day
                </label>
                <input
                  type="text"
                  value={editFormData.day}
                  readOnly
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-700"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Year *
                </label>
                <input
                  type="number"
                  required
                  value={editFormData.year}
                  onChange={(e) => setEditFormData({ ...editFormData, year: e.target.value })}
                  min="2020"
                  max="2100"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-gray-700"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false)
                    setEditingHoliday(null)
                  }}
                  className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-semibold transition-all transform hover:scale-105"
                >
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all">
            <div className="p-6 bg-gradient-to-r from-red-500 to-rose-500">
              <div className="flex items-center gap-3 text-white">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                  <Trash2 className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold">Delete Holiday</h3>
              </div>
            </div>
            <div className="p-6">
              <p className="text-gray-700 text-base mb-6">
                Are you sure you want to delete this holiday? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false)
                    setDeletingHolidayId(null)
                  }}
                  className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white rounded-xl font-semibold transition-all transform hover:scale-105"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
