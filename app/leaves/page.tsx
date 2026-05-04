"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { LeaveRequestForm } from "./components/leave-request-form"
import { LeaveTable } from "./components/leave-table"
import { LeaveDetailsModal } from "./components/leave-details-modal"
import { useLeaveStore } from "@/store/leaveStore"
import type { LeaveRequest } from "@/types"
import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import { Modal, Select, Input, Card, Row, Col, Spin, DatePicker, Button, Form, Checkbox } from "antd"
import { SearchOutlined } from "@ant-design/icons"
import { PageContainer } from "@/components/page-container"
import { PageHeader } from "@/components/page-header"
import { RefreshButton } from "@/components/refresh-button"
import dayjs from "dayjs"
import { Plus } from "lucide-react"

interface EmployeeOption {
  id: string
  name: string
  email?: string
  role?: string
  active?: boolean
}

interface EmployeeLeaveKpi {
  annualLeaveRemaining: number
  sickLeaveCount: number
  emergencyLeaveCount: number
  plannedLeaveCount: number
}

const DEFAULT_LEAVE_FILTERS = {
  status: "",
  leaveType: "",
  employeeName: "",
  dateRange: [null, null] as [any, any],
}

const ALL_LEAVE_TYPE_VALUE = "__all_leave_types__"
const ALL_STATUS_VALUE = "__all_status__"

type LeaveTab = "my-requests" | "approvals" | "all-leaves"

const LEAVE_TAB_QUERY_MAP: Record<LeaveTab, string> = {
  "my-requests": "my-requests",
  approvals: "approval",
  "all-leaves": "all-leaves",
}

function getTabFromParam(tab: string | null): LeaveTab | null {
  const normalized = tab?.trim().toLowerCase()

  if (!normalized) {
    return null
  }

  if (normalized === "approval" || normalized === "approvals") {
    return "approvals"
  }

  if (normalized === "my-requests" || normalized === "myrequests") {
    return "my-requests"
  }

  if (normalized === "all-leaves" || normalized === "allleaves") {
    return "all-leaves"
  }

  return null
}

export default function LeavesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showForm, setShowForm] = useState(false)
  const [isSubmittingLeaveRequest, setIsSubmittingLeaveRequest] = useState(false)
  const [selectedTab, setSelectedTab] = useState<LeaveTab>("my-requests")
  const [currentUser, setCurrentUser] = useState<{ employeeId: string; email?: string; recordId: string; role?: string; title?: string } | null>(null)
  const [rejectModalVisible, setRejectModalVisible] = useState(false)
  const [rejectingLeaveId, setRejectingLeaveId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const [ruleChoiceModalVisible, setRuleChoiceModalVisible] = useState(false)
  const [ruleChoiceLeave, setRuleChoiceLeave] = useState<LeaveRequest | null>(null)
  const [applySandwichSelection, setApplySandwichSelection] = useState(false)
  const [applyOnePlusTwoSelection, setApplyOnePlusTwoSelection] = useState(false)
  const [isApprovingRuleChoice, setIsApprovingRuleChoice] = useState(false)
  const [allLeaves, setAllLeaves] = useState<LeaveRequest[]>([])
  const [filteredLeaves, setFilteredLeaves] = useState<LeaveRequest[]>([])
  const [filteredMyLeaves, setFilteredMyLeaves] = useState<LeaveRequest[]>([])
  const [isRefreshingAllLeaves, setIsRefreshingAllLeaves] = useState(false)
  const [showApplyForOthersForm, setShowApplyForOthersForm] = useState(false)
  const [employeeOptions, setEmployeeOptions] = useState<EmployeeOption[]>([])
  const [holidayDateSet, setHolidayDateSet] = useState<Set<string>>(new Set())
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false)
  const [isSubmittingApplyForOthers, setIsSubmittingApplyForOthers] = useState(false)
  const [applyForOthersForm] = Form.useForm()
  const [selectedLeaveForDetails, setSelectedLeaveForDetails] = useState<LeaveRequest | null>(null)
  const [detailsModalVisible, setDetailsModalVisible] = useState(false)
  const [isLoadingLeaveDetails, setIsLoadingLeaveDetails] = useState(false)
  const [filters, setFilters] = useState(DEFAULT_LEAVE_FILTERS)

  const normalizedEmployeeSearch = filters.employeeName.trim().toLowerCase()
  const searchedEmployeeLeaves = normalizedEmployeeSearch
    ? allLeaves.filter((leave) => leave.employeeName?.toLowerCase().includes(normalizedEmployeeSearch))
    : []
  const searchedEmployeeIds = Array.from(
    new Set(
      searchedEmployeeLeaves
        .map((leave) => leave.employeeId)
        .filter((employeeId): employeeId is string => Boolean(employeeId))
    )
  )
  const searchedEmployeeId = searchedEmployeeIds.length === 1 ? searchedEmployeeIds[0] : ""
  const searchedEmployeeName = searchedEmployeeId
    ? searchedEmployeeLeaves.find((leave) => leave.employeeId === searchedEmployeeId)?.employeeName || ""
    : ""

  console.log("Current User:", currentUser)
  const { leaves, pendingApprovals, setLeaves, setPendingApprovals, updateLeave } = useLeaveStore()
  console.log("Leaves from store:", pendingApprovals)

  const promptGoogleWorkspaceAuthentication = () => {
    Modal.confirm({
      title: "Google Workspace authentication required",
      content: "Please connect your Google Workspace account before applying for leave.",
      okText: "Connect Now",
      cancelText: "Later",
      onOk: () => {
        router.push('/dashboard?tab=integration')
      },
    })
  }

  const handleViewLeaveDetails = async (leave: LeaveRequest) => {
    setSelectedLeaveForDetails(leave)
    setDetailsModalVisible(true)
    setIsLoadingLeaveDetails(true)

    try {
      const response = await fetch(`/api/leave-management/details?leaveId=${encodeURIComponent(leave.id)}`)
      const result = await response.json()

      if (!response.ok) {
        toast.error(result?.error || 'Failed to fetch leave details')
        return
      }

      if (result?.leave) {
        setSelectedLeaveForDetails(result.leave)
      }
    } catch (error) {
      console.error('Error fetching leave details:', error)
      toast.error('Failed to fetch leave details')
    } finally {
      setIsLoadingLeaveDetails(false)
    }
  }

  const updateUrlQueryForTab = (tab: LeaveTab) => {
    const tabParamValue = LEAVE_TAB_QUERY_MAP[tab]
    const nextParams = new URLSearchParams(searchParams.toString())

    if (nextParams.get('tab') === tabParamValue) {
      return
    }

    nextParams.set('tab', tabParamValue)
    const nextQuery = nextParams.toString()
    router.replace(nextQuery ? `/leaves?${nextQuery}` : '/leaves')
  }

  const handleTabChange = (tab: LeaveTab) => {
    setSelectedTab(tab)
    updateUrlQueryForTab(tab)
  }

  // Handle URL parameters for filtering
  useEffect(() => {
    const typeParam = searchParams.get('type')
    const statusParam = searchParams.get('status')
    const tabParam = searchParams.get('tab')
    const openRequestParam = searchParams.get('openRequest')
    const queryTab = getTabFromParam(tabParam)

    if (queryTab) {
      setSelectedTab(queryTab)
    } else if (typeParam || statusParam) {
      setSelectedTab('my-requests')
    }

    if (typeParam || statusParam) {
      setFilters(prev => ({
        ...prev,
        leaveType: typeParam || "",
        status: statusParam || ""
      }))
    }

    if (openRequestParam === 'true' || openRequestParam === '1') {
      setShowForm(true)

      const nextParams = new URLSearchParams(searchParams.toString())
      nextParams.delete('openRequest')
      const nextQuery = nextParams.toString()
      router.replace(nextQuery ? `/leaves?${nextQuery}` : '/leaves')
    }
  }, [searchParams, router])

  // Apply filters to my leaves
  useEffect(() => {
    let filtered = [...leaves]

    if (filters.leaveType && filters.leaveType !== "") {
      filtered = filtered.filter(leave => {
        const displayType = leave.leaveCategory === 'Extra Day Pay' ? 'Extra Day Pay' : leave.leaveType
        return displayType === filters.leaveType
      })
    }

    if (filters.status && filters.status !== "") {
      filtered = filtered.filter(leave => leave.status.toLowerCase() === filters.status.toLowerCase())
    }

    setFilteredMyLeaves(filtered)
  }, [leaves, filters.leaveType, filters.status])

  // Fetch current user and their leaves
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["leave-management"],
    queryFn: () => fetch("/api/leave-management").then((res) => {
      if (!res.ok) {
        if (res.status === 401) {
          router.push("/auth/login")
          throw new Error("Unauthorized")
        }
        throw new Error("Failed to fetch leave data")
      }
      return res.json()
    }),
  })

  useEffect(() => {
    if (data) {
      setCurrentUser(data.currentUser)
      setLeaves(data.leaves || [])
      setPendingApprovals(data.pendingApprovals || [])
    }
  }, [data, setLeaves, setPendingApprovals])

  const { data: searchedEmployeeKpi, isLoading: isLoadingSearchedEmployeeKpi } = useQuery<EmployeeLeaveKpi>({
    queryKey: ["searched-employee-leave-kpi", searchedEmployeeId],
    enabled: Boolean(searchedEmployeeId),
    queryFn: async () => {
      const response = await fetch(`/api/leave-management/employee-kpi?employeeId=${encodeURIComponent(searchedEmployeeId)}`)
      if (!response.ok) {
        throw new Error("Failed to fetch searched employee leave KPI")
      }
      return response.json()
    },
  })

  // Fetch all leaves for HR/Admin
  const fetchAllLeaves = async () => {
    if (currentUser?.role === 'HR' || currentUser?.role === 'Admin') {
      setIsRefreshingAllLeaves(true)
      try {
        const response = await fetch('/api/leave-management/all')
        if (response.ok) {
          const data = await response.json()
          setAllLeaves(data.allLeaves || [])
          // toast.success('All leaves refreshed successfully')
          console.log('All leaves refreshed successfully')
        }
      } catch (error) {
        console.error('Error fetching all leaves:', error)
        toast.error('Failed to refresh all leaves')
      } finally {
        setIsRefreshingAllLeaves(false)
      }
    }
  }

  useEffect(() => {
    fetchAllLeaves()
  }, [currentUser])

  const handleMyRequestsRefresh = async () => {
    setFilters(DEFAULT_LEAVE_FILTERS)
    await refetch()
  }

  const handleAllLeavesRefresh = async () => {
    setFilters(DEFAULT_LEAVE_FILTERS)
    await fetchAllLeaves()
  }

  const isAdminUser = currentUser?.role === 'Admin'
  const canRequestLeave = !isAdminUser
  const canApplyForOthers = currentUser?.role === 'HR' || currentUser?.role === 'Admin'

  const fetchEmployeeOptions = async () => {
    if (!canApplyForOthers) return
    setIsLoadingEmployees(true)
    try {
      const response = await fetch('/api/employees')
      if (!response.ok) {
        throw new Error('Failed to fetch employees')
      }

      const rawEmployees = await response.json()
      const options: EmployeeOption[] = (rawEmployees || [])
        .filter((emp: any) => emp?.Id)
        .map((emp: any) => ({
          id: emp.Id,
          name: emp.Employee_Name__c || emp.Name || 'Unknown',
          email: emp.Company_Email__c || '',
          role: emp.Role__c || '',
          active: emp.Active__c,
        }))
        .filter((emp: EmployeeOption) => emp.active !== false)

      setEmployeeOptions(options)
    } catch (error) {
      console.error('Error fetching employees for apply-for-others:', error)
      toast.error('Failed to fetch employees')
    } finally {
      setIsLoadingEmployees(false)
    }
  }

  const fetchHolidayDates = async () => {
    try {
      const response = await fetch('/api/holidays')
      if (!response.ok) {
        throw new Error('Failed to fetch holidays')
      }

      const data = await response.json()
      const dates = new Set<string>()
        ; (data?.holidays || []).forEach((holiday: any) => {
          if (holiday?.date) {
            dates.add(dayjs(holiday.date).format('YYYY-MM-DD'))
          }
        })
      setHolidayDateSet(dates)
    } catch (error) {
      console.error('Error fetching holidays for apply-for-others:', error)
    }
  }

  const disabledApplyForOthersDate = (current: any) => {
    if (!current) return false
    const isWeekend = current.day() === 0 || current.day() === 6
    const isHoliday = holidayDateSet.has(current.format('YYYY-MM-DD'))
    return isWeekend || isHoliday
  }

  const openApplyForOthersModal = async () => {
    if (!canApplyForOthers) return
    await Promise.all([
      employeeOptions.length === 0 ? fetchEmployeeOptions() : Promise.resolve(),
      holidayDateSet.size === 0 ? fetchHolidayDates() : Promise.resolve(),
    ])
    setShowApplyForOthersForm(true)
  }

  const handleSubmitApplyForOthers = async (values: any) => {
    const start = values.startDate
    const end = values.endDate

    if (!start || !end || start.isAfter(end, 'day')) {
      toast.error('Start date must be on or before end date')
      return
    }

    setIsSubmittingApplyForOthers(true)
    const toastId = toast.loading('Applying leave for employee...')

    try {
      const response = await fetch('/api/leave-management', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          applyForOthers: true,
          employeeId: values.employeeId,
          leaveType: values.leaveType,
          leaveCategory: 'loss-of-pay',
          startDate: start.format('YYYY-MM-DD'),
          endDate: end.format('YYYY-MM-DD'),
          session: 'Full Day',
          reason: values.reason?.trim(),
        }),
      })

      const result = await response.json()
      if (!response.ok) {
        if (result?.code === 'GOOGLE_AUTH_REQUIRED') {
          toast.error(result?.error || 'Please connect Google Workspace to continue.', { id: toastId })
          promptGoogleWorkspaceAuthentication()
          return
        }
        toast.error(result?.error || 'Failed to apply leave for employee', { id: toastId })
        return
      }

      toast.success(result?.message || 'Leave applied and approved successfully', { id: toastId })
      applyForOthersForm.resetFields()
      setShowApplyForOthersForm(false)
      refetch()
      if (canApplyForOthers) {
        fetchAllLeaves()
      }
    } catch (error) {
      console.error('Error applying leave for others:', error)
      toast.error('Failed to apply leave for employee', { id: toastId })
    } finally {
      setIsSubmittingApplyForOthers(false)
    }
  }

  // Apply filters
  useEffect(() => {
    let filtered = [...allLeaves]

    if (filters.status && filters.status !== "") {
      filtered = filtered.filter(leave => leave.status === filters.status)
    }

    if (filters.leaveType && filters.leaveType !== "") {
      filtered = filtered.filter(leave => {
        const displayType = leave.leaveCategory === 'Extra Day Pay' ? 'Extra Day Pay' : leave.leaveType
        return displayType === filters.leaveType
      })
    }

    if (filters.employeeName) {
      filtered = filtered.filter(leave =>
        leave.employeeName.toLowerCase().includes(filters.employeeName.toLowerCase())
      )
    }

    if (filters.dateRange[0] && filters.dateRange[1]) {
      filtered = filtered.filter(leave => {
        const startDate = new Date(leave.startDate)
        const filterStart = new Date(filters.dateRange[0])
        const filterEnd = new Date(filters.dateRange[1])
        filterEnd.setHours(23, 59, 59, 999)
        return startDate >= filterStart && startDate <= filterEnd
      })
    }

    setFilteredLeaves(filtered)
  }, [allLeaves, filters])

  const handleSubmitRequest = async (data: Partial<LeaveRequest>) => {
    const submit = async (payload: Partial<LeaveRequest>, confirmedRules = false): Promise<void> => {
      const toastId = toast.loading("Submitting leave request...")
      try {
        console.log("Submitting leave request data:", payload, "confirmedRules:", confirmedRules)
        const response = await fetch("/api/leave-management", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ...payload, confirmedRules }),
        })

        const result = await response.json()

        if (response.status === 409 && result?.requiresMerge) {
          toast.dismiss(toastId)
          const details = result.details || {}
          const gapDates: string[] = details.nonWorkingDaysBetween || details.gapDates || []
          const suggested = details.suggestedDates || {}

          Modal.confirm({
            title: 'Merge with existing leave',
            width: 700,
            content: (
              <div className="space-y-3">
                <p className="text-gray-700">We found an existing leave that will be merged with this request and re-submitted for approval.</p>
                <div className="bg-blue-50 p-3 rounded border border-blue-200">
                  <div className="font-medium text-blue-900">Existing leave</div>
                  <div className="text-sm text-blue-800">{details?.existingLeave?.startDate} → {details?.existingLeave?.endDate} ({details?.existingLeave?.status})</div>
                </div>
                {gapDates.length > 0 && (
                  <div className="bg-amber-50 p-3 rounded border border-amber-200 text-sm text-amber-900">
                    Non-working gap between leaves: {gapDates.join(', ')}
                  </div>
                )}
                <div className="bg-green-50 p-3 rounded border border-green-200 text-sm text-green-900">
                  <div className="font-medium text-green-900">New merged dates</div>
                  <div>{suggested.startDate} → {suggested.endDate}</div>
                </div>
              </div>
            ),
            okText: 'Merge & Resubmit',
            cancelText: 'Cancel',
            onOk: async () => {
              await submit({ ...payload, confirmMerge: true, mergeExistingLeaveId: details.existingLeaveId }, confirmedRules)
            },
            onCancel: () => {
              setIsSubmittingLeaveRequest(false)
            },
          })
          return
        }

        if (response.status === 409 && result?.requiresConfirmation) {
          toast.dismiss(toastId)
          const details = result.details || {}

          // Format dates for display
          const formatDate = (dateStr: string) => {
            if (!dateStr) return '-';
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
          };

          Modal.confirm({
            title: 'Leave Rules Applied',
            width: 700,
            content: (
              <div className="space-y-3">
                <p className="text-gray-700 mb-4">Additional rules have been applied to your leave request. Please review:</p>

                {/* Effective Leave Period - Show when sandwich is applied */}
                {details.sandwichApplied && details.effectiveStartDate && details.effectiveEndDate && (
                  <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 mb-3">
                    <div className="font-medium text-amber-800 mb-2">📅 Your Effective Leave Period:</div>
                    <div className="text-sm text-amber-700">
                      <div>You requested: <span className="font-semibold">{formatDate(details.requestedStartDate)}</span> to <span className="font-semibold">{formatDate(details.requestedEndDate)}</span></div>
                      <div className="mt-1">Due to sandwich rule, your leave will be counted from: <span className="font-bold text-amber-900">{formatDate(details.effectiveStartDate)}</span> to <span className="font-bold text-amber-900">{formatDate(details.effectiveEndDate)}</span></div>
                    </div>
                  </div>
                )}

                <div className="bg-blue-50 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="font-medium">Original working days requested:</span>
                    <span className="font-semibold text-blue-600">{details.rangeLeaveDays ?? payload.duration ?? "-"}</span>
                  </div>
                  {details.sandwichApplied && (
                    <>
                      {(details.sameRequestSandwichDays ?? details.sandwichExtra ?? 0) > 0 && (
                        <div className="flex justify-between text-orange-700">
                          <span className="font-medium">+ Sandwich days (Non-working days):</span>
                          <span className="font-semibold">{details.sameRequestSandwichDays ?? details.sandwichExtra}</span>
                        </div>
                      )}
                      {details.sameRequestSandwichDatesList?.length > 0 && (
                        <div className="text-xs text-orange-600 pl-4">
                          Dates: {details.sameRequestSandwichDatesList.map((d: string) => formatDate(d)).join(', ')}
                        </div>
                      )}
                    </>
                  )}
                  {(details.onePlusTwoExtra ?? 0) > 0 && (
                    <div className="flex justify-between text-red-700">
                      <span className="font-medium">+ One+Two penalty days:</span>
                      <span className="font-semibold">{details.onePlusTwoExtra}</span>
                    </div>
                  )}
                  <div className="border-t border-blue-200 pt-2 mt-2 flex justify-between">
                    <span className="font-bold">Total deduction:</span>
                    <span className="font-bold text-lg text-blue-700">{details.finalTotalAfterRules ?? "-"} days</span>
                  </div>
                </div>
                <div className="text-sm bg-gray-50 p-3 rounded border border-gray-200">
                  <div className="font-medium mb-1">Rules Applied:</div>
                  {details.sameRequestSandwich && (
                    <div>• Same-request sandwich: ✅ Applied - holidays/weekends adjacent to your leave counted</div>
                  )}
                  {!details.sameRequestSandwich && details.sandwichApplied && (
                    <div>• Sandwich rule: ✅ Applied - holidays/weekends between leave days counted</div>
                  )}
                  {!details.sandwichApplied && (
                    <div>• Sandwich rule: ❌ Not applied</div>
                  )}
                  <div>• One+Two penalty: {details.onePlusTwoRuleApplied ? "✅ Applied - less than 5 working days notice" : "❌ Not applied"}</div>
                </div>
              </div>
            ),
            okText: 'Confirm & Submit',
            cancelText: 'Cancel',
            onOk: async () => {
              await submit(payload, true)
            },
            onCancel: () => {
              setIsSubmittingLeaveRequest(false)
            },
          })
          return
        }

        if (!response.ok) {
          if (result?.code === 'GOOGLE_AUTH_REQUIRED') {
            toast.error(result?.error || 'Please connect Google Workspace to continue.', { id: toastId, duration: 6000 })
            promptGoogleWorkspaceAuthentication()
            setIsSubmittingLeaveRequest(false)
            return
          }
          // Check if there's a detailed message from the backend (e.g., duplicate leave)
          const errorMessage = result?.details?.message || result?.error || "Failed to submit leave request"
          toast.error(errorMessage, { id: toastId, duration: 6000 })
          setIsSubmittingLeaveRequest(false)
          return
        }

        // Refetch the leaves to get the updated list
        refetch()
        setShowForm(false)
        setIsSubmittingLeaveRequest(false)

        if (result?.totals) {
          const t = result.totals
          toast.success(
            <div className="space-y-1">
              <div className="font-semibold">Leave request submitted successfully! 🎉</div>
              <div className="text-sm text-gray-600">
                Total days: {t.finalTotalAfterRules} {t.sandwichApplied || t.onePlusTwoRuleApplied ? "(with penalties)" : ""}
              </div>
            </div>,
            { id: toastId, duration: 5000 }
          )
        } else {
          toast.success("Leave request submitted successfully! 🎉", { id: toastId })
        }
      } catch (error) {
        console.error("Error submitting leave request:", error)
        toast.error("Failed to submit leave request. Please try again.", { id: toastId })
        setIsSubmittingLeaveRequest(false)
      }
    }

    await submit(data)
  }

  const handleWithdraw = async (leaveId: string) => {
    const leave = leaves.find((l) => l.id === leaveId)
    if (!leave) return

    let selectedWithdrawalStart = leave.startDate
    let selectedWithdrawalEnd = leave.endDate
    const isSingleDayLeave = leave.startDate === leave.endDate

    Modal.confirm({
      title: 'Withdraw Approved Leave',
      content: (
        <div>
          <p className="text-orange-600 font-medium mb-3">⚠️ You are about to withdraw an approved leave!</p>
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
            <div className="text-sm space-y-1">
              <div><strong>Type:</strong> {leave.leaveType || leave.leaveCategory}</div>
              <div><strong>Dates:</strong> {leave.startDate} to {leave.endDate}</div>
              <div><strong>Duration:</strong> {leave.duration} day(s)</div>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm font-medium mb-2">Withdrawal Date Range</p>
            <DatePicker.RangePicker
              className="w-full"
              allowClear={false}
              disabled={isSingleDayLeave}
              defaultValue={[dayjs(leave.startDate), dayjs(leave.endDate)]}
              minDate={dayjs(leave.startDate)}
              maxDate={dayjs(leave.endDate)}
              onChange={(value) => {
                if (value && value[0] && value[1]) {
                  selectedWithdrawalStart = value[0].format('YYYY-MM-DD')
                  selectedWithdrawalEnd = value[1].format('YYYY-MM-DD')
                }
              }}
            />
            <p className="text-xs text-gray-600 mt-2">
              {isSingleDayLeave
                ? 'Single-day leave will be fully withdrawn.'
                : 'Pick full range for complete withdrawal, or a subset for partial withdrawal.'}
            </p>
          </div>
          <p className="mt-3 text-sm text-gray-600">Leave Withdraw Request Submitted to HR.</p>
        </div>
      ),
      okText: 'Yes, Withdraw',
      cancelText: 'Cancel',
      okButtonProps: { danger: true },
      onOk: async () => {
        const toastId = toast.loading("Withdrawing leave...")
        try {
          const response = await fetch("/api/leave-management", {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              leaveId,
              action: "withdraw",
              withdrawalStartDate: selectedWithdrawalStart,
              withdrawalEndDate: selectedWithdrawalEnd,
            }),
          })

          if (!response.ok) {
            const error = await response.json()
            toast.error(error.error || "Failed to withdraw leave", { id: toastId })
            return
          }

          const data = await response.json()

          // Update local state
          updateLeave({
            ...leave,
            status: data.status || "withdrawal pending",
            isWithdrawalRequest: true
          })
          toast.success(data.message || "Withdrawal request submitted. Awaiting HR approval.", { id: toastId })
        } catch (error) {
          console.error("Error withdrawing leave:", error)
          toast.error("Failed to withdraw leave. Please try again.", { id: toastId })
        }
      },
    })
  }

  const approveLeaveRequest = async (
    targetLeaveId: string,
    ruleOptions: { applySandwichRule: boolean; applyOnePlusTwoRule: boolean }
  ) => {
    const toastId = toast.loading("Approving leave request...")
    const isHrOrAdmin = currentUser?.role === 'HR' || currentUser?.role === 'Admin'
    try {
      const response = await fetch("/api/leave-management", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          leaveId: targetLeaveId,
          action: "approve",
          applySandwichRule: ruleOptions.applySandwichRule,
          applyOnePlusTwoRule: ruleOptions.applyOnePlusTwoRule,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        toast.error(error.error || "Failed to approve leave", { id: toastId })
        return
      }

      refetch()
      toast.success("Leave approved successfully!",{ id: toastId, duration: 4000 })
    } catch (error) {
      console.error("Error approving leave:", error)
      toast.error("Failed to approve leave. Please try again.", { id: toastId })
    }
  }

  const markLeaveAsDoubtful = async (targetLeaveId: string) => {
    const toastId = toast.loading("Marking leave as doubtful case...")

    try {
      const response = await fetch("/api/leave-management", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          leaveId: targetLeaveId,
          action: "mark_doubtful_case",
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        toast.error(error.error || "Failed to mark doubtful case", { id: toastId })
        return false
      }

      refetch()
      toast.success("Leave marked as doubtful case.", { id: toastId, duration: 4000 })
      return true
    } catch (error) {
      console.error("Error marking doubtful case:", error)
      toast.error("Failed to mark doubtful case. Please try again.", { id: toastId })
      return false
    }
  }

  const handleApprove = async (leaveId: string) => {
    const leave = pendingApprovals.find((l) => l.id === leaveId)
    const isAdmin = currentUser?.role === 'Admin'
    const isHR = currentUser?.role === 'HR'
    const shouldShowRulesPopup =
      isAdmin &&
      leave?.leaveType === 'Planned Leave' &&
      (leave?.sandwichRuleApplicable === true || leave?.onePlusTwoRuleApplicable === true)

    let confirmModalRef: { destroy: () => void } | null = null

    const handleMarkDoubtfulCaseClick = async () => {
      if (!leave?.id) return
      const success = await markLeaveAsDoubtful(leave.id)
      if (success) {
        confirmModalRef?.destroy()
      }
    }

    confirmModalRef = Modal.confirm({
      title: 'Approve Leave Request',
      content: leave ? (
        <div>
          <p className="mb-3">Are you sure you want to approve this leave request?</p>
          <div className="p-3 bg-green-50 border border-green-200 rounded">
            <div className="text-sm space-y-1">
              <div><strong>Employee:</strong> {leave.employeeName}</div>
              <div><strong>Type:</strong> {leave.leaveType || leave.leaveCategory}</div>
              <div><strong>Dates:</strong> {leave.startDate} to {leave.endDate}</div>
              <div><strong>Duration:</strong> {leave.duration} day(s)</div>
              {leave.reason && (
                <div className="mt-2 pt-2 border-t border-green-300">
                  <strong>Reason:</strong>
                  <p className="mt-1 text-gray-700">{leave.reason}</p>
                </div>
              )}
            </div>
          </div>
          <p className="mt-3 text-sm text-green-700">✓ Email notification will be sent to the employee</p>
          {isHR && (
            <div className="mt-4 pt-3 border-t border-amber-200">
              <Button
                danger
                type="default"
                onClick={handleMarkDoubtfulCaseClick}
              >
                Mark as Doubtful Case
              </Button>
            </div>
          )}
        </div>
      ) : 'Are you sure you want to approve this leave request?',
      okText: 'Approve',
      cancelText: 'Cancel',
      okButtonProps: { style: { backgroundColor: '#10b981' } },
      onOk: async () => {
        if (shouldShowRulesPopup) {
          setRuleChoiceLeave(leave || null)
          setApplySandwichSelection(leave?.sandwichRuleApplicable === true)
          setApplyOnePlusTwoSelection(leave?.onePlusTwoRuleApplicable === true)
          setRuleChoiceModalVisible(true)
          return
        }

        const shouldAutoApplyRulesForHr = currentUser?.role === 'HR'

        await approveLeaveRequest(leaveId, {
          applySandwichRule: shouldAutoApplyRulesForHr ? leave?.sandwichRuleApplicable === true : false,
          applyOnePlusTwoRule: shouldAutoApplyRulesForHr ? leave?.onePlusTwoRuleApplicable === true : false,
        })
      },
    })
  }

  const closeRuleChoiceModal = () => {
    if (isApprovingRuleChoice) return
    setRuleChoiceModalVisible(false)
    setRuleChoiceLeave(null)
    setApplySandwichSelection(false)
    setApplyOnePlusTwoSelection(false)
  }

  const handleApproveFromRuleChoice = async () => {
    if (!ruleChoiceLeave?.id || isApprovingRuleChoice) return

    setIsApprovingRuleChoice(true)
    try {
      await approveLeaveRequest(ruleChoiceLeave.id, {
        applySandwichRule: ruleChoiceLeave.sandwichRuleApplicable === true ? applySandwichSelection : false,
        applyOnePlusTwoRule: ruleChoiceLeave.onePlusTwoRuleApplicable === true ? applyOnePlusTwoSelection : false,
      })
      setRuleChoiceModalVisible(false)
      setRuleChoiceLeave(null)
      setApplySandwichSelection(false)
      setApplyOnePlusTwoSelection(false)
    } finally {
      setIsApprovingRuleChoice(false)
    }
  }

  const handleReject = async (leaveId: string, reason: string) => {
    const toastId = toast.loading("Rejecting leave request...")
    try {
      const response = await fetch("/api/leave-management", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          leaveId,
          action: "reject",
          reason,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        toast.error(error.error || "Failed to reject leave", { id: toastId })
        return
      }

      // Refetch to update the list
      refetch()
      toast.success("Leave rejected. ✉️ Email notification sent to employee.", { id: toastId, duration: 4000 })
    } catch (error) {
      console.error("Error rejecting leave:", error)
      toast.error("Failed to reject leave. Please try again.", { id: toastId })
    }
  }

  const handleApproveWithdrawal = async (leaveId: string) => {
    const leave = pendingApprovals.find((l) => l.id === leaveId)

    Modal.confirm({
      title: 'Approve Withdrawal Request',
      content: leave ? (
        <div>
          <p className="mb-3">Are you sure you want to approve this withdrawal request?</p>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded">
            <div className="text-sm space-y-1">
              <div><strong>Employee:</strong> {leave.employeeName}</div>
              <div><strong>Dates:</strong> {leave.startDate} to {leave.endDate}</div>
              {leave.withdrawalStartDate && leave.withdrawalEndDate && (
                <div><strong>Requested Withdrawal:</strong> {leave.withdrawalStartDate} to {leave.withdrawalEndDate}</div>
              )}
              <div><strong>Duration:</strong> {leave.duration} day(s)</div>
            </div>
          </div>
          <p className="mt-3 text-sm text-amber-700">⚠️ The leave will be withdrawn and leave balance will be restored.</p>
        </div>
      ) : 'Are you sure you want to approve this withdrawal request?',
      okText: 'Approve Withdrawal',
      cancelText: 'Cancel',
      okButtonProps: { style: { backgroundColor: '#f59e0b' } },
      onOk: async () => {
        const toastId = toast.loading("Approving withdrawal request...")
        try {
          const response = await fetch("/api/leave-management", {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              leaveId,
              action: "approve_withdrawal",
            }),
          })

          if (!response.ok) {
            const error = await response.json()
            toast.error(error.error || "Failed to approve withdrawal", { id: toastId })
            return
          }

          refetch()
          toast.success("Withdrawal approved successfully! ✅ Leave balance restored.", { id: toastId, duration: 4000 })
        } catch (error) {
          console.error("Error approving withdrawal:", error)
          toast.error("Failed to approve withdrawal. Please try again.", { id: toastId })
        }
      },
    })
  }

  const handleRejectWithdrawal = async (leaveId: string, reason: string) => {
    const toastId = toast.loading("Rejecting withdrawal request...")
    try {
      const response = await fetch("/api/leave-management", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          leaveId,
          action: "reject_withdrawal",
          reason,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        toast.error(error.error || "Failed to reject withdrawal", { id: toastId })
        return
      }

      refetch()
      toast.success("Withdrawal rejected. ✉️ Leave remains approved.", { id: toastId, duration: 4000 })
    } catch (error) {
      console.error("Error rejecting withdrawal:", error)
      toast.error("Failed to reject withdrawal. Please try again.", { id: toastId })
    }
  }

  const [isWithdrawalRejection, setIsWithdrawalRejection] = useState(false)

  const openRejectModal = (leaveId: string, isWithdrawal = false) => {
    setRejectingLeaveId(leaveId)
    setRejectReason("")
    setIsWithdrawalRejection(isWithdrawal)
    setRejectModalVisible(true)
  }

  const handleRejectConfirm = async () => {
    if (!rejectReason.trim()) {
      toast.error("Please provide a reason for rejection")
      return
    }

    if (rejectReason.trim().length < 10) {
      toast.error("Please provide a more detailed reason (minimum 10 characters)")
      return
    }

    if (rejectingLeaveId) {
      if (isWithdrawalRejection) {
        await handleRejectWithdrawal(rejectingLeaveId, rejectReason)
      } else {
        await handleReject(rejectingLeaveId, rejectReason)
      }
      setRejectModalVisible(false)
      setRejectingLeaveId(null)
      setRejectReason("")
    }
  }

  if (isLoading) {
    return (
      <PageContainer>
        {/* <div className="flex justify-center items-center h-64">
           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div> */}
        <div className="flex justify-center items-center py-12">
          <Spin size="large" />
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <div className="bg-white p-2 rounded-xl">
        <PageHeader
          title="Leave Management"
          subtitle="Manage leave requests and approvals"
        >
          <div className="flex items-center gap-2">
            {canRequestLeave && (
              <Button
                type='primary'
                size="large"
                onClick={() => setShowForm(true)}
                icon={<Plus size={16} />}
              >
                Request Leave
              </Button>
            )}
            {canApplyForOthers && (
              <Button
                size="large"
                onClick={openApplyForOthersModal}
                loading={isLoadingEmployees}
              >
                + On Behalf
              </Button>
            )}
          </div>
        </PageHeader>

        <div className="bg-card rounded-xl shadow-sm border border-border mb-6 overflow-hidden">
          <div className="flex border-b border-border">
            {(currentUser?.role === 'HR' || currentUser?.role === 'Admin' || currentUser?.title === 'Team Lead') && (
              <button
                onClick={() => handleTabChange("my-requests")}
                className={`flex-1 px-6 py-4 text-center font-medium transition ${selectedTab === "my-requests"
                  ? "text-primary border-b-2 border-primary bg-primary/5"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
              >
                My Requests
              </button>
            )}
            {(currentUser?.role === 'HR' || currentUser?.role === 'Admin' || currentUser?.title === 'Team Lead') && (
              <button
                onClick={() => handleTabChange("approvals")}
                className={`flex-1 px-6 py-4 text-center font-medium transition ${selectedTab === "approvals"
                  ? "text-primary border-b-2 border-primary bg-primary/5"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
              >
                Approvals
              </button>
            )}
            {(currentUser?.role === 'HR' || currentUser?.role === 'Admin') && (
              <button
                onClick={() => handleTabChange("all-leaves")}
                className={`flex-1 px-6 py-4 text-center font-medium transition ${selectedTab === "all-leaves"
                  ? "text-primary border-b-2 border-primary bg-primary/5"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
              >
                All Leaves
              </button>
            )}
          </div>

          <div className="p-6">
            {selectedTab === "my-requests" && (
              <div className="space-y-5">
                {/* Header + Filters */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">My Leave Requests</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      Track and manage your leave applications
                    </p>
                  </div>

                  {/* Filters & Refresh - Stacks nicely on mobile */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <RefreshButton
                      onClick={handleMyRequestsRefresh}
                      loading={isLoading}
                      size="large"
                      label=""
                      className="h-10 w-10 p-0 flex-shrink-0"
                    />

                    <Select
                      placeholder="Filter by Leave Type"
                      style={{ width: '100%', minWidth: 180 }}
                      value={filters.leaveType || ALL_LEAVE_TYPE_VALUE}
                      onChange={(value) =>
                        setFilters({
                          ...filters,
                          leaveType: value === ALL_LEAVE_TYPE_VALUE || value === undefined ? "" : value,
                        })
                      }
                      allowClear
                    >
                      <Select.Option value={ALL_LEAVE_TYPE_VALUE}>All Leave Types</Select.Option>
                      <Select.Option value="Sick Leave">Sick Leave</Select.Option>
                      <Select.Option value="Emergency Leave">Emergency Leave</Select.Option>
                      <Select.Option value="Planned Leave">Planned Leave</Select.Option>
                      <Select.Option value="Extra Day Pay">Extra Day Pay</Select.Option>
                    </Select>

                    <Select
                      placeholder="Filter by Status"
                      style={{ width: '100%', minWidth: 160 }}
                      value={filters.status || ALL_STATUS_VALUE}
                      onChange={(value) =>
                        setFilters({
                          ...filters,
                          status: value === ALL_STATUS_VALUE || value === undefined ? "" : value,
                        })
                      }
                      allowClear
                    >
                      <Select.Option value={ALL_STATUS_VALUE}>All Status</Select.Option>
                      <Select.Option value="applied">Applied</Select.Option>
                      <Select.Option value="approved">Approved</Select.Option>
                      <Select.Option value="rejected">Rejected</Select.Option>
                      <Select.Option value="cancelled">Cancelled</Select.Option>
                      <Select.Option value="Withdrawn">Withdrawn</Select.Option>
                      <Select.Option value="Withdrawal Pending">Withdrawal Pending</Select.Option>
                    </Select>
                  </div>
                </div>

                {/* Leave Table / Cards */}
                <LeaveTable
                  leaves={filteredMyLeaves}
                  onWithdraw={handleWithdraw}
                  onViewDetails={handleViewLeaveDetails}
                />
              </div>
            )}

            {selectedTab === "approvals" && (
              <div>
                <div className="flex items-center justify-between gap-2 mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Pending Approvals</h2>
                  <RefreshButton onClick={refetch} loading={isLoading} size="large" label="" className="h-10 w-10 p-0" />
                </div>
                {(currentUser?.role === 'HR' || currentUser?.role === 'Admin' || (currentUser?.role === 'Developer' && currentUser?.title === 'Team Lead')) ? (
                  pendingApprovals.length > 0 ? (
                    <div className="space-y-4">
                      {pendingApprovals.map((leave) => {
                        console.log("Pending Approval Leave:", leave)
                        const isTeamLead = currentUser?.role === 'Developer' && currentUser?.title === 'Team Lead'
                        const isHR = currentUser?.role === 'HR'
                        const isAdmin = currentUser?.role === 'Admin'
                        const isDoubtfulCase = leave.doubtfullCase === true
                        const tlApproved = leave.tlApproved === 'Approved'
                        const tlRejected = leave.tlApproved === 'Rejected'
                        const hrApproved = leave.hrApproval === 'Approved'
                        const hrRejected = leave.hrApproval === 'Rejected'
                        const hasRequestedWithdrawalRange = Boolean(
                          leave.isWithdrawalRequest && leave.withdrawalStartDate && leave.withdrawalEndDate
                        )
                        const displayStartDate = hasRequestedWithdrawalRange ? leave.withdrawalStartDate! : leave.startDate
                        const displayEndDate = hasRequestedWithdrawalRange ? leave.withdrawalEndDate! : leave.endDate
                        const displayDuration = hasRequestedWithdrawalRange
                          ? dayjs(displayEndDate).diff(dayjs(displayStartDate), 'day') + 1
                          : leave.duration
                        const isHalfDaySession = leave.sessionStart && leave.sessionEnd
                          ? leave.sessionStart === leave.sessionEnd && (leave.sessionStart === 'Session-1' || leave.sessionStart === 'Session-2')
                          : leave.session === 'Session-1' || leave.session === 'Session-2'
                        const startSessionLabel = leave.sessionStart === 'Session-1' ? 'Session 1' : leave.sessionStart === 'Session-2' ? 'Session 2' : leave.sessionStart
                        const endSessionLabel = leave.sessionEnd === 'Session-1' ? 'Session 1' : leave.sessionEnd === 'Session-2' ? 'Session 2' : leave.sessionEnd
                        const sessionLabel = leave.sessionStart && leave.sessionEnd
                          ? leave.sessionStart === leave.sessionEnd
                            ? startSessionLabel
                            : `${startSessionLabel} → ${endSessionLabel}`
                          : leave.session === 'Session-1' ? 'Session 1' : leave.session === 'Session-2' ? 'Session 2' : leave.session
                        // For withdrawal requests, always show action buttons regardless of previous approval status
                        const alreadyActioned = leave.isWithdrawalRequest ? false : (isTeamLead ? (tlApproved || tlRejected) : (hrApproved || hrRejected))

                        return (
                          <div
                            key={leave.id}
                            className={`bg-gradient-to-r border rounded-lg hover:shadow-md transition-all ${
                              isAdmin && isDoubtfulCase
                                ? 'from-red-50 to-orange-50 border-red-300 hover:border-red-400'
                                : 'from-slate-50 to-blue-50 border-gray-200 hover:border-blue-300'
                            }`}
                          >
                            <div className="p-5">
                              {/* Header */}
                              <div className="flex flex-col md:flex-row sm:flex-row gap-2 items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm">
                                    {leave.employeeName.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <h3 className="text-base font-semibold text-gray-900">{leave.employeeName}</h3>
                                    <p className="text-xs text-gray-500">ID: {leave.employeeId}</p>
                                  </div>
                                  <span className={`px-4 py-2 rounded-full text-xs font-medium border ${leave.isWithdrawalRequest
                                    ? 'bg-orange-100 text-orange-700 border-orange-200'
                                    : 'bg-amber-100 text-amber-700 border-amber-200'
                                    }`}>
                                    {leave.isWithdrawalRequest ? 'Withdrawal Pending' : leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
                                  </span>
                                  {isAdmin && isDoubtfulCase && (
                                    <span className="px-4 py-2 rounded-full text-xs font-semibold border bg-red-100 text-red-700 border-red-200">
                                      Doubtful Case
                                    </span>
                                  )}
                                </div>

                                {/* Action Buttons */}
                                {leave.isWithdrawalRequest ? (
                                  // Withdrawal request buttons - always show for withdrawal requests
                                  <div className="flex gap-3">
                                    <button
                                      onClick={() => handleApproveWithdrawal(leave.id)}
                                      className="flex-1 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                                    >
                                      Approve
                                    </button>
                                    <button
                                      onClick={() => openRejectModal(leave.id, true)}
                                      className="flex-1 bg-white hover:bg-gray-50 text-red-600 px-4 py-2 rounded-md text-sm font-medium border border-red-200 transition-colors"
                                    >
                                      Reject
                                    </button>
                                  </div>
                                ) : !alreadyActioned ? (
                                  // Regular approval buttons
                                  <div className="flex gap-3">
                                    <button
                                      onClick={() => handleApprove(leave.id)}
                                      className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                                    >
                                      Approve
                                    </button>
                                    <button
                                      onClick={() => openRejectModal(leave.id, false)}
                                      className="flex-1 bg-white hover:bg-gray-50 text-red-600 px-4 py-2 rounded-md text-sm font-medium border border-red-200 transition-colors"
                                    >
                                      Reject
                                    </button>
                                  </div>
                                ) : (
                                  <div className={`rounded-md p-3 text-center text-sm ${(tlApproved || hrApproved)
                                    ? 'bg-green-50 text-green-700'
                                    : 'bg-red-50 text-red-700'
                                    }`}>
                                    {isTeamLead
                                      ? `You have ${tlApproved ? 'approved' : 'rejected'} this request. Awaiting HR review.`
                                      : `You have ${hrApproved ? 'approved' : 'rejected'} this leave request.`
                                    }
                                  </div>
                                )}
                              </div>

                              {/* Details Grid */}
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                                <div className="bg-white/70 rounded-md p-3 border border-gray-100">
                                  <p className="text-xs text-gray-500 mb-1">Leave Type</p>
                                  <p className="text-sm font-medium text-gray-900 capitalize">{leave.leaveType || leave.leaveCategory}</p>
                                </div>
                                <div className="bg-white/70 rounded-md p-3 border border-gray-100">
                                  <p className="text-xs text-gray-500 mb-1">
                                    {hasRequestedWithdrawalRange ? 'Requested Duration' : 'Duration'}
                                  </p>
                                  <p className="text-sm font-medium text-gray-900">{displayDuration} {displayDuration === 1 ? 'Day' : 'Days'}</p>
                                  {!hasRequestedWithdrawalRange && isHalfDaySession && (
                                    <p className="text-xs text-gray-500 mt-1">{sessionLabel}</p>
                                  )}
                                  {hasRequestedWithdrawalRange && (
                                    <p className="text-xs text-gray-500 mt-1">Original: {leave.duration} {leave.duration === 1 ? 'Day' : 'Days'}</p>
                                  )}
                                </div>
                                <div className="bg-white/70 rounded-md p-3 border border-gray-100">
                                  <p className="text-xs text-gray-500 mb-1">
                                    {hasRequestedWithdrawalRange ? 'Requested Start Date' : 'Start Date'}
                                  </p>
                                  <p className="text-sm font-medium text-gray-900">{new Date(displayStartDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                                  {hasRequestedWithdrawalRange && (
                                    <p className="text-xs text-gray-500 mt-1">Original: {new Date(leave.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                                  )}
                                </div>
                                <div className="bg-white/70 rounded-md p-3 border border-gray-100">
                                  <p className="text-xs text-gray-500 mb-1">
                                    {hasRequestedWithdrawalRange ? 'Requested End Date' : 'End Date'}
                                  </p>
                                  <p className="text-sm font-medium text-gray-900">{new Date(displayEndDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                                  {hasRequestedWithdrawalRange && (
                                    <p className="text-xs text-gray-500 mt-1">Original: {new Date(leave.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                                  )}
                                </div>
                              </div>

                              {/* Leave Reason */}
                              {leave.reason && (
                                <div className="mb-4">
                                  <div className="bg-white/70 rounded-md p-3 border border-gray-100">
                                    <p className="text-xs text-gray-500 mb-2 font-medium">Leave Reason</p>
                                    <p className="text-sm text-gray-900">{leave.reason}</p>
                                  </div>
                                </div>
                              )}

                              {/* Approval Status */}
                              {(leave.tlApproved || leave.hrApproval) && (
                                <div className="flex items-center gap-4 mb-4 text-sm bg-white/70 rounded-md p-3 border border-gray-100">
                                  {leave.tlApproved && (
                                    <div className="flex items-center gap-2">
                                      <span className="text-gray-500">Team Lead: {leave.teamLeadName}</span>
                                      <span className={`font-medium px-2 py-0.5 rounded ${leave.tlApproved === 'Approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {leave.tlApproved}
                                      </span>
                                    </div>
                                  )}
                                  {leave.hrApproval && (
                                    <div className="flex items-center gap-2">
                                      <span className="text-gray-500">HR:</span>
                                      <span className={`font-medium px-2 py-0.5 rounded ${leave.hrApproval === 'Approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {leave.hrApproval}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}


                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">No pending approvals</div>
                  )
                ) : (
                  <div className="text-center py-8 text-gray-500">Only HR, Admin, and Team Leads can view pending approvals</div>
                )}
              </div>
            )}

            {selectedTab === "all-leaves" && (
              <div>
                <div className="flex items-center justify-between gap-2 mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">All Leave Records</h2>
                  <RefreshButton onClick={handleAllLeavesRefresh} loading={isRefreshingAllLeaves} size="large" label="" className="h-10 w-10 p-0" />
                </div>

                {/* Filters */}
                <Card className="rounded-xl shadow-sm border-border bg-card text-card-foreground mb-6" bodyStyle={{ padding: '16px' }}>
                  <Row gutter={[16, 16]}>

                    <Col xs={24} md={6}>
                      <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                        Employee Name
                      </label>
                      <Input
                        prefix={<SearchOutlined className="text-muted-foreground" />}
                        value={filters.employeeName}
                        onChange={(e) => setFilters({ ...filters, employeeName: e.target.value })}
                        placeholder="Search by name..."
                        allowClear
                        size="large"
                        className="rounded-lg"
                      />
                    </Col>

                    <Col xs={24} md={6}>
                      <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                        Leave Type
                      </label>
                      <Select
                        value={filters.leaveType || ALL_LEAVE_TYPE_VALUE}
                        onChange={(value) =>
                          setFilters({
                            ...filters,
                            leaveType: value === ALL_LEAVE_TYPE_VALUE || value === undefined ? "" : value,
                          })
                        }
                        placeholder="All Types"
                        allowClear
                        style={{ width: '100%' }}
                        size="large"
                        className="rounded-lg"
                      >
                        <Select.Option value={ALL_LEAVE_TYPE_VALUE}>All Types</Select.Option>
                        <Select.Option value="Planned Leave">Planned Leave</Select.Option>
                        <Select.Option value="Sick Leave">Sick Leave</Select.Option>
                        <Select.Option value="Emergency Leave">Emergency Leave</Select.Option>
                        <Select.Option value="Extra Day Pay">Extra Day Pay</Select.Option>
                      </Select>
                    </Col>

                    <Col xs={24} md={6}>
                      <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                        Status
                      </label>
                      <Select
                        value={filters.status || ALL_STATUS_VALUE}
                        onChange={(value) =>
                          setFilters({
                            ...filters,
                            status: value === ALL_STATUS_VALUE || value === undefined ? "" : value,
                          })
                        }
                        placeholder="All Status"
                        allowClear
                        style={{ width: '100%' }}
                        size="large"
                        className="rounded-lg"
                      >
                        <Select.Option value={ALL_STATUS_VALUE}>All Status</Select.Option>
                        <Select.Option value="applied">Applied</Select.Option>
                        <Select.Option value="approved">Approved</Select.Option>
                        <Select.Option value="rejected">Rejected</Select.Option>
                        <Select.Option value="cancelled">Cancelled</Select.Option>
                        <Select.Option value="withdrawn">Withdrawn</Select.Option>
                      </Select>
                    </Col>
                    <Col xs={24} md={6}>
                      <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                        Date Range
                      </label>
                      <DatePicker.RangePicker
                        value={filters.dateRange[0] && filters.dateRange[1] ? [dayjs(filters.dateRange[0]), dayjs(filters.dateRange[1])] : null}
                        onChange={(dates) => {
                          setFilters({
                            ...filters,
                            dateRange: dates ? [dates[0]?.toDate(), dates[1]?.toDate()] : [null, null]
                          });
                        }}
                        className="w-full"
                        placeholder={['Start Date', 'End Date']}
                        format="DD/MM/YYYY"
                        size="large"
                      />
                    </Col>

                  </Row>

                  {/* <div className="mt-3">
                  <span className="text-sm text-gray-600">
                    Showing {filteredLeaves.length} of {allLeaves.length} records
                  </span>
                </div> */}
                </Card>

                {searchedEmployeeId && (
                  <Card className="rounded-xl shadow-sm border-border bg-card text-card-foreground mb-6" bodyStyle={{ padding: '16px' }}>
                    <div className="mb-3">
                      <h3 className="text-base font-semibold text-gray-900">Leave KPI{searchedEmployeeName ? ` - ${searchedEmployeeName}` : ''}</h3>
                    </div>

                    <Spin spinning={isLoadingSearchedEmployeeKpi}>
                      <Row gutter={[16, 16]}>
                        <Col xs={24} sm={12} lg={6}>
                          <Card className="border border-emerald-100 bg-emerald-50/50" bodyStyle={{ padding: '14px 16px' }}>
                            <p className="text-xs text-emerald-700 mb-1">Annual Leave Remaining</p>
                            <p className="text-2xl font-bold text-emerald-800">{searchedEmployeeKpi?.annualLeaveRemaining ?? 0}</p>
                          </Card>
                        </Col>
                        <Col xs={24} sm={12} lg={6}>
                          <Card className="border border-blue-100 bg-blue-50/50" bodyStyle={{ padding: '14px 16px' }}>
                            <p className="text-xs text-blue-700 mb-1">Sick Leave</p>
                            <p className="text-2xl font-bold text-blue-800">{searchedEmployeeKpi?.sickLeaveCount ?? 0}</p>
                          </Card>
                        </Col>
                        <Col xs={24} sm={12} lg={6}>
                          <Card className="border border-orange-100 bg-orange-50/50" bodyStyle={{ padding: '14px 16px' }}>
                            <p className="text-xs text-orange-700 mb-1">Emergency Leave</p>
                            <p className="text-2xl font-bold text-orange-800">{searchedEmployeeKpi?.emergencyLeaveCount ?? 0}</p>
                          </Card>
                        </Col>
                        <Col xs={24} sm={12} lg={6}>
                          <Card className="border border-violet-100 bg-violet-50/50" bodyStyle={{ padding: '14px 16px' }}>
                            <p className="text-xs text-violet-700 mb-1">Planned Leave</p>
                            <p className="text-2xl font-bold text-violet-800">{searchedEmployeeKpi?.plannedLeaveCount ?? 0}</p>
                          </Card>
                        </Col>
                      </Row>
                    </Spin>
                  </Card>
                )}

                {/* Leave Table */}
                <div className="mt-4">
                  {filteredLeaves.length > 0 ? (
                    <LeaveTable 
                      leaves={filteredLeaves} 
                      onWithdraw={handleWithdraw} 
                      showActions={false}
                      onViewDetails={handleViewLeaveDetails}
                    />
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      {allLeaves.length === 0 ? 'No leave records found' : 'No leaves match the selected filters'}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {showForm && (
          <LeaveRequestForm
            onSubmit={handleSubmitRequest}
            onCancel={() => {
              setIsSubmittingLeaveRequest(false)
              setShowForm(false)
            }}
            isSubmitting={isSubmittingLeaveRequest}
            setIsSubmitting={setIsSubmittingLeaveRequest}
            employeeName={currentUser?.email || "Current Employee"}
          />
        )}

        <Modal
          title="Apply Leave for Others"
          open={showApplyForOthersForm}
          onCancel={() => {
            setShowApplyForOthersForm(false)
            applyForOthersForm.resetFields()
          }}
          footer={null}
          width={620}
        >
          <Form
            form={applyForOthersForm}
            layout="vertical"
            className="mt-4"
            onFinish={handleSubmitApplyForOthers}
          >
            <Form.Item
              name="employeeId"
              label="Employee"
              rules={[{ required: true, message: 'Please select an employee' }]}
            >
              <Select
                showSearch
                placeholder="Select employee"
                loading={isLoadingEmployees}
                optionFilterProp="label"
                options={employeeOptions.map((emp) => ({
                  value: emp.id,
                  label: `${emp.name}${emp.role ? ` (${emp.role})` : ''}`,
                }))}
              />
            </Form.Item>

            <Form.Item label="Leave Category">
              <Input value="Loss of Pay" disabled />
            </Form.Item>

            <Form.Item
              name="leaveType"
              label="Leave Type"
              rules={[{ required: true, message: 'Select leave type' }]}
            >
              <Select placeholder="Select Leave Type">
                <Select.Option value="Sick Leave">Sick Leave</Select.Option>
                <Select.Option value="Emergency Leave">Emergency Leave</Select.Option>
              </Select>
            </Form.Item>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Form.Item
                name="startDate"
                label="Start Date"
                rules={[{ required: true, message: 'Please select start date' }]}
              >
                <DatePicker className="w-full" placeholder="DD-MM-YYYY" format="DD-MM-YYYY" disabledDate={disabledApplyForOthersDate} />
              </Form.Item>
              <Form.Item
                name="endDate"
                label="End Date"
                rules={[{ required: true, message: 'Please select end date' }]}
              >
                <DatePicker className="w-full" placeholder="DD-MM-YYYY" format="DD-MM-YYYY" disabledDate={disabledApplyForOthersDate} />
              </Form.Item>
            </div>

            <Form.Item
              name="reason"
              label="Reason"
              rules={[{ required: true, message: 'Please provide a reason' }]}
            >
              <Input.TextArea rows={3} placeholder="Enter leave reason" />
            </Form.Item>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                onClick={() => {
                  setShowApplyForOthersForm(false)
                  applyForOthersForm.resetFields()
                }}
              >
                Cancel
              </Button>
              <Button type="primary" htmlType="submit" loading={isSubmittingApplyForOthers}>
                Apply and Approve
              </Button>
            </div>
          </Form>
        </Modal>

        {/* Reject Leave Modal */}
        <Modal
          title="Apply Leave Rules?"
          open={ruleChoiceModalVisible}
          onCancel={closeRuleChoiceModal}
          footer={[
            <Button key="cancel" onClick={closeRuleChoiceModal} disabled={isApprovingRuleChoice}>
              Cancel
            </Button>,
            <Button
              key="approve"
              type="primary"
              style={{ backgroundColor: '#10b981' }}
              onClick={handleApproveFromRuleChoice}
              loading={isApprovingRuleChoice}
              disabled={isApprovingRuleChoice}
            >
              Approve
            </Button>,
          ]}
        >
          <div className="space-y-3">
            <p className="mb-1 font-medium text-gray-800">Select which rules to apply before approval.</p>
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 space-y-2">
            {ruleChoiceLeave?.sandwichRuleApplicable === true && (
              <div className="flex items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-2">
                <span className="text-sm font-medium text-gray-700">Apply Sandwich Rule</span>
                <Checkbox checked={applySandwichSelection} onChange={(e) => setApplySandwichSelection(e.target.checked)} />
              </div>
            )}
            {ruleChoiceLeave?.onePlusTwoRuleApplicable === true && (
              <div className="flex items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-2">
                <span className="text-sm font-medium text-gray-700">Apply 1+2 Rule</span>
                <Checkbox checked={applyOnePlusTwoSelection} onChange={(e) => setApplyOnePlusTwoSelection(e.target.checked)} />
              </div>
            )}
            </div>
            <p className="text-sm text-gray-600">Only applicable rules are shown.</p>
          </div>
        </Modal>

        <Modal
          title={
            <div className="flex items-center gap-2">
              <span className="text-red-600 text-xl">❌</span>
              <span>Reject Leave Request</span>
            </div>
          }
          open={rejectModalVisible}
          onCancel={() => {
            setRejectModalVisible(false)
            setRejectingLeaveId(null)
            setRejectReason("")
          }}
          onOk={handleRejectConfirm}
          okText="Confirm Rejection"
          cancelText="Cancel"
          okButtonProps={{
            danger: true,
            disabled: !rejectReason.trim() || rejectReason.trim().length < 10
          }}
          width={600}
        >
          <div className="py-4">
            <p className="text-gray-700 mb-4">
              Please provide a reason for rejecting this leave request. This will be sent to the employee via email.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rejection Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Please provide a detailed reason for rejection..."
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none resize-none"
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-1">
                Minimum 10 characters required
              </p>
            </div>

            {rejectReason.trim() && rejectReason.length < 10 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  ⚠️ Please provide a more detailed reason ({rejectReason.length}/10 characters)
                </p>
              </div>
            )}

            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-4">
              <p className="text-sm text-red-800 font-medium">
                📧 The employee will receive an email notification with this reason.
              </p>
            </div>
          </div>
        </Modal>

        {/* Leave Details Modal */}
        <LeaveDetailsModal
          leave={selectedLeaveForDetails}
          visible={detailsModalVisible}
          loading={isLoadingLeaveDetails}
          onClose={() => {
            setDetailsModalVisible(false)
            setSelectedLeaveForDetails(null)
            setIsLoadingLeaveDetails(false)
          }}
        />
      </div>
    </PageContainer>
  )
}