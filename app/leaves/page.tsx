"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { MainNav } from "@/components/main-nav"
import { LeaveRequestForm } from "./components/leave-request-form"
import { LeaveTable } from "./components/leave-table"
import { useLeaveStore } from "@/store/leaveStore"
import type { LeaveRequest } from "@/types"
import { useQuery } from "@tanstack/react-query"

export default function LeavesPage() {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [selectedTab, setSelectedTab] = useState<"my-requests" | "approvals">("my-requests")
  const [currentUser, setCurrentUser] = useState<{ employeeId: string; email?: string; recordId: string; role?: string; title?: string } | null>(null)
  console.log("Current User:", currentUser)
  const { leaves, pendingApprovals, setLeaves, setPendingApprovals, updateLeave } = useLeaveStore()

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

  const handleSubmitRequest = async (data: Partial<LeaveRequest>) => {
    try {
      const response = await fetch("/api/leave-management", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        alert(error.error || "Failed to submit leave request")
        return
      }

      const result = await response.json()
      
      // Refetch the leaves to get the updated list
      refetch()
      
      setShowForm(false)
      alert("Leave request submitted successfully!")
    } catch (error) {
      console.error("Error submitting leave request:", error)
      alert("Failed to submit leave request")
    }
  }

  const handleCancel = async (leaveId: string) => {
    const leave = leaves.find((l) => l.id === leaveId)
    if (leave && confirm("Cancel this leave request?")) {
      try {
        const response = await fetch("/api/leave-management", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            leaveId,
            action: "cancel",
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          alert(error.error || "Failed to cancel leave")
          return
        }

        // Update local state
        updateLeave({
          ...leave,
          status: "cancelled",
        })
      } catch (error) {
        console.error("Error cancelling leave:", error)
        alert("Failed to cancel leave")
      }
    }
  }

  const handleWithdraw = async (leaveId: string) => {
    const leave = leaves.find((l) => l.id === leaveId)
    if (leave && confirm("Withdraw this approved leave?")) {
      try {
        const response = await fetch("/api/leave-management", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            leaveId,
            action: "withdraw",
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          alert(error.error || "Failed to withdraw leave")
          return
        }

        // Update local state
        updateLeave({
          ...leave,
          status: "withdrawn",
        })
      } catch (error) {
        console.error("Error withdrawing leave:", error)
        alert("Failed to withdraw leave")
      }
    }
  }

  const handleApprove = async (leaveId: string) => {
    if (confirm("Approve this leave request?")) {
      try {
        const response = await fetch("/api/leave-management", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            leaveId,
            action: "approve",
          }),
        })

        if (!response.ok) {
          const error = await response.json()
          alert(error.error || "Failed to approve leave")
          return
        }

        // Refetch to update the list
        refetch()
        alert("Leave approved successfully!")
      } catch (error) {
        console.error("Error approving leave:", error)
        alert("Failed to approve leave")
      }
    }
  }

  const handleReject = async (leaveId: string, reason: string) => {
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
        alert(error.error || "Failed to reject leave")
        return
      }

      // Refetch to update the list
      refetch()
      alert("Leave rejected successfully!")
    } catch (error) {
      console.error("Error rejecting leave:", error)
      alert("Failed to reject leave")
    }
  }

  if (isLoading) {
    return (
      <div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div>
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
            <button
              onClick={() => setSelectedTab("my-requests")}
              className={`flex-1 px-6 py-4 text-center font-medium transition ${
                selectedTab === "my-requests"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              My Requests
            </button>
            <button
              onClick={() => setSelectedTab("approvals")}
              className={`flex-1 px-6 py-4 text-center font-medium transition ${
                selectedTab === "approvals"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Approvals
            </button>
          </div>

          <div className="p-6">
            {selectedTab === "my-requests" && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">My Leave Requests</h2>
                <LeaveTable leaves={leaves} onCancel={handleCancel} onWithdraw={handleWithdraw} />
              </div>
            )}

            {selectedTab === "approvals" && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Pending Approvals</h2>
                {(currentUser?.role === 'HR' || (currentUser?.role === 'Developer' && currentUser?.title === 'Team Lead')) ? (
                  pendingApprovals.length > 0 ? (
                    <div className="space-y-5">
                      {pendingApprovals.map((leave) => {
                        console.log("Pending Approval Leave:", leave)
                        const isTeamLead = currentUser?.role === 'Developer' && currentUser?.title === 'Team Lead'
                        const isHR = currentUser?.role === 'HR'
                        const tlApproved = leave.tlApproved === 'Approved'
                        const tlRejected = leave.tlApproved === 'Rejected'
                        const hrApproved = leave.hrApproval === 'Approved'
                        const hrRejected = leave.hrApproval === 'Rejected'
                        const alreadyActioned = isTeamLead ? (tlApproved || tlRejected) : (hrApproved || hrRejected)

                        return (
                          <div key={leave.id} className="relative overflow-hidden bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border-l-[6px] border-l-indigo-500">
                            {/* Decorative gradient overlay */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-purple-200/30 via-pink-200/20 to-transparent rounded-full blur-3xl -z-10" />
                            
                            <div className="p-6">
                              {/* Header with Avatar */}
                              <div className="flex items-start justify-between mb-5">
                                <div className="flex items-center gap-4">
                                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xl shadow-lg ring-4 ring-purple-100">
                                    {leave.employeeName.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <h3 className="text-xl font-bold text-gray-900">{leave.employeeName}</h3>
                                    <p className="text-xs text-gray-500 font-medium mt-0.5">ID: {leave.employeeId}</p>
                                  </div>
                                </div>
                                <span className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-amber-400 to-orange-400 text-white shadow-md uppercase tracking-wide">
                                  {leave.status}
                                </span>
                              </div>

                              {/* Colorful Info Cards */}
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border-l-4 border-blue-500 shadow-sm">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-blue-600 text-lg">📋</span>
                                    <label className="text-[10px] font-bold text-blue-900 uppercase tracking-wider">Type</label>
                                  </div>
                                  <p className="text-sm font-bold text-blue-900 truncate capitalize">{leave.leaveType || leave.leaveCategory}</p>
                                </div>
                                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border-l-4 border-purple-500 shadow-sm">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-purple-600 text-lg">⏱️</span>
                                    <label className="text-[10px] font-bold text-purple-900 uppercase tracking-wider">Duration</label>
                                  </div>
                                  <p className="text-sm font-bold text-purple-900">{leave.duration} {leave.duration === 1 ? 'Day' : 'Days'}</p>
                                </div>
                                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-4 border-l-4 border-emerald-500 shadow-sm">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-emerald-600 text-lg">📅</span>
                                    <label className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider">Start</label>
                                  </div>
                                  <p className="text-sm font-bold text-emerald-900">{new Date(leave.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                                </div>
                                <div className="bg-gradient-to-br from-rose-50 to-rose-100 rounded-xl p-4 border-l-4 border-rose-500 shadow-sm">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-rose-600 text-lg">🏁</span>
                                    <label className="text-[10px] font-bold text-rose-900 uppercase tracking-wider">End</label>
                                  </div>
                                  <p className="text-sm font-bold text-rose-900">{new Date(leave.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                                </div>
                              </div>

                              {/* Approval Status Timeline */}
                              {(leave.tlApproved || leave.hrApproval) && (
                                <div className="mb-5 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200">
                                  <p className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <span className="text-base">🔄</span> Approval Status
                                  </p>
                                  <div className="flex items-center gap-3">
                                    {leave.tlApproved && (
                                      <div className={`flex-1 flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-sm ${
                                        leave.tlApproved === 'Approved' 
                                          ? 'bg-gradient-to-r from-green-400 to-emerald-500 text-white' 
                                          : 'bg-gradient-to-r from-red-400 to-rose-500 text-white'
                                      }`}>
                                        <span className="text-xl">{leave.tlApproved === 'Approved' ? '✓' : '✗'}</span>
                                        <div className="flex-1">
                                          <p className="text-xs font-bold uppercase tracking-wide">Team Lead</p>
                                          <p className="text-xs font-semibold opacity-90">{leave.tlApproved}</p>
                                        </div>
                                      </div>
                                    )}
                                    {leave.tlApproved && leave.hrApproval && (
                                      <div className="w-8 h-0.5 bg-gradient-to-r from-gray-300 to-gray-400" />
                                    )}
                                    {leave.hrApproval && (
                                      <div className={`flex-1 flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-sm ${
                                        leave.hrApproval === 'Approved' 
                                          ? 'bg-gradient-to-r from-green-400 to-emerald-500 text-white' 
                                          : 'bg-gradient-to-r from-red-400 to-rose-500 text-white'
                                      }`}>
                                        <span className="text-xl">{leave.hrApproval === 'Approved' ? '✓' : '✗'}</span>
                                        <div className="flex-1">
                                          <p className="text-xs font-bold uppercase tracking-wide">HR</p>
                                          <p className="text-xs font-semibold opacity-90">{leave.hrApproval}</p>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Action Buttons */}
                              {!alreadyActioned ? (
                                <div className="flex gap-3">
                                  <button
                                    onClick={() => handleApprove(leave.id)}
                                    className="flex-1 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 hover:from-green-600 hover:via-emerald-600 hover:to-teal-600 text-white px-6 py-3.5 rounded-xl font-bold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
                                  >
                                    <span className="text-xl">✓</span>
                                    <span>Approve</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      const reason = prompt("Enter reason for rejection:");
                                      if (reason) handleReject(leave.id, reason);
                                    }}
                                    className="flex-1 bg-gradient-to-r from-red-500 via-rose-500 to-pink-500 hover:from-red-600 hover:via-rose-600 hover:to-pink-600 text-white px-6 py-3.5 rounded-xl font-bold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
                                  >
                                    <span className="text-xl">✗</span>
                                    <span>Reject</span>
                                  </button>
                                </div>
                              ) : (
                                <div className={`rounded-xl p-4 text-center shadow-sm ${
                                  (tlApproved || hrApproved)
                                    ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200'
                                    : 'bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-200'
                                }`}>
                                  <p className={`text-sm font-bold ${
                                    (tlApproved || hrApproved) ? 'text-green-800' : 'text-red-800'
                                  }`}>
                                    {isTeamLead 
                                      ? `✓ You have ${tlApproved ? 'approved' : 'rejected'} this request. Awaiting HR review.` 
                                      : `✓ You have ${hrApproved ? 'approved' : 'rejected'} this leave request.`
                                    }
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-600">No pending approvals</div>
                  )
                ) : (
                  <div className="text-center py-8 text-gray-600">Only HR and Team Leads can view pending approvals</div>
                )}
              </div>
            )}
          </div>
        </div>

        {showForm && (
          <LeaveRequestForm
            onSubmit={handleSubmitRequest}
            onCancel={() => setShowForm(false)}
            employeeName={currentUser?.email || "Current Employee"}
          />
        )}
      </div>
    </div>
  )
}