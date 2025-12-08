"use client"

import type { Employee } from "@/types"
import { formatDate } from "@/lib/utils"

interface EmployeeDetailProps {
  employee: Employee
  onClose: () => void
  onEdit: (employee: Employee) => void
}

export function EmployeeDetail({ employee, onClose, onEdit }: EmployeeDetailProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
        <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">
            {employee.firstName} {employee.lastName}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm text-gray-600">Email</label>
              <p className="text-lg font-medium text-gray-900">{employee.email}</p>
            </div>
            <div>
              <label className="text-sm text-gray-600">Phone</label>
              <p className="text-lg font-medium text-gray-900">{employee.phone}</p>
            </div>
            <div>
              <label className="text-sm text-gray-600">Department</label>
              <p className="text-lg font-medium text-gray-900">{employee.department}</p>
            </div>
            <div>
              <label className="text-sm text-gray-600">Position</label>
              <p className="text-lg font-medium text-gray-900">{employee.position}</p>
            </div>
            <div>
              <label className="text-sm text-gray-600">Join Date</label>
              <p className="text-lg font-medium text-gray-900">{formatDate(employee.joinDate)}</p>
            </div>
            <div>
              <label className="text-sm text-gray-600">Salary</label>
              <p className="text-lg font-medium text-gray-900">${(employee.salary / 1000).toFixed(0)}K</p>
            </div>
            <div>
              <label className="text-sm text-gray-600">Status</label>
              <div className="mt-1">
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    employee.status === "active"
                      ? "bg-green-100 text-green-800"
                      : employee.status === "inactive"
                        ? "bg-gray-100 text-gray-800"
                        : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {employee.status}
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition"
            >
              Close
            </button>
            <button
              onClick={() => onEdit(employee)}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition"
            >
              Edit Employee
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
