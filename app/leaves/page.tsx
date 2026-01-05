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
    const submit = async (payload: Partial<LeaveRequest>, confirmedRules = false): Promise<void> => {
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

        if (response.status === 409 && result?.requiresConfirmation) {
          const details = result.details || {}
          const confirmMessage =
            `Please confirm the revised leave calculation before submitting:\n\n` +
            `Requested leave days: ${payload.duration ?? "-"}\n` +
            `Leave span (calendar): ${details.rangeLeaveDays ?? "-"}\n` +
            `Sandwich extra days: ${details.sandwichExtra ?? 0}\n` +
            `One+Two extra days: ${details.onePlusTwoExtra ?? 0}\n` +
            `Total after rules: ${details.finalTotalAfterRules ?? "-"}\n\n` +
            `Sandwich applied: ${details.sandwichApplied ? "Yes" : "No"}\n` +
            `One+Two applied: ${details.onePlusTwoRuleApplied ? "Yes" : "No"}`

          if (confirm(confirmMessage)) {
            await submit(payload, true)
          }
          return
        }

        if (!response.ok) {
          alert(result?.error || "Failed to submit leave request")
          return
        }

        // Refetch the leaves to get the updated list
        refetch()

        setShowForm(false)

        if (result?.totals) {
          const t = result.totals
          alert(
            `Leave submitted successfully.\n\n` +
            `Leave span (calendar): ${t.rangeLeaveDays}\n` +
            `Sandwich extra days: ${t.sandwichExtra}\n` +
            `One+Two extra days: ${t.onePlusTwoExtra}\n` +
            `Total after rules: ${t.finalTotalAfterRules}`
          )
        } else {
          alert("Leave request submitted successfully!")
        }
      } catch (error) {
        console.error("Error submitting leave request:", error)
        alert("Failed to submit leave request")
      }
    }

    await submit(data)
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
              className={`flex-1 px-6 py-4 text-center font-medium transition ${selectedTab === "my-requests"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-600 hover:text-gray-900"
                }`}
            >
              My Requests
            </button>
            <button
              onClick={() => setSelectedTab("approvals")}
              className={`flex-1 px-6 py-4 text-center font-medium transition ${selectedTab === "approvals"
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
                    <div className="space-y-4">
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
                          <div key={leave.id} className="bg-gradient-to-r from-slate-50 to-blue-50 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all">
                            <div className="p-5">
                              {/* Header */}
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm">
                                    {leave.employeeName.charAt(0).toUpperCase()}
                                  </div>
                                  <div> 
                                    <h3 className="text-base font-semibold text-gray-900">{leave.employeeName}</h3>
                                    <p className="text-xs text-gray-500">ID: {leave.employeeId}</p>
                                  </div>
                                  <span className="px-4 py-2 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
                                    {leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
                                  </span>
                                </div>

                                {/* Action Buttons */}
                                {!alreadyActioned ? (
                                  <div className="flex gap-3">
                                    <button
                                      onClick={() => handleApprove(leave.id)}
                                      className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                                    >
                                      Approve
                                    </button>
                                    <button
                                      onClick={() => {
                                        const reason = prompt("Enter reason for rejection:");
                                        if (reason) handleReject(leave.id, reason);
                                      }}
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
                                  <p className="text-xs text-gray-500 mb-1">Duration</p>
                                  <p className="text-sm font-medium text-gray-900">{leave.duration} {leave.duration === 1 ? 'Day' : 'Days'}</p>
                                </div>
                                <div className="bg-white/70 rounded-md p-3 border border-gray-100">
                                  <p className="text-xs text-gray-500 mb-1">Start Date</p>
                                  <p className="text-sm font-medium text-gray-900">{new Date(leave.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                                </div>
                                <div className="bg-white/70 rounded-md p-3 border border-gray-100">
                                  <p className="text-xs text-gray-500 mb-1">End Date</p>
                                  <p className="text-sm font-medium text-gray-900">{new Date(leave.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                                </div>
                              </div>

                              {/* Approval Status */}
                              {(leave.tlApproved || leave.hrApproval) && (
                                <div className="flex items-center gap-4 mb-4 text-sm bg-white/70 rounded-md p-3 border border-gray-100">
                                  {leave.tlApproved && (
                                    <div className="flex items-center gap-2">
                                      <span className="text-gray-500">Team Lead:</span>
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
                  <div className="text-center py-8 text-gray-500">Only HR and Team Leads can view pending approvals</div>
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