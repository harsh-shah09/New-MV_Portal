"use client"

import type { Asset } from "@/types"

interface AssetTableProps {
  assets: Asset[]
  onAssign: (asset: Asset) => void
  onEdit: (asset: Asset) => void
  onDelete: (id: string) => void
}

const statusColors = {
  available: "bg-green-100 text-green-800",
  assigned: "bg-blue-100 text-blue-800",
  damaged: "bg-red-100 text-red-800",
  retired: "bg-gray-100 text-gray-800",
}

export function AssetTable({ assets, onAssign, onEdit, onDelete }: AssetTableProps) {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Asset Tag</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Type</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Value</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Assigned To</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
              <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {assets.map((asset) => (
              <tr key={asset.id} className="hover:bg-gray-50 transition">
                <td className="px-6 py-4">
                  <p className="font-medium text-gray-900">{asset.assetTag}</p>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{asset.name}</td>
                <td className="px-6 py-4 text-sm text-gray-600 capitalize">{asset.type}</td>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">${asset.currentValue.toLocaleString()}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{asset.assignedTo || "-"}</td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[asset.status]}`}
                  >
                    {asset.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="flex justify-center gap-2 flex-wrap">
                    {asset.status === "available" && (
                      <button
                        onClick={() => onAssign(asset)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Assign
                      </button>
                    )}
                    <button
                      onClick={() => onEdit(asset)}
                      className="text-green-600 hover:text-green-800 text-sm font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDelete(asset.id)}
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
