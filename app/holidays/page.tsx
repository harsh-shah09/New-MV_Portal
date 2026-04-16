"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { Button, Select, Spin } from "antd"
import { CalendarRange, Plus, Edit2, Trash2, X, Calendar, ChevronDown } from "lucide-react"
import { createPortal } from "react-dom"
import { PageContainer } from "@/components/page-container"
import { PageHeader } from "@/components/page-header"
import { toast } from "sonner"

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

interface BulkHolidayRowError {
  name?: string
  date?: string
  row?: string
}

export default function HolidaysPage() {
  const router = useRouter()
  const [isMounted, setIsMounted] = useState(false)
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null)
  const [editFormData, setEditFormData] = useState({
    name: "",
    date: "",
    day: "",
    year: "",
  })
  const [bulkRows, setBulkRows] = useState<BulkHolidayRow[]>([
    { name: "", date: "", day: "" }
  ])
  const [bulkRowErrors, setBulkRowErrors] = useState<BulkHolidayRowError[]>([])
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

  // console.log("Holidays data:", { 
  //   totalHolidays: holidays.length, 
  //   availableYears, 
  //   selectedYear, 
  //   filteredCount: filteredHolidays.length,
  //   userRole,
  //   isHR,
  //   sampleHoliday: holidays[0]
  // })

  // Auto-fill day when date is selected in bulk form
  const updateBulkRowDate = (index: number, date: string) => {
    const newRows = [...bulkRows]
    newRows[index] = { ...newRows[index], date }
    
    if (date) {
      const dateObj = new Date(date)
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      newRows[index].day = days[dateObj.getDay()]
    }

    if (bulkRowErrors[index]?.date || bulkRowErrors[index]?.row) {
      const newErrors = [...bulkRowErrors]
      newErrors[index] = {
        ...newErrors[index],
        date: undefined,
        row: undefined,
      }
      setBulkRowErrors(newErrors)
    }
    
    setBulkRows(newRows)
  }

  // Add a new row
  const addNewRow = () => {
    setBulkRows([...bulkRows, { name: "", date: "", day: "" }])
    setBulkRowErrors([...bulkRowErrors, {}])
  }

  // Remove a row
  const removeRow = (index: number) => {
    if (bulkRows.length > 1) {
      const newRows = bulkRows.filter((_, i) => i !== index)
      const newErrors = bulkRowErrors.filter((_, i) => i !== index)
      setBulkRows(newRows)
      setBulkRowErrors(newErrors)
    }
  }

  // Auto-fill day when date is selected in edit form
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Auto-fill day when date is selected in edit form
  useEffect(() => {
    if (editFormData.date) {
      const date = new Date(editFormData.date)
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      setEditFormData(prev => ({
        ...prev,
        day: days[date.getDay()],
        year: date.getFullYear().toString(),
      }))
    }
  }, [editFormData.date])

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const rowErrors: BulkHolidayRowError[] = bulkRows.map(() => ({}))
    let hasAnyFilledRow = false
    let hasAnyEmptyRow = false
    let hasAnyPartialRow = false

    bulkRows.forEach((row, index) => {
      const hasName = row.name.trim().length > 0
      const hasDate = Boolean(row.date)

      if (!hasName && !hasDate) {
        hasAnyEmptyRow = true
        return
      }

      hasAnyFilledRow = true

      if (!hasName) {
        rowErrors[index].name = "Holiday name is required when date is selected"
        hasAnyPartialRow = true
      }

      if (!hasDate) {
        rowErrors[index].date = "Date is required when holiday name is entered"
        hasAnyPartialRow = true
      }
    })

    if (!hasAnyFilledRow) {
      setBulkRowErrors(rowErrors)
      toast.error("Please add at least one holiday")
      return
    }

    if (hasAnyPartialRow) {
      setBulkRowErrors(rowErrors)
      toast.error("Please complete all required fields in highlighted rows")
      return
    }

    if (hasAnyEmptyRow) {
      const updatedErrors = rowErrors.map((error, index) => {
        const row = bulkRows[index]
        if (!row.name.trim() && !row.date) {
          return { ...error, row: "Fill this row or delete it" }
        }
        return error
      })
      setBulkRowErrors(updatedErrors)
      toast.error("Please fill all rows or delete extra rows")
      return
    }

    setBulkRowErrors([])

    try {
      // Prepare holidays data
      const holidays = bulkRows.map(row => ({
        name: row.name,
        date: row.date,
        day: row.day,
        year: new Date(row.date).getFullYear().toString(),
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
        toast.error(error.error || "Failed to create holidays")
        return
      }

      const result = await response.json()
      refetch()
      setShowBulkModal(false)
      setBulkRows([{ name: "", date: "", day: "" }])
      setBulkRowErrors([])
      toast.success(result.message || `Successfully created ${bulkRows.length} holiday(s)!`)
    } catch (error) {
      console.error("Error creating holidays:", error)
      toast.error("Failed to create holidays")
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
          year: editFormData.date ? new Date(editFormData.date).getFullYear().toString() : editFormData.year,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        toast.error(error.error || "Failed to update holiday")
        return
      }

      refetch()
      setShowEditModal(false)
      setEditingHoliday(null)
      toast.success("Holiday updated successfully!")
    } catch (error) {
      console.error("Error updating holiday:", error)
      toast.error("Failed to update holiday")
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
        toast.error(error.error || "Failed to delete holiday")
        return
      }

      refetch()
      setShowDeleteConfirm(false)
      setDeletingHolidayId(null)
      toast.success("Holiday deleted successfully!")
    } catch (error) {
      console.error("Error deleting holiday:", error)
      toast.error("Failed to delete holiday")
    }
  }

  const openDeleteConfirm = (id: string) => {
    setDeletingHolidayId(id)
    setShowDeleteConfirm(true)
  }

  if (isLoading) {
    return (
      <PageContainer>
        <div className="flex justify-center items-center py-12">
          <Spin size="large" />
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <div className="bg-white p-3 rounded-xl">
      <PageHeader
        title="Holiday Calendar"
        subtitle="View and manage company holidays"
      >
        <div className="flex items-center gap-3">
          {/* Year Filter */}
          <div className="relative">
            <Select
              value={selectedYear}
              size="large"
              onChange={(e) => setSelectedYear(e)}
                suffixIcon={<ChevronDown className="w-4 h-4 text-muted-foreground pointer-events-none" />}
            >
              {availableYears.map(year => (
                <Select.Option key={year} value={year}>{year}</Select.Option>
              ))}
            </Select>
          </div>

          {isHR && (
            <Button
            type="primary"
            size="large"
            icon={<Plus size={16}/>}
              onClick={() => setShowBulkModal(true)}
            >
              Add Holidays
            </Button>
          )}
        </div>
      </PageHeader>

      {filteredHolidays.length === 0 ? (
          <div className="text-center py-10 sm:py-16 bg-card rounded-xl shadow-sm border border-border px-4">
            <div className="w-16 h-16 sm:w-24 sm:h-24 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
              <Calendar className="w-8 h-8 sm:w-12 sm:h-12 text-muted-foreground" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-foreground mb-2">
              No Holidays for {selectedYear}
            </h3>
            <p className="text-sm sm:text-base text-muted-foreground">
              No holidays have been added for this year yet.
            </p>
          </div>
        ) : (
          <>
            {/* 📱 Mobile View (Card Layout) */}
            <div className="block md:hidden space-y-4">
              {filteredHolidays.map((holiday, index) => {
                const holidayDate = new Date(holiday.date)
                const formattedDate = holidayDate.toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                })

                return (
                  <div
                    key={holiday.id}
                    className="bg-card border border-border rounded-xl p-4 shadow-sm"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-foreground">
                        {holiday.name}
                      </h4>
                      <span className="text-xs text-muted-foreground">
                        #{index + 1}
                      </span>
                    </div>

                    <div className="text-sm text-muted-foreground space-y-1">
                      <p><span className="font-medium text-foreground">Date:</span> {formattedDate}</p>
                      <p>
                        <span className="font-medium text-foreground">Day:</span>{" "}
                        <span className="inline-block px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-xs">
                          {holiday.day}
                        </span>
                      </p>
                    </div>

                    {isHR && (
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => handleEdit(holiday)}
                          className="flex-1 flex items-center justify-center gap-1 p-2 text-blue-600 bg-blue-50 rounded-lg"
                        >
                          <Edit2 className="w-4 h-4" /> Edit
                        </button>
                        <button
                          onClick={() => openDeleteConfirm(holiday.id)}
                          className="flex-1 flex items-center justify-center gap-1 p-2 text-red-600 bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* 💻 Desktop Table */}
            <div className="hidden md:block bg-card rounded-xl shadow-sm border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead className="bg-muted text-muted-foreground">
                    <tr>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs lg:text-sm font-bold uppercase">#</th>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs lg:text-sm font-bold uppercase">Holiday Name</th>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs lg:text-sm font-bold uppercase">Date</th>
                      <th className="px-4 lg:px-6 py-3 text-left text-xs lg:text-sm font-bold uppercase">Day</th>
                      {isHR && (
                        <th className="px-4 lg:px-6 py-3 text-center text-xs lg:text-sm font-bold uppercase">Actions</th>
                      )}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-border">
                    {filteredHolidays.map((holiday, index) => {
                      const holidayDate = new Date(holiday.date)
                      const formattedDate = holidayDate.toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                      })

                      return (
                        <tr key={holiday.id} className="hover:bg-muted/50 transition-colors">
                          <td className="px-4 lg:px-6 py-3 text-xs lg:text-sm text-muted-foreground">
                            {index + 1}
                          </td>

                          <td className="px-4 lg:px-6 py-3">
                            <span className="text-sm lg:text-base font-semibold text-foreground">
                              {holiday.name}
                            </span>
                          </td>

                          <td className="px-4 lg:px-6 py-3 text-sm">
                            {formattedDate}
                          </td>

                          <td className="px-4 lg:px-6 py-3">
                            <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800">
                              {holiday.day}
                            </span>
                          </td>

                          {isHR && (
                            <td className="px-4 lg:px-6 py-3">
                              <div className="flex justify-center gap-2">
                                <button
                                  onClick={() => handleEdit(holiday)}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => openDeleteConfirm(holiday.id)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
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
          </>
        )}

      {/* Bulk Add Modal */}
      {showBulkModal && isMounted && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden transform transition-all">
            <div className="p-6 bg-gradient-to-r from-blue-600 to-blue-700 flex-shrink-0">
              <div className="flex items-center justify-between text-white">
                <h3 className="text-xl font-bold">
                  Add Holidays
                </h3>
                <button
                  onClick={() => {
                    setShowBulkModal(false)
                    setBulkRows([{ name: "", date: "", day: "" }])
                    setBulkRowErrors([])
                  }}
                  className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <form onSubmit={handleBulkSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="p-6 overflow-y-auto flex-1">
                <div className="mb-4 text-sm text-gray-600">
                  Fill in the holidays below. Click the + button to add more holidays.
                </div>
                
                <div className="space-y-4">
                  {bulkRows.map((row, index) => (
                    <div key={index} className={`bg-gray-50 p-4 rounded-xl border-2 transition-colors ${bulkRowErrors[index]?.name || bulkRowErrors[index]?.date || bulkRowErrors[index]?.row ? "border-red-300" : "border-gray-200 hover:border-blue-300"}`}>
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-sm">
                          {index + 1}
                        </div>
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                              Holiday Name *
                            </label>
                            <input
                              type="text"
                              value={row.name}
                              onChange={(e) => {
                                const newRows = [...bulkRows]
                                newRows[index] = { ...newRows[index], name: e.target.value }
                                setBulkRows(newRows)

                                if (bulkRowErrors[index]?.name || bulkRowErrors[index]?.row) {
                                  const newErrors = [...bulkRowErrors]
                                  newErrors[index] = {
                                    ...newErrors[index],
                                    name: undefined,
                                    row: undefined,
                                  }
                                  setBulkRowErrors(newErrors)
                                }
                              }}
                              placeholder="e.g., New Year's Day"
                              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm ${bulkRowErrors[index]?.name ? "border-red-400" : "border-gray-300"}`}
                            />
                            {bulkRowErrors[index]?.name && (
                              <p className="mt-1 text-xs text-red-600">{bulkRowErrors[index].name}</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                              Date *
                            </label>
                            <input
                              type="date"
                              value={row.date}
                              onChange={(e) => updateBulkRowDate(index, e.target.value)}
                              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm ${bulkRowErrors[index]?.date ? "border-red-400" : "border-gray-300"}`}
                            />
                            {bulkRowErrors[index]?.date && (
                              <p className="mt-1 text-xs text-red-600">{bulkRowErrors[index].date}</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                              Day
                            </label>
                            <input
                              type="text"
                              value={row.day}
                              readOnly
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm"
                              placeholder="Auto-filled"
                            />
                          </div>
                        </div>
                        {bulkRows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeRow(index)}
                            className="flex-shrink-0 self-center p-2 mt-4 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Remove"
                          >
                            <Trash2 className="w-6 h-5" />
                          </button>
                        )}
                      </div>
                      {bulkRowErrors[index]?.row && (
                        <p className="mt-2 text-xs text-red-600">{bulkRowErrors[index].row}</p>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addNewRow}
                  className="mt-4 w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all flex items-center justify-center gap-2 font-medium"
                >
                  <Plus className="w-5 h-5" />
                  Add Another Holiday
                </button>
              </div>

              <div className="p-6 bg-gray-50 border-t border-gray-200 flex gap-3 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setShowBulkModal(false)
                    setBulkRows([{ name: "", date: "", day: "" }])
                    setBulkRowErrors([])
                  }}
                  className="flex-1 px-4 py-3 bg-white hover:bg-gray-100 text-gray-700 rounded-xl font-semibold transition-colors border-2 border-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-semibold transition-all transform hover:scale-105"
                >
                  Save All Holidays
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Edit Modal */}
      {showEditModal && editingHoliday && isMounted && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden transform transition-all ">
            <div className="p-6 bg-gradient-to-r from-blue-600 to-blue-700 flex-shrink-0">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Edit Holiday</h3>
                <button
                  onClick={() => {
                    setShowEditModal(false)
                    setEditingHoliday(null)
                  }}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <form onSubmit={handleEditSubmit} className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-4">
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
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900 transition-colors"
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
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900 transition-colors"
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
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-600"
                  />
                </div>

              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false)
                    setEditingHoliday(null)
                  }}
                  className="flex-1 px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-700 rounded-lg font-medium transition-colors border border-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  Update Holiday
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && isMounted && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all border border-gray-100">
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
                  <Trash2 className="w-6 h-6 text-red-500" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Holiday</h3>
                  <p className="text-sm text-gray-600">
                    Are you sure you want to delete this holiday? This action cannot be undone.
                  </p>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setDeletingHolidayId(null)
                }}
                className="flex-1 px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-700 rounded-lg font-medium transition-colors border border-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      </div>
    </PageContainer>
  )
}
