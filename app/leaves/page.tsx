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
  const [currentUser, setCurrentUser] = useState<{ employeeId: string; email?: string; recordId: string } | null>(null)

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

  if (isLoading) {
    return (
      <div>
        <MainNav />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    )
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
                {pendingApprovals.length > 0 ? (
                  <div className="text-center py-8 text-gray-600">Approval functionality coming soon</div>
                ) : (
                  <div className="text-center py-8 text-gray-600">No pending approvals</div>
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