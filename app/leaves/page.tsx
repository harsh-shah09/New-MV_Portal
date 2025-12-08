"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { MainNav } from "@/components/main-nav"
import { getAuthToken } from "@/lib/auth"
import { LeaveRequestForm } from "./components/leave-request-form"
import { LeaveTable } from "./components/leave-table"
import { LeavePolicyCard } from "./components/leave-policy-card"
import { ApprovalPanel } from "./components/approval-panel"
import { useLeaveStore } from "@/store/leaveStore"
import type { LeaveRequest } from "@/types"

const mockLeaves: LeaveRequest[] = [
  {
    id: "1",
    employeeId: "1",
    employeeName: "John Doe",
    leaveType: "annual",
    startDate: "2024-07-15",
    endDate: "2024-07-22",
    duration: 8,
    reason: "Vacation",
    status: "pending",
  },
  {
    id: "2",
    employeeId: "2",
    employeeName: "Jane Smith",
    leaveType: "sick",
    startDate: "2024-07-10",
    endDate: "2024-07-12",
    duration: 3,
    reason: "Medical appointment",
    status: "approved",
    approvedBy: "Manager",
    approvalDate: "2024-07-09",
  },
  {
    id: "3",
    employeeId: "3",
    employeeName: "Mike Johnson",
    leaveType: "personal",
    startDate: "2024-08-01",
    endDate: "2024-08-03",
    duration: 3,
    reason: "Personal matter",
    status: "pending",
  },
]

const policies = [
  {
    id: "1",
    leaveType: "Annual Leave",
    annualDays: 20,
    carryForwardDays: 5,
    minAdvanceNotice: 5,
  },
  {
    id: "2",
    leaveType: "Sick Leave",
    annualDays: 10,
    carryForwardDays: 0,
    minAdvanceNotice: 1,
  },
  {
    id: "3",
    leaveType: "Personal Leave",
    annualDays: 5,
    carryForwardDays: 0,
    minAdvanceNotice: 3,
  },
]

export default function LeavesPage() {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [selectedTab, setSelectedTab] = useState<"my-requests" | "approvals" | "policies">("my-requests")
  const [selectedApproval, setSelectedApproval] = useState<LeaveRequest | null>(null)

  const { leaves, pendingApprovals, setLeaves, setPendingApprovals, addLeave, updateLeave } = useLeaveStore()

  useEffect(() => {
    if (!getAuthToken()) {
      router.push("/auth/login")
    }
    if (leaves.length === 0) {
      setLeaves(mockLeaves)
      setPendingApprovals(mockLeaves.filter((l) => l.status === "pending"))
    }
  }, [router, leaves.length, setLeaves, setPendingApprovals])

  const handleSubmitRequest = (data: Partial<LeaveRequest>) => {
    const newLeave: LeaveRequest = {
      id: Math.random().toString(36).substr(2, 9),
      employeeId: "current-user",
      employeeName: "Current Employee",
      leaveType: data.leaveType || "annual",
      startDate: data.startDate || "",
      endDate: data.endDate || "",
      duration: data.duration || 0,
      reason: data.reason || "",
      status: "pending",
    }
    addLeave(newLeave)
    setShowForm(false)
  }

  const handleApprove = (leaveId: string) => {
    const leave = leaves.find((l) => l.id === leaveId)
    if (leave) {
      updateLeave({
        ...leave,
        status: "approved",
        approvedBy: "Manager",
        approvalDate: new Date().toISOString().split("T")[0],
      })
      setPendingApprovals(pendingApprovals.filter((l) => l.id !== leaveId))
      setSelectedApproval(null)
    }
  }

  const handleReject = (leaveId: string, reason: string) => {
    const leave = leaves.find((l) => l.id === leaveId)
    if (leave) {
      updateLeave({
        ...leave,
        status: "rejected",
        approvedBy: `Rejected by Manager: ${reason}`,
      })
      setPendingApprovals(pendingApprovals.filter((l) => l.id !== leaveId))
      setSelectedApproval(null)
    }
  }

  const handleCancel = (leaveId: string) => {
    const leave = leaves.find((l) => l.id === leaveId)
    if (leave && confirm("Cancel this leave request?")) {
      updateLeave({
        ...leave,
        status: "cancelled",
      })
    }
  }

  return (
    <div>
      <MainNav />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Leave Management</h1>
            <p className="text-gray-600 mt-1">Manage leave requests and approvals</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition"
          >
            + Request Leave
          </button>
        </div>

        <div className="bg-white rounded-lg shadow mb-6">
          <div className="flex border-b border-gray-200">
            {[
              { id: "my-requests", label: "My Requests" },
              { id: "approvals", label: "Approvals" },
              { id: "policies", label: "Leave Policies" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id as any)}
                className={`flex-1 px-6 py-4 text-center font-medium transition ${
                  selectedTab === tab.id
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {selectedTab === "my-requests" && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">My Leave Requests</h2>
                <LeaveTable leaves={leaves} onCancel={handleCancel} />
              </div>
            )}

            {selectedTab === "approvals" && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Pending Approvals</h2>
                {pendingApprovals.length > 0 ? (
                  <div className="space-y-6">
                    {!selectedApproval ? (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="space-y-2">
                          {pendingApprovals.map((leave) => (
                            <button
                              key={leave.id}
                              onClick={() => setSelectedApproval(leave)}
                              className="w-full text-left p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition"
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="font-medium text-gray-900">{leave.employeeName}</p>
                                  <p className="text-sm text-gray-600 capitalize">
                                    {leave.leaveType} - {leave.duration} days
                                  </p>
                                </div>
                                <span className="text-blue-600 text-sm font-medium">Review →</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <button
                          onClick={() => setSelectedApproval(null)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium mb-4"
                        >
                          ← Back to List
                        </button>
                        <ApprovalPanel leave={selectedApproval} onApprove={handleApprove} onReject={handleReject} />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-600">No pending approvals</div>
                )}
              </div>
            )}

            {selectedTab === "policies" && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Leave Policies</h2>
                <LeavePolicyCard policies={policies as any} />
              </div>
            )}
          </div>
        </div>

        {showForm && (
          <LeaveRequestForm
            onSubmit={handleSubmitRequest}
            onCancel={() => setShowForm(false)}
            employeeName="Current Employee"
          />
        )}
      </div>
    </div>
  )
}
