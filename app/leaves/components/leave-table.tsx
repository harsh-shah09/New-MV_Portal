"use client"

import type { LeaveRequest } from "@/types"
import { formatDate } from "@/lib/utils"

interface LeaveTableProps {
  leaves: LeaveRequest[]
  onCancel: (id: string) => void
  showActions?: boolean
}

const statusColors = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-800",
}

export function LeaveTable({ leaves, onCancel, showActions = true }: LeaveTableProps) {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Employee</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Leave Type</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">From</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">To</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Days</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
              {showActions && <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {leaves.map((leave) => (
              <tr key={leave.id} className="hover:bg-gray-50 transition">
                <td className="px-6 py-4">
                  <div className="font-medium text-gray-900">{leave.employeeName}</div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600 capitalize">{leave.leaveType}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{formatDate(leave.startDate)}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{formatDate(leave.endDate)}</td>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{leave.duration}</td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[leave.status]}`}
                  >
                    {leave.status}
                  </span>
                </td>
                {showActions && (
                  <td className="px-6 py-4 text-center">
                    {leave.status === "pending" && (
                      <button
                        onClick={() => onCancel(leave.id)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Cancel
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
