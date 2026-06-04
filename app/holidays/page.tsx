"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { Button, Select, Spin, Tooltip } from "antd"
import { CalendarRange, Plus, Edit2, Trash2, X, Calendar, ChevronDown, ChevronLeft, ChevronRight, CalendarDays, ClipboardList, BadgeInfo, SunMedium, Users, User, FileText, CheckSquare, Square, AlertTriangle } from "lucide-react"
import { createPortal } from "react-dom"
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns"
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

type CalendarMode = "month" | "week" | "day"
type PageView = "list" | "calendar"

interface CalendarFeedItem {
  id: string
  title: string
  description: string
  kind: "holiday" | "leave"
  startDate: string
  endDate: string
  dateKey: string
  status?: string
  employeeName?: string
}

const EVENT_STYLES = {
  holiday: {
    badge: "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100",
    dot: "bg-rose-400",
    label: "Holiday",
    icon: CalendarDays,
  },
  leave: {
    badge: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
    dot: "bg-emerald-400",
    label: "Leave",
    icon: Users,
  },
} as const

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

const MAX_HOLIDAYS_PER_BATCH = 12

const toSafeDate = (value: string) => parseISO(value.length > 10 ? value.slice(0, 10) : value)

const toDateKey = (value: string | Date) => format(typeof value === "string" ? toSafeDate(value) : value, "yyyy-MM-dd")

const expandDateRange = (startDate: string, endDate: string) => {
  const start = toSafeDate(startDate)
  const end = toSafeDate(endDate)

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return [] as string[]
  }

  const days: string[] = []
  let cursor = start

  while (cursor.getTime() <= end.getTime()) {
    days.push(toDateKey(cursor))
    cursor = addDays(cursor, 1)
  }

  return days
}

const getCalendarModeLabel = (mode: CalendarMode) => {
  if (mode === "month") return "Month"
  if (mode === "week") return "Week"
  return "Day"
}

export default function HolidaysPage() {
  const router = useRouter()
  const [isMounted, setIsMounted] = useState(false)
  const [pageView, setPageView] = useState<PageView>("list")

  // Synchronize view state with URL query parameters (?view=list or ?view=calendar) on load
  useEffect(() => {
    if (typeof window !== "undefined") {
      const search = window.location.search
      if (search.includes("view=calender") || search.includes("view=calendar")) {
        setPageView("calendar")
      } else if (search.includes("view=list")) {
        setPageView("list")
      }
    }
  }, [])

  const handleViewChange = (view: PageView) => {
    setPageView(view)
    setSelectedIds(new Set())
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href)
      url.searchParams.set("view", view)
      window.history.replaceState(null, "", url.pathname + url.search)
    }
  }
  const [calendarMode, setCalendarMode] = useState<CalendarMode>("month")
  const [calendarFocusDate, setCalendarFocusDate] = useState(new Date())
  const [selectedCalendarEventId, setSelectedCalendarEventId] = useState<string | null>(null)
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
  const [isDeletingHoliday, setIsDeletingHoliday] = useState(false)
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false)
  const [isEditSubmitting, setIsEditSubmitting] = useState(false)
  const [editDateError, setEditDateError] = useState("")

  // Bulk delete state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false)
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)

  // More events & Event details modal states
  const [showMoreEventsModal, setShowMoreEventsModal] = useState(false)
  const [moreEventsDate, setMoreEventsDate] = useState<Date | null>(null)
  const [moreEventsList, setMoreEventsList] = useState<CalendarFeedItem[]>([])

  const [showEventDetailsModal, setShowEventDetailsModal] = useState(false)
  const [selectedEventDetails, setSelectedEventDetails] = useState<CalendarFeedItem | null>(null)
  const [eventDetailsDate, setEventDetailsDate] = useState<Date | null>(null)
  const [popoverPosition, setPopoverPosition] = useState<{ top: number; left: number } | null>(null)
  const [eventDetailsPosition, setEventDetailsPosition] = useState<{ top: number; left: number } | null>(null)

  // Fetch holidays
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["holidays"],
    queryFn: async () => {
      const res = await fetch("/api/holidays")
      if (!res.ok) {
        if (res.status === 401) {
          router.push("/auth/login")
          throw new Error("Unauthorized")
        }
        throw new Error("Failed to fetch holidays")
      }
      return res.json()
    },
    refetchOnWindowFocus: true,
  })

  const holidays: Holiday[] = data?.holidays || []
  const userRole = data?.userRole
  const isHR = userRole === 'HR' || userRole === 'Admin'

  const { data: leaveData, isLoading: isLeaveLoading, refetch: refetchLeaves } = useQuery({
    queryKey: ["holiday-calendar-leaves"],
    queryFn: async () => {
      const res = await fetch("/api/leave-management/all")
      if (!res.ok) {
        if (res.status === 401) {
          router.push("/auth/login")
          throw new Error("Unauthorized")
        }
        throw new Error("Failed to fetch leave records")
      }
      return res.json()
    },
    enabled: pageView === "calendar",
    refetchOnWindowFocus: true,
    refetchInterval: pageView === "calendar" ? 60000 : false,
  })

  const approvedLeaves = (leaveData?.allLeaves || []).filter(
    (leave: any) => leave?.status === "approved" && leave?.leaveCategory !== "Extra Day Pay"
  )

  useEffect(() => {
    if (pageView === "calendar") {
      const today = new Date()
      setCalendarFocusDate(today)
    }
  }, [pageView])

  // Close float popovers on scroll or window resize
  useEffect(() => {
    const handleClose = () => {
      setShowMoreEventsModal(false)
      setShowEventDetailsModal(false)
    }
    if (showMoreEventsModal || showEventDetailsModal) {
      window.addEventListener("scroll", handleClose, { passive: true })
      window.addEventListener("resize", handleClose)
    }
    return () => {
      window.removeEventListener("scroll", handleClose)
      window.removeEventListener("resize", handleClose)
    }
  }, [showMoreEventsModal, showEventDetailsModal])

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

  const calendarEvents = useMemo<CalendarFeedItem[]>(() => {
    const yearValue = calendarFocusDate.getFullYear().toString()
    const holidayEvents = holidays
      .filter((holiday) => String(holiday.year) === yearValue)
      .map((holiday) => ({
        id: `holiday-${holiday.id}`,
        title: holiday.name,
        description: `${holiday.day} • Company holiday`,
        kind: "holiday" as const,
        startDate: holiday.date,
        endDate: holiday.date,
        dateKey: toDateKey(holiday.date),
      }))

    const leaveEvents = approvedLeaves.flatMap((leave: any) => {
      const days = expandDateRange(leave.startDate, leave.endDate)
      return days
        .filter((dayKey) => dayKey.startsWith(yearValue))
        .map((dayKey, index) => ({
          id: `leave-${leave.id}-${dayKey}-${index}`,
          title: leave.employeeName || "Employee leave",
          description: `${leave.employeeName || "Employee"} • ${leave.leaveType || "Leave"}`,
          kind: "leave" as const,
          startDate: leave.startDate,
          endDate: leave.endDate,
          dateKey: dayKey,
          status: leave.status,
          employeeName: leave.employeeName,
        }))
    })

    return [...holidayEvents, ...leaveEvents].sort((a, b) => a.dateKey.localeCompare(b.dateKey))
  }, [approvedLeaves, holidays, calendarFocusDate])

  const calendarEventsByDate = useMemo(() => {
    const map = new Map<string, CalendarFeedItem[]>()

    for (const event of calendarEvents) {
      const existing = map.get(event.dateKey) || []
      existing.push(event)
      map.set(event.dateKey, existing)
    }

    return map
  }, [calendarEvents])

  const selectedCalendarDayKey = toDateKey(calendarFocusDate)
  const selectedDayEvents = calendarEventsByDate.get(selectedCalendarDayKey) || []
  const selectedCalendarEvent = selectedDayEvents.find((event) => event.id === selectedCalendarEventId) || null
  const selectedEventForDetails = selectedCalendarEvent || selectedDayEvents[0] || null

  const calendarDays = useMemo(() => {
    if (calendarMode === "month") {
      const start = startOfWeek(startOfMonth(calendarFocusDate), { weekStartsOn: 0 })
      const end = endOfWeek(endOfMonth(calendarFocusDate), { weekStartsOn: 0 })
      const days: Date[] = []
      let cursor = start

      while (cursor <= end) {
        days.push(cursor)
        cursor = addDays(cursor, 1)
      }

      return days
    }

    if (calendarMode === "week") {
      const start = startOfWeek(calendarFocusDate, { weekStartsOn: 0 })
      return Array.from({ length: 7 }, (_, index) => addDays(start, index))
    }

    return [calendarFocusDate]
  }, [calendarFocusDate, calendarMode])

  const selectedPeriodLabel = useMemo(() => {
    if (calendarMode === "month") {
      return format(calendarFocusDate, "MMMM yyyy")
    }

    if (calendarMode === "week") {
      const weekStart = startOfWeek(calendarFocusDate, { weekStartsOn: 0 })
      const weekEnd = addDays(weekStart, 6)
      return `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`
    }

    return format(calendarFocusDate, "EEEE, MMM d, yyyy")
  }, [calendarFocusDate, calendarMode])

  const navigateCalendar = (direction: "prev" | "next") => {
    const nextDate =
      calendarMode === "month"
        ? direction === "prev"
          ? subMonths(calendarFocusDate, 1)
          : addMonths(calendarFocusDate, 1)
        : direction === "prev"
          ? addDays(calendarFocusDate, calendarMode === "week" ? -7 : -1)
          : addDays(calendarFocusDate, calendarMode === "week" ? 7 : 1)

    setCalendarFocusDate(nextDate)
    setSelectedCalendarEventId(null)
  }

  const jumpToToday = () => {
    const today = new Date()
    setCalendarFocusDate(today)
    setSelectedCalendarEventId(null)
  }

  const openMoreEvents = (e: React.MouseEvent, date: Date, events: CalendarFeedItem[]) => {
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    const screenWidth = window.innerWidth
    const screenHeight = window.innerHeight
    const popupWidth = 320
    const popupHeight = 250

    let left = rect.right + window.scrollX + 8
    if (left + popupWidth > screenWidth) {
      left = rect.left + window.scrollX - popupWidth - 8
    }
    if (left < 8) {
      left = 8
    }

    let top = rect.top + window.scrollY - 10
    if (top + popupHeight > screenHeight + window.scrollY) {
      top = screenHeight + window.scrollY - popupHeight - 16
    }
    if (top < 8) {
      top = 8
    }

    setPopoverPosition({ top, left })
    setMoreEventsDate(date)
    setMoreEventsList(events)
    setShowMoreEventsModal(true)
  }

  const openEventDetails = (e: React.MouseEvent, event: CalendarFeedItem, date: Date) => {
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    const screenWidth = window.innerWidth
    const screenHeight = window.innerHeight
    const popupWidth = 380
    const popupHeight = 250

    let left = rect.right + window.scrollX + 8
    if (left + popupWidth > screenWidth) {
      left = rect.left + window.scrollX - popupWidth - 8
    }
    if (left < 8) {
      left = 8
    }

    let top = rect.top + window.scrollY - 10
    if (top + popupHeight > screenHeight + window.scrollY) {
      top = screenHeight + window.scrollY - popupHeight - 16
    }
    if (top < 8) {
      top = 8
    }

    setEventDetailsPosition({ top, left })
    setSelectedEventDetails(event)
    setEventDetailsDate(date)
    setShowEventDetailsModal(true)
  }

  const handleEventClickFromMore = (e: React.MouseEvent, event: CalendarFeedItem, date: Date) => {
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    const screenWidth = window.innerWidth
    const screenHeight = window.innerHeight
    const popupWidth = 380
    const popupHeight = 250

    let left = rect.right + window.scrollX + 8
    if (left + popupWidth > screenWidth) {
      left = rect.left + window.scrollX - popupWidth - 8
    }
    if (left < 8) {
      left = 8
    }

    let top = rect.top + window.scrollY - 10
    if (top + popupHeight > screenHeight + window.scrollY) {
      top = screenHeight + window.scrollY - popupHeight - 16
    }
    if (top < 8) {
      top = 8
    }

    setEventDetailsPosition({ top, left })
    setSelectedEventDetails(event)
    setEventDetailsDate(date)
    setShowEventDetailsModal(true)
  }

  const renderEventBadge = (event: CalendarFeedItem, dateKey: string) => {
    const style = EVENT_STYLES[event.kind]
    const Icon = style.icon

    return (
      <Tooltip key={event.id} title={`${event.title} — ${event.description}`}>
        <button
          type="button"
          onClick={(e) => openEventDetails(e, event, toSafeDate(dateKey))}
          className={`flex w-full items-center gap-1 rounded-md border px-2 py-1 text-left text-[11px] leading-tight transition-colors ${style.badge}`}
        >
          <Icon className="h-3 w-3 shrink-0" />
          <span className="truncate">{event.title}</span>
        </button>
      </Tooltip>
    )
  }

  const renderCalendarCell = (date: Date) => {
    const dateKey = toDateKey(date)
    const events = calendarEventsByDate.get(dateKey) || []
    const hasHoliday = events.some((event) => event.kind === "holiday")
    const hasLeave = events.some((event) => event.kind === "leave")
    const overlap = hasHoliday && hasLeave
    const inCurrentMonth = calendarMode !== "month" || isSameMonth(date, calendarFocusDate)
    const isToday = isSameDay(date, new Date())
    const isSelected = isSameDay(date, calendarFocusDate)
    const isWeekend = date.getDay() === 0 || date.getDay() === 6
    const visibleEvents = events.slice(0, 2)
    const hiddenCount = events.length - visibleEvents.length
    const isCompactGrid = calendarMode !== "day"
    const baseShape = isCompactGrid ? "rounded-none border-0" : "rounded-2xl border border-slate-200"
    const hoverEffect = isCompactGrid ? "hover:bg-slate-50" : "hover:-translate-y-0.5 hover:shadow-md"
    const selectedRing = isSelected
      ? isCompactGrid
        ? "ring-2 ring-blue-500 ring-inset"
        : "ring-2 ring-blue-500 ring-offset-2"
      : ""
    const widthStyle = calendarMode === "day" ? "max-w-md w-full" : "w-full"

    return (
      <button
        key={dateKey}
        type="button"
        onClick={() => {
          setCalendarFocusDate(date)
          setSelectedCalendarEventId(null)
        }}
        className={`group min-h-[130px] p-3 text-left transition-all outline-none ${baseShape} ${hoverEffect} ${widthStyle} ${inCurrentMonth ? (isWeekend ? "bg-sky-50/60" : "bg-white") : "bg-slate-50 text-slate-400"
          } ${selectedRing} ${overlap ? "bg-violet-50/60" : ""}`}
      >
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-semibold ${isToday ? "text-blue-600" : "text-slate-900"}`}>
              {format(date, "d")}
            </span>
            {isToday && <span className="rounded-full bg-blue-600/90 px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm">Today</span>}
            {overlap && <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-800">Overlap</span>}
          </div>
          <span className="text-[10px] uppercase tracking-wider text-slate-400">
            {WEEKDAY_LABELS[date.getDay()]}
          </span>
        </div>

        <div className="space-y-1">
          {visibleEvents.map((event) => renderEventBadge(event, dateKey))}
          {hiddenCount > 0 && (
            <button
              type="button"
              onClick={(e) => openMoreEvents(e, date, events)}
              className="w-full text-left rounded-md border border-dashed border-slate-200 bg-white/80 hover:bg-slate-100 hover:border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-600 transition-all outline-none"
            >
              +{hiddenCount} more
            </button>
          )}
          {events.length === 0 && (
            <div className="rounded-md border border-dashed border-slate-200 bg-white/80 px-2 py-1 text-[11px] text-slate-400">
              No events
            </div>
          )}
        </div>
      </button>
    )
  }



  const getYearPart = (dateValue: string) => {
    return (dateValue || "").split("-")[0] || ""
  }

  const validateDateYear = (dateValue: string) => {
    if (!dateValue) return ""

    const yearPart = getYearPart(dateValue)
    if (yearPart.length > 4) {
      return "Year must be 4 digits"
    }

    const currentDate = new Date()
    const currentYear = currentDate.getFullYear()
    const isDecember = currentDate.getMonth() === 11
    const allowedYears = isDecember ? [currentYear, currentYear + 1] : [currentYear]

    if (yearPart.length === 4) {
      const numericYear = Number(yearPart)
      if (!Number.isNaN(numericYear) && !allowedYears.includes(numericYear)) {
        return isDecember
          ? `Only ${currentYear} or ${currentYear + 1} holidays are allowed`
          : `Only ${currentYear} holidays are allowed`
      }
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

        const numericYear = Number(year)
        if (!Number.isNaN(numericYear) && !allowedYears.includes(numericYear)) {
          return isDecember
            ? `Only ${currentYear} or ${currentYear + 1} holidays are allowed`
            : `Only ${currentYear} holidays are allowed`
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

  // Clear selection when filtered year changes
  useEffect(() => {
    setSelectedIds(new Set())
  }, [selectedYear])

  // Disable background scrolling when modals are open
  useEffect(() => {
    if (showBulkModal || showEditModal || showDeleteConfirm || showBulkDeleteConfirm || showMoreEventsModal || showEventDetailsModal) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [showBulkModal, showEditModal, showDeleteConfirm, showBulkDeleteConfirm, showMoreEventsModal, showEventDetailsModal])

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
    if (!deletingHolidayId || isDeletingHoliday) return

    setIsDeletingHoliday(true)
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

      setSelectedIds((prev) => {
        const next = new Set(prev)
        next.delete(deletingHolidayId)
        return next
      })
      setShowDeleteConfirm(false)
      setDeletingHolidayId(null)
      toast.success("Holiday deleted successfully!")
    } catch (error) {
      console.error("Error deleting holiday:", error)
      toast.error("Failed to delete holiday")
    } finally {
      setIsDeletingHoliday(false)
    }
  }

  const openDeleteConfirm = (id: string) => {
    setDeletingHolidayId(id)
    setShowDeleteConfirm(true)
  }

  // ── Bulk selection helpers ──────────────────────────────────────────────
  const allFilteredIds = filteredHolidays.map((h) => h.id)
  const isAllSelected = allFilteredIds.length > 0 && allFilteredIds.every((id) => selectedIds.has(id))
  const isIndeterminate = !isAllSelected && allFilteredIds.some((id) => selectedIds.has(id))

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(allFilteredIds))
    }
  }

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleBulkDelete = async () => {
    if (isBulkDeleting || selectedIds.size === 0) return
    setIsBulkDeleting(true)
    try {
      const idsArray = Array.from(selectedIds)
      const response = await fetch(`/api/holidays?ids=${idsArray.join(",")}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json()
        toast.error(error.error || "Failed to delete holidays")
        return
      }

      const result = await response.json()
      const refreshed = await refetch()
      const latestHolidays: Holiday[] = refreshed.data?.holidays || []
      const selectedYearHasRemaining = latestHolidays.some(
        (h) => String(h.year) === String(selectedYear)
      )
      if (!selectedYearHasRemaining) {
        setSelectedYear(new Date().getFullYear().toString())
      }

      setSelectedIds(new Set())
      setShowBulkDeleteConfirm(false)
      toast.success(result.message || `Successfully deleted ${selectedIds.size} holiday(s)!`)
    } catch (error) {
      console.error("Error bulk deleting holidays:", error)
      toast.error("Failed to delete selected holidays")
    } finally {
      setIsBulkDeleting(false)
    }
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
          title="Calendar"
          subtitle="View and manage leave events & company holidays"
        >
          <div className="flex items-center gap-3">
            {/* Year Filter */}
            {pageView === "list" && (
              <div className="relative">
                <Select
                  value={selectedYear}
                  size="large"
                  onChange={(e) => { setSelectedYear(e); setSelectedIds(new Set()) }}
                  suffixIcon={<ChevronDown className="w-4 h-4 text-muted-foreground pointer-events-none" />}
                >
                  {availableYears.map(year => (
                    <Select.Option key={year} value={year}>{year}</Select.Option>
                  ))}
                </Select>
              </div>
            )}

            <div className="inline-flex h-10 items-center rounded-lg border border-slate-200 bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => handleViewChange("list")}
                className={`rounded-md px-3 h-8 text-sm font-medium transition-colors ${pageView === "list" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
              >
                List View
              </button>
              <button
                type="button"
                onClick={() => handleViewChange("calendar")}
                className={`rounded-md px-3 h-8 text-sm font-medium transition-colors ${pageView === "calendar" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
              >
                Calendar View
              </button>
            </div>

            {isHR && (
              <Button
                type="primary"
                size="large"
                icon={<Plus size={16} />}
                onClick={() => setShowBulkModal(true)}
              >
                Add Holidays
              </Button>
            )}
          </div>
        </PageHeader>

        {/* ── Selection Action Bar (slides in when rows are checked) ── */}
        {isHR && selectedIds.size > 0 && pageView === "list" && (
          <div
            style={{
              animation: "slideDownFade 0.18s ease",
            }}
            className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 shadow-sm"
          >
            {/* Left — count + select-all shortcut */}
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white text-sm font-bold shadow">
                {selectedIds.size}
              </div>
              <span className="text-sm font-semibold text-blue-900">
                {selectedIds.size === 1 ? "1 holiday selected" : `${selectedIds.size} holidays selected`}
              </span>
              <span className="hidden sm:inline text-slate-300">|</span>
              <button
                type="button"
                onClick={toggleSelectAll}
                className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 hover:text-blue-900 transition-colors underline-offset-2 hover:underline"
              >
                {isAllSelected ? "Deselect all" : `Select all ${filteredHolidays.length}`}
              </button>
            </div>

            {/* Right — actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Clear</span>
              </button>
              <button
                type="button"
                onClick={() => setShowBulkDeleteConfirm(true)}
                className="flex items-center gap-1.5 rounded-lg bg-red-500 hover:bg-red-600 px-4 py-1.5 text-sm font-semibold text-white transition-colors shadow-sm"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Selected
              </button>
            </div>
          </div>
        )}

        <style>{`
          @keyframes slideDownFade {
            from { opacity: 0; transform: translateY(-6px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>

        {pageView === "list" ? (
          filteredHolidays.length === 0 ? (
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
                  const isChecked = selectedIds.has(holiday.id)

                  return (
                    <div
                      key={holiday.id}
                      className={`bg-card border rounded-xl p-4 shadow-sm transition-colors ${isChecked ? "border-blue-400 bg-blue-50/40" : "border-border"
                        }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-start gap-2">
                          {isHR && (
                            <button
                              type="button"
                              onClick={() => toggleSelectOne(holiday.id)}
                              className="mt-0.5 shrink-0 text-slate-400 hover:text-blue-600 transition-colors"
                              aria-label={isChecked ? "Deselect holiday" : "Select holiday"}
                            >
                              {isChecked
                                ? <CheckSquare className="w-5 h-5 text-blue-600" />
                                : <Square className="w-5 h-5" />}
                            </button>
                          )}
                          <h4 className="font-semibold text-foreground">
                            {holiday.name}
                          </h4>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          #{index + 1}
                        </span>
                      </div>

                      <div className="text-sm text-muted-foreground space-y-1 pl-7">
                        <p><span className="font-medium text-foreground">Date:</span> {formattedDate}</p>
                        <p>
                          <span className="font-medium text-foreground">Day:</span>{" "}
                          <span className="inline-block px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-xs">
                            {holiday.day}
                          </span>
                        </p>
                      </div>

                      {isHR && (
                        <div className="flex gap-2 mt-3 pl-7">
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
                        {isHR && (
                          <th className="px-4 lg:px-5 py-3 text-center w-12">
                            <button
                              type="button"
                              onClick={toggleSelectAll}
                              className="inline-flex items-center justify-center text-slate-500 hover:text-blue-600 transition-colors"
                              aria-label={isAllSelected ? "Deselect all" : "Select all"}
                            >
                              {isAllSelected
                                ? <CheckSquare className="w-5 h-5 text-blue-600" />
                                : isIndeterminate
                                  ? <CheckSquare className="w-5 h-5 text-blue-400" />
                                  : <Square className="w-5 h-5" />}
                            </button>
                          </th>
                        )}
                        <th className="px-4 lg:px-6 py-3 text-left text-xs lg:text-sm font-bold uppercase">Index</th>
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

                        const isChecked = selectedIds.has(holiday.id)

                        return (
                          <tr
                            key={holiday.id}
                            className={`transition-colors ${isChecked ? "bg-blue-50/60 hover:bg-blue-100/60" : "hover:bg-muted/50"
                              }`}
                          >
                            {isHR && (
                              <td className="px-4 lg:px-5 py-3 text-center w-12">
                                <button
                                  type="button"
                                  onClick={() => toggleSelectOne(holiday.id)}
                                  className="inline-flex items-center justify-center text-slate-400 hover:text-blue-600 transition-colors"
                                  aria-label={isChecked ? "Deselect" : "Select"}
                                >
                                  {isChecked
                                    ? <CheckSquare className="w-5 h-5 text-blue-600" />
                                    : <Square className="w-5 h-5" />}
                                </button>
                              </td>
                            )}

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
          )
        ) : (
          <div className="space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-sky-50 to-white p-5 shadow-sm">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-3">
                  <div className="mt-1 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                    <CalendarDays className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-semibold text-slate-900">{selectedPeriodLabel}</h3>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="inline-flex rounded-xl border border-slate-200 bg-white/80 p-1 shadow-sm">
                    {(["month", "week", "day"] as CalendarMode[]).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setCalendarMode(mode)}
                        className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${calendarMode === mode ? "bg-white text-slate-900 shadow-md" : "text-slate-600 hover:text-slate-900"}`}
                      >
                        {getCalendarModeLabel(mode)}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button icon={<ChevronLeft className="h-4 w-4" />} onClick={() => navigateCalendar("prev")} />
                    <Button onClick={jumpToToday}>Today</Button>
                    <Button icon={<ChevronRight className="h-4 w-4" />} onClick={() => navigateCalendar("next")} />
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                <span className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 font-medium text-rose-700">
                  <span className="h-2 w-2 rounded-full bg-rose-400" /> Holiday
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 font-medium text-emerald-700">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" /> Leave
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 font-medium text-violet-700">
                  <SunMedium className="h-3.5 w-3.5" /> Overlap
                </span>
              </div>

              {isHR && isLeaveLoading && pageView === "calendar" && (
                <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
                  <Spin size="small" /> Loading leave records...
                </div>
              )}

              <div className="mt-5 overflow-x-auto">
                <div className={calendarMode === "day" ? "p-1" : "rounded-2xl border border-slate-200 bg-slate-200 p-px overflow-hidden"}>
                  <div className={`grid gap-px ${calendarMode === "month"
                    ? "min-w-[980px] grid-cols-7"
                    : calendarMode === "week"
                      ? "grid-cols-1 lg:grid-cols-7"
                      : "grid-cols-1"
                    }`}>
                    {calendarMode === "month" && WEEKDAY_LABELS.map((label) => (
                      <div key={label} className="bg-white px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        {label}
                      </div>
                    ))}

                    {calendarDays.map((date) => renderCalendarCell(date))}
                  </div>
                </div>
              </div>

            </div>
          </div>
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
                  disabled={isDeletingHoliday}
                  className={`flex-1 px-4 py-2.5 bg-red-500 text-white rounded-lg font-medium transition-colors ${isDeletingHoliday ? 'opacity-60 cursor-not-allowed' : 'hover:bg-red-600'}`}
                >
                  {isDeletingHoliday ? 'Deleting...' : 'Yes, Delete'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Bulk Delete Confirmation Modal */}
        {showBulkDeleteConfirm && isMounted && createPortal(
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all border border-gray-100">
              <div className="p-6 text-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-1">
                    <AlertTriangle className="w-6 h-6 text-red-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Holiday(s)</h3>
                    <p className="text-sm text-gray-600">
                      Are you sure you want to delete{" "}
                      <span className="font-semibold text-red-600">{selectedIds.size} holiday{selectedIds.size !== 1 ? "s" : ""}?</span>
                      <br />
                      This action <span className="font-semibold">cannot be undone.</span>
                    </p>
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 bg-gray-50 flex gap-3">
                <button
                  onClick={() => setShowBulkDeleteConfirm(false)}
                  disabled={isBulkDeleting}
                  className="flex-1 px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-700 rounded-lg font-medium transition-colors border border-gray-300 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={isBulkDeleting}
                  className={`flex-1 px-4 py-2.5 bg-red-500 text-white rounded-lg font-medium transition-colors ${isBulkDeleting ? "opacity-60 cursor-not-allowed" : "hover:bg-red-600"
                    }`}
                >
                  {isBulkDeleting
                    ? "Deleting…"
                    : `Delete ${selectedIds.size} Holiday${selectedIds.size !== 1 ? "s" : ""}`}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* More Events Modal (Google Calendar style) */}
        {showMoreEventsModal && moreEventsDate && isMounted && createPortal(
          <>
            {/* Transparent click-outside overlay */}
            <div
              className="fixed inset-0 bg-transparent z-[100]"
              onClick={() => {
                setShowMoreEventsModal(false)
                setMoreEventsDate(null)
                setMoreEventsList([])
              }}
            />
            {/* Popover container */}
            <div
              style={{
                position: 'absolute',
                top: `${popoverPosition?.top ?? 0}px`,
                left: `${popoverPosition?.left ?? 0}px`,
              }}
              className="z-[200] bg-[#e9eef6] rounded-[28px] shadow-2xl max-w-sm w-[290px] overflow-hidden border border-slate-200/50 flex flex-col max-h-[80vh] p-5 relative"
            >

              {/* Close Button */}
              <button
                onClick={() => {
                  setShowMoreEventsModal(false)
                  setMoreEventsDate(null)
                  setMoreEventsList([])
                  setShowEventDetailsModal(false)
                  setSelectedEventDetails(null)
                  setEventDetailsDate(null)
                }}
                className="absolute top-4 right-4 p-1.5 hover:bg-black/5 rounded-full transition-colors text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Header: Weekday & Date Circle */}
              <div className="flex flex-col items-center pb-4 flex-shrink-0">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  {format(moreEventsDate, "EEE")}
                </span>
                <div className="mt-1 w-10 h-10 rounded-full bg-[#0b57d0] text-white flex items-center justify-center font-semibold text-lg shadow-sm">
                  {format(moreEventsDate, "d")}
                </div>
              </div>

              {/* Event list */}
              <div className="overflow-y-auto space-y-1.5 flex-1 pr-1">
                {moreEventsList.map((event) => {
                  return (
                    <button
                      key={event.id}
                      type="button"
                      onClick={(e) => handleEventClickFromMore(e, event, moreEventsDate)}
                      className={`w-full flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left text-[11px] font-semibold transition-all hover:bg-slate-50 outline-none ${event.kind === "holiday"
                        ? "border-rose-200 bg-white text-rose-700 hover:border-rose-300"
                        : "border-emerald-200 bg-white text-emerald-700 hover:border-emerald-300"
                        }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${event.kind === "holiday" ? "bg-rose-500" : "bg-emerald-500"
                        }`} />
                      <span className="truncate flex-1">{event.title}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </>,
          document.body
        )}

        {/* Event Details Modal (Google Calendar style) */}
        {showEventDetailsModal && selectedEventDetails && isMounted && createPortal(
          <>
            {/* Transparent click-outside overlay — closes both popups */}
            <div
              className="fixed inset-0 bg-transparent z-[150]"
              onClick={() => {
                setShowEventDetailsModal(false)
                setSelectedEventDetails(null)
                setEventDetailsDate(null)
                setShowMoreEventsModal(false)
                setMoreEventsDate(null)
                setMoreEventsList([])
              }}
            />
            {/* Popover container */}
            <div
              style={{
                position: 'absolute',
                top: `${eventDetailsPosition?.top ?? 0}px`,
                left: `${eventDetailsPosition?.left ?? 0}px`,
              }}
              className="z-[300] bg-white rounded-[28px] shadow-2xl max-w-sm w-[340px] overflow-hidden border border-slate-100 flex flex-col"
            >

              {/* Top Action Bar */}
              <div className="flex justify-end items-center gap-1 p-3 pb-0">
                <button
                  onClick={() => {
                    setShowEventDetailsModal(false)
                    setSelectedEventDetails(null)
                    setEventDetailsDate(null)
                  }}
                  className="p-1.5 hover:bg-slate-100 rounded-full transition-colors text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Main Content Body */}
              <div className="flex px-4 pb-5">
                {/* Left Column: Color indicator */}
                <div className="w-10 flex-shrink-0 flex justify-center pt-1.5">
                  <div className={`w-3.5 h-3.5 rounded-[4px] ${selectedEventDetails.kind === "holiday" ? "bg-[#d50000]" : "bg-[#0b8043]"
                    }`} />
                </div>

                {/* Right Column: Title and Details */}
                <div className="flex-1 min-w-0 pr-4 space-y-3">
                  {/* Title & Date Section */}
                  <div>
                    <h3 className="text-lg font-normal text-slate-900 leading-snug">
                      {selectedEventDetails.title}
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-600">
                      {eventDetailsDate && format(eventDetailsDate, "EEEE, MMMM d, yyyy")}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {selectedEventDetails.startDate === selectedEventDetails.endDate
                        ? "All day"
                        : `${selectedEventDetails.startDate} to ${selectedEventDetails.endDate}`}
                    </p>
                  </div>

                  {/* Description Row */}
                  <div className="flex gap-3 items-start pt-2 border-t border-slate-100">
                    <div className="w-3.5 flex-shrink-0 text-slate-400 mt-0.5">
                      <FileText className="w-3.5 h-3.5" />
                    </div>
                    <div className="text-xs text-slate-600 leading-normal">
                      {selectedEventDetails.description}
                    </div>
                  </div>

                  {/* Employee Row (For leaves) */}
                  {selectedEventDetails.employeeName && (
                    <div className="flex gap-3 items-start pt-0.5">
                      <div className="w-3.5 flex-shrink-0 text-slate-400 mt-0.5">
                        <User className="w-3.5 h-3.5" />
                      </div>
                      <div className="text-xs text-slate-700 font-medium">
                        {selectedEventDetails.employeeName}
                      </div>
                    </div>
                  )}

                  {/* Status Row (For leaves) */}
                  {selectedEventDetails.status && (
                    <div className="flex gap-3 items-start pt-0.5">
                      <div className="w-3.5 flex-shrink-0 text-slate-400 mt-0.5">
                        <BadgeInfo className="w-3.5 h-3.5" />
                      </div>
                      <div className="text-xs text-slate-600 flex items-center gap-1.5">
                        <span>Status:</span>
                        <span className={`capitalize px-2 py-0.5 text-[10px] font-semibold rounded-full ${selectedEventDetails.status === "approved"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}>
                          {selectedEventDetails.status}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
          ,
          document.body
        )}
      </div>
    </PageContainer>
  )
}

