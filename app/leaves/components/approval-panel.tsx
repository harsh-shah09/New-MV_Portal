"use client"

import React from "react"
import type { LeaveRequest } from "@/types"
import { formatDate } from "@/lib/utils"

interface ApprovalPanelProps {
  leave: LeaveRequest
  onApprove: (leaveId: string) => void
  onReject: (leaveId: string, reason: string) => void
}

export function ApprovalPanel({ leave, onApprove, onReject }: ApprovalPanelProps) {
  const [rejectReason, setRejectReason] = React.useState("")
  const [showRejectForm, setShowRejectForm] = React.useState(false)

  const handleReject = (e: React.FormEvent) => {
    e.preventDefault()
    if (rejectReason.trim()) {
      onReject(leave.id, rejectReason)
      setRejectReason("")
      setShowRejectForm(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Employee</label>
          <p className="text-lg font-medium text-gray-900">{leave.employeeName}</p>
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Leave Type</label>
          <p className="text-lg font-medium text-gray-900 capitalize">{leave.leaveType}</p>
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Duration</label>
          <p className="text-lg font-medium text-gray-900">{leave.duration} days</p>
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Dates</label>
          <p className="text-lg font-medium text-gray-900">
            {formatDate(leave.startDate)} to {formatDate(leave.endDate)}
          </p>
        </div>
      </div>

      {leave.reason && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <label className="block text-sm text-gray-600 mb-2">Reason</label>
          <p className="text-gray-900">{leave.reason}</p>
        </div>
      )}

      {leave.status === "pending" ? (
        <div className="flex gap-3">
          <button
            onClick={() => onApprove(leave.id)}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition"
          >
            Approve
          </button>
          <button
            onClick={() => setShowRejectForm(!showRejectForm)}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition"
          >
            Reject
          </button>
        </div>
      ) : (
        <div>
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${leave.status === "approved" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
          >
            {leave.status}
          </span>
        </div>
      )}

      {showRejectForm && (
        <form onSubmit={handleReject} className="mt-4 p-4 bg-red-50 rounded-lg">
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Reason for rejection..."
            rows={3}
            className="w-full px-4 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none resize-none"
          />
          <div className="flex gap-2 mt-3">
            <button
              type="submit"
              className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition"
            >
              Confirm Rejection
            </button>
            <button
              type="button"
              onClick={() => setShowRejectForm(false)}
              className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-900 px-4 py-2 rounded-lg font-medium transition"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
