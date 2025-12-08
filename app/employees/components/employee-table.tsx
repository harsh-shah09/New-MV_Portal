"use client"

import type { Employee } from "@/types"
import { formatDate } from "@/lib/utils"

interface EmployeeTableProps {
  employees: Employee[]
  onEdit: (employee: Employee) => void
  onDelete: (id: string) => void
  onView: (employee: Employee) => void
}

export function EmployeeTable({ employees, onEdit, onDelete, onView }: EmployeeTableProps) {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Department</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Position</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Join Date</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Salary</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
              <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {employees.map((emp) => (
              <tr key={emp.id} className="hover:bg-gray-50 transition">
                <td className="px-6 py-4">
                  <div className="font-medium text-gray-900">
                    {emp.firstName} {emp.lastName}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{emp.email}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{emp.department}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{emp.position}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{formatDate(emp.joinDate)}</td>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">${(emp.salary / 1000).toFixed(0)}K</td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      emp.status === "active"
                        ? "bg-green-100 text-green-800"
                        : emp.status === "inactive"
                          ? "bg-gray-100 text-gray-800"
                          : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {emp.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="flex justify-center gap-2">
                    <button
                      onClick={() => onView(emp)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      View
                    </button>
                    <button
                      onClick={() => onEdit(emp)}
                      className="text-green-600 hover:text-green-800 text-sm font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDelete(emp.id)}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
