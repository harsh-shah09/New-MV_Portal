"use client"

import type React from "react"
import { useState } from "react"
import type { Asset } from "@/types"

interface AssetAssignFormProps {
  asset: Asset
  employees: Array<{ id: string; firstName: string; lastName: string }>
  onSubmit: (assetId: string, employeeId: string) => void
  onCancel: () => void
}

export function AssetAssignForm({ asset, employees, onSubmit, onCancel }: AssetAssignFormProps) {
  const [selectedEmployee, setSelectedEmployee] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedEmployee) {
      onSubmit(asset.id, selectedEmployee)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">Assign Asset</h2>
          <button onClick={onCancel} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Asset</label>
            <p className="text-gray-900 font-medium">{asset.name}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              <option value="">Select Employee</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition"
            >
              Assign Asset
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
