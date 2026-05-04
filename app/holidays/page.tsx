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

const MAX_HOLIDAYS_PER_BATCH = 12

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
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false)
  const [isEditSubmitting, setIsEditSubmitting] = useState(false)
  const [editDateError, setEditDateError] = useState("")

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

  const getYearPart = (dateValue: string) => {
    return (dateValue || "").split("-")[0] || ""
  }

  const validateDateYear = (dateValue: string) => {
    if (!dateValue) return ""
    
    const yearPart = getYearPart(dateValue)
    if (yearPart.length > 4) {
      return "Year must be 4 digits"
    }
    
    // Validate complete date format YYYY-MM-DD
    if (dateValue.length === 10) {
      try {
        const date = new Date(dateValue)
        if (isNaN(date.getTime())) {
          return "Invalid date format"
        }
        const year = date.getFullYear().toString()
        if (year.length !== 4) {
          return "Year must be 4 digits"
        }
      } catch {
        return "Invalid date"
      }
    }
    
    return ""
  }

  const sanitizeHolidayName = (value: string) => {
    return value.replace(/[^a-zA-Z\-(),\s]/g, "")
  }

  const validateHolidayName = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) {
      return "Holiday name is required"
    }
    const lettersCount = (trimmed.match(/[a-zA-Z]/g) || []).length
    if (lettersCount < 3) {
      return "Holiday name must have at least 3 letters"
    }
    if (/[^a-zA-Z\-(),\s]/.test(trimmed)) {
      return "Only letters, space, -, (, ) are allowed"
    }
    return ""
  }

  // Auto-fill day when date is selected in bulk form
  const updateBulkRowDate = (index: number, date: string) => {
    const yearError = validateDateYear(date)
    const newRows = [...bulkRows]
    newRows[index] = { ...newRows[index], date, day: yearError ? "" : newRows[index].day }
    
    if (date && !yearError) {
      const dateObj = new Date(date)
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      newRows[index].day = days[dateObj.getDay()]
    }

    if (bulkRowErrors[index]?.date || bulkRowErrors[index]?.row) {
      const newErrors = [...bulkRowErrors]
      newErrors[index] = {
        ...newErrors[index],
        date: yearError || undefined,
        row: undefined,
      }
      setBulkRowErrors(newErrors)
    } else if (yearError) {
      const newErrors = [...bulkRowErrors]
      newErrors[index] = {
        ...newErrors[index],
        date: yearError,
      }
      setBulkRowErrors(newErrors)
    }
    
    setBulkRows(newRows)
  }

  // Add a new row
  const addNewRow = () => {
    if (bulkRows.length >= MAX_HOLIDAYS_PER_BATCH) {
      toast.error(`You can add up to ${MAX_HOLIDAYS_PER_BATCH} holidays at a time`)
      return
    }

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
      const yearPart = getYearPart(editFormData.date)
      if (yearPart.length !== 4) {
        return
      }
      const date = new Date(editFormData.date)
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      setEditFormData(prev => ({
        ...prev,
        day: days[date.getDay()],
        year: date.getFullYear().toString(),
      }))
    }
  }, [editFormData.date])

  // Disable background scrolling when modals are open
  useEffect(() => {
    if (showBulkModal || showEditModal || showDeleteConfirm) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [showBulkModal, showEditModal, showDeleteConfirm])

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const rowErrors: BulkHolidayRowError[] = bulkRows.map(() => ({}))
    let hasAnyFilledRow = false
    let hasAnyEmptyRow = false
    let hasAnyPartialRow = false

    bulkRows.forEach((row, index) => {
      const nameError = row.name ? validateHolidayName(row.name) : ""
      const hasName = row.name.trim().length > 0
      const hasDate = Boolean(row.date)
      const yearError = row.date ? validateDateYear(row.date) : ""

      if (!hasName && !hasDate) {
        hasAnyEmptyRow = true
        return
      }

      hasAnyFilledRow = true

      if (nameError) {
        rowErrors[index].name = nameError
        hasAnyPartialRow = true
      }

      if (yearError) {
        rowErrors[index].date = yearError
        hasAnyPartialRow = true
      }

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

    if (bulkRows.length > MAX_HOLIDAYS_PER_BATCH) {
      setBulkRowErrors(rowErrors)
      toast.error(`You can add up to ${MAX_HOLIDAYS_PER_BATCH} holidays at a time`)
      return
    }

    const existingHolidayDates = new Set(holidays.map((holiday) => holiday.date))
    const existingHolidayNames = new Map<string, string>()
    holidays.forEach((holiday) => {
      existingHolidayNames.set((holiday.name || '').toLowerCase().trim(), holiday.year)
    })

    const seenDates = new Map<string, number>()
    const seenNames = new Map<string, number>()
    let hasDuplicateDates = false
    let hasDuplicateNames = false

    bulkRows.forEach((row, index) => {
      if (!row.date) {
        return
      }

      const rowDate = row.date
      const rowYear = new Date(rowDate).getFullYear().toString()
      const normalizedName = (row.name || '').toLowerCase().trim()

      if (existingHolidayDates.has(rowDate)) {
        rowErrors[index].date = "A holiday already exists on this date"
        hasDuplicateDates = true
      } else {
        const existingIndex = seenDates.get(rowDate)
        if (existingIndex !== undefined) {
          rowErrors[index].date = "Duplicate holiday date in this list"
          rowErrors[existingIndex].date = rowErrors[existingIndex].date || "Duplicate holiday date in this list"
          hasDuplicateDates = true
        } else {
          seenDates.set(rowDate, index)
        }
      }

      if (row.name) {
        const existingYear = existingHolidayNames.get(normalizedName)
        if (existingYear && existingYear === rowYear) {
          rowErrors[index].name = `"${row.name}" already exists for ${rowYear}`
          hasDuplicateNames = true
        } else {
          const existingNameIndex = seenNames.get(normalizedName)
          if (existingNameIndex !== undefined && new Date(bulkRows[existingNameIndex].date).getFullYear().toString() === rowYear) {
            rowErrors[index].name = `Duplicate holiday name for ${rowYear}`
            rowErrors[existingNameIndex].name = rowErrors[existingNameIndex].name || `Duplicate holiday name for ${rowYear}`
            hasDuplicateNames = true
          } else {
            seenNames.set(normalizedName, index)
          }
        }
      }
    })

    if (hasDuplicateDates || hasDuplicateNames) {
      setBulkRowErrors(rowErrors)
      const errors = []
      if (hasDuplicateDates) errors.push("duplicate holiday dates")
      if (hasDuplicateNames) errors.push("duplicate holiday names for the same year")
      toast.error(`Please remove ${errors.join(" and ")}`)
      return
    }

    setBulkRowErrors([])

    // Only set submitting state when we're about to perform the network request
    setIsBulkSubmitting(true)

    try {
      const payload = bulkRows.map(row => ({
        name: row.name,
        date: row.date,
        day: row.day,
        year: new Date(row.date).getFullYear().toString(),
      }))

      const response = await fetch("/api/holidays", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ holidays: payload }),
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
    } finally {
      setIsBulkSubmitting(false)
    }
  }

  

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingHoliday) return
    if (isEditSubmitting) return
    const editNameError = validateHolidayName(editFormData.name)
    if (editNameError) {
      toast.error(editNameError)
      return
    }
    if (editDateError) {
      toast.error(editDateError)
      return
    }
    setIsEditSubmitting(true)
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

      const refreshed = await refetch()
      const latestHolidays: Holiday[] = refreshed.data?.holidays || []
      const previousYear = String(editingHoliday.year)
      const updatedYear = String(editFormData.date ? new Date(editFormData.date).getFullYear().toString() : editFormData.year)
      if (previousYear !== updatedYear) {
        const previousYearHasRemaining = latestHolidays.some(
          (holiday) => String(holiday.year) === previousYear
        )
        if (!previousYearHasRemaining) {
          setSelectedYear(updatedYear)
        }
      }
      setShowEditModal(false)
      setEditingHoliday(null)
      toast.success("Holiday updated successfully!")
    } catch (error) {
      console.error("Error updating holiday:", error)
      toast.error("Failed to update holiday")
    } finally {
      setIsEditSubmitting(false)
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

      const refreshed = await refetch()
      const latestHolidays: Holiday[] = refreshed.data?.holidays || []
      const selectedYearHasRemaining = latestHolidays.some(
        (holiday) => String(holiday.year) === String(selectedYear)
      )

      if (!selectedYearHasRemaining) {
        const currentYear = new Date().getFullYear().toString()
        setSelectedYear(currentYear)
      }

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
                                let newValue = sanitizeHolidayName(e.target.value).slice(0, 30)
                                const newRows = [...bulkRows]
                                newRows[index] = { ...newRows[index], name: newValue }
                                setBulkRows(newRows)

                                const nameError = newValue ? validateHolidayName(newValue) : undefined
                                if (bulkRowErrors[index]?.name || bulkRowErrors[index]?.row || nameError) {
                                  const newErrors = [...bulkRowErrors]
                                  newErrors[index] = {
                                    ...newErrors[index],
                                    name: nameError,
                                    row: undefined,
                                  }
                                  setBulkRowErrors(newErrors)
                                }
                              }}
                              maxLength={30}
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
                              onChange={(e) => {
                                const inputValue = e.target.value
                                // Validate year length before updating
                                if (inputValue && inputValue.length >= 4) {
                                  const yearPart = inputValue.split('-')[0]
                                  if (yearPart.length > 4) {
                                    // Year too long, don't update
                                    return
                                  }
                                }
                                updateBulkRowDate(index, inputValue)
                              }}
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
                  disabled={bulkRows.length >= MAX_HOLIDAYS_PER_BATCH}
                  className={`mt-4 w-full py-3 border-2 border-dashed rounded-xl transition-all flex items-center justify-center gap-2 font-medium ${bulkRows.length >= MAX_HOLIDAYS_PER_BATCH ? "border-gray-200 text-gray-400 cursor-not-allowed bg-gray-50" : "border-gray-300 text-gray-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50"}`}
                >
                  <Plus className="w-5 h-5" />
                  Add Another Holiday {bulkRows.length >= MAX_HOLIDAYS_PER_BATCH ? `(Max ${MAX_HOLIDAYS_PER_BATCH})` : `(${bulkRows.length}/${MAX_HOLIDAYS_PER_BATCH})`}
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
                  disabled={isBulkSubmitting}
                  className={`flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-semibold transition-all transform hover:scale-105 ${isBulkSubmitting ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  {isBulkSubmitting ? 'Saving...' : 'Save All Holidays'}
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
                    onChange={(e) => {
                      const newValue = sanitizeHolidayName(e.target.value).slice(0, 30)
                      setEditFormData({ ...editFormData, name: newValue })
                    }}
                    maxLength={30}
                    placeholder="e.g., New Year's Day"
                    className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900 transition-colors ${editFormData.name && validateHolidayName(editFormData.name) ? "border-red-400" : "border-gray-300"}`}
                  />
                  {editFormData.name && validateHolidayName(editFormData.name) && (
                    <p className="mt-1 text-xs text-red-600">{validateHolidayName(editFormData.name)}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={editFormData.date}
                    onChange={(e) => {
                      const inputValue = e.target.value
                      // Validate year length before updating
                      if (inputValue && inputValue.length >= 4) {
                        const yearPart = inputValue.split('-')[0]
                        if (yearPart.length > 4) {
                          // Year too long, don't update
                          return
                        }
                      }
                      const yearError = validateDateYear(inputValue)
                      setEditDateError(yearError)
                      setEditFormData({ ...editFormData, date: inputValue })
                    }}
                    className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900 transition-colors ${editDateError ? "border-red-400" : "border-gray-300"}`}
                  />
                  {editDateError && (
                    <p className="mt-1 text-xs text-red-600">{editDateError}</p>
                  )}
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
                  disabled={isEditSubmitting}
                  className={`flex-1 px-4 py-2.5 bg-blue-600 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-medium transition-colors ${isEditSubmitting ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  {isEditSubmitting ? 'Updating...' : 'Update Holiday'}
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

