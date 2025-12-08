"use client"

import type { Payroll } from "@/types"

interface PayrollTableProps {
  payrolls: Payroll[]
  onProcess: (id: string) => void
  onDelete: (id: string) => void
}

const statusColors = {
  draft: "bg-gray-100 text-gray-800",
  processed: "bg-amber-100 text-amber-800",
  paid: "bg-green-100 text-green-800",
}

export function PayrollTable({ payrolls, onProcess, onDelete }: PayrollTableProps) {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Employee</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Month</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Basic Salary</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Allowances</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Tax</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Deductions</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Net Salary</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
              <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {payrolls.map((payroll) => (
              <tr key={payroll.id} className="hover:bg-gray-50 transition">
                <td className="px-6 py-4">
                  <p className="font-medium text-gray-900">{payroll.employeeName}</p>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {payroll.month} {payroll.year}
                </td>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">${payroll.basicSalary.toLocaleString()}</td>
                <td className="px-6 py-4 text-sm font-medium text-green-600">${payroll.allowances.toLocaleString()}</td>
                <td className="px-6 py-4 text-sm font-medium text-red-600">${payroll.taxAmount.toLocaleString()}</td>
                <td className="px-6 py-4 text-sm font-medium text-red-600">${payroll.deductions.toLocaleString()}</td>
                <td className="px-6 py-4 text-sm font-bold text-blue-600">${payroll.netSalary.toLocaleString()}</td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[payroll.status]}`}
                  >
                    {payroll.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="flex justify-center gap-2 flex-wrap">
                    {payroll.status === "draft" && (
                      <button
                        onClick={() => onProcess(payroll.id)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Process
                      </button>
                    )}
                    <button
                      onClick={() => onDelete(payroll.id)}
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
