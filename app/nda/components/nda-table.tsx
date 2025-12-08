"use client"

import type { NDA } from "@/types"
import { formatDate } from "@/lib/utils"

interface NDATableProps {
  ndas: NDA[]
  onDownload: (nda: NDA) => void
}

const statusColors = {
  pending: "bg-amber-100 text-amber-800",
  signed: "bg-green-100 text-green-800",
  expired: "bg-red-100 text-red-800",
}

export function NDATable({ ndas, onDownload }: NDATableProps) {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Employee</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Signed Date</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Expiry Date</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
              <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {ndas.map((nda) => (
              <tr key={nda.id} className="hover:bg-gray-50 transition">
                <td className="px-6 py-4">
                  <p className="font-medium text-gray-900">{nda.employeeName}</p>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{formatDate(nda.signDate)}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{formatDate(nda.expiryDate)}</td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[nda.status]}`}
                  >
                    {nda.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <button
                    onClick={() => onDownload(nda)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Download
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
