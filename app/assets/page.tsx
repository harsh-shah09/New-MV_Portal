"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { MainNav } from "@/components/main-nav"
import { getAuthToken } from "@/lib/auth"
import { AssetTable } from "./components/asset-table"
import { AssetAssignForm } from "./components/asset-assign-form"
import type { Asset } from "@/types"

const mockAssets: Asset[] = [
  {
    id: "1",
    assetTag: "LAPTOP-001",
    name: "Dell XPS 13",
    type: "laptop",
    category: "IT Equipment",
    purchaseDate: "2022-03-15",
    purchasePrice: 1500,
    currentValue: 900,
    status: "assigned",
    assignedTo: "John Doe",
    assignmentDate: "2022-03-15",
    depreciationRate: 0.15,
  },
  {
    id: "2",
    assetTag: "PHONE-001",
    name: "iPhone 14 Pro",
    type: "phone",
    category: "Mobile Devices",
    purchaseDate: "2022-09-20",
    purchasePrice: 1200,
    currentValue: 600,
    status: "assigned",
    assignedTo: "Jane Smith",
    assignmentDate: "2022-09-20",
    depreciationRate: 0.2,
  },
  {
    id: "3",
    assetTag: "MONITOR-001",
    name: 'LG 27" 4K Monitor',
    type: "monitor",
    category: "IT Equipment",
    purchaseDate: "2023-01-10",
    purchasePrice: 400,
    currentValue: 300,
    status: "available",
    depreciationRate: 0.1,
  },
  {
    id: "4",
    assetTag: "TABLET-001",
    name: 'iPad Pro 12.9"',
    type: "tablet",
    category: "Mobile Devices",
    purchaseDate: "2021-06-15",
    purchasePrice: 1100,
    currentValue: 500,
    status: "damaged",
    assignedTo: "Mike Johnson",
    assignmentDate: "2021-06-15",
    depreciationRate: 0.18,
  },
]

const mockEmployees = [
  { id: "1", firstName: "John", lastName: "Doe" },
  { id: "2", firstName: "Jane", lastName: "Smith" },
  { id: "3", firstName: "Mike", lastName: "Johnson" },
  { id: "4", firstName: "Sarah", lastName: "Williams" },
]

export default function AssetsPage() {
  const router = useRouter()
  const [assets, setAssets] = useState<Asset[]>([])
  const [showAssignForm, setShowAssignForm] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)

  useEffect(() => {
    if (!getAuthToken()) {
      router.push("/auth/login")
    }
    setAssets(mockAssets)
  }, [router])

  const handleAssign = (asset: Asset) => {
    setSelectedAsset(asset)
    setShowAssignForm(true)
  }

  const handleSubmitAssignment = (assetId: string, employeeId: string) => {
    const employee = mockEmployees.find((e) => e.id === employeeId)
    if (employee) {
      setAssets((prev) =>
        prev.map((a) =>
          a.id === assetId
            ? {
                ...a,
                assignedTo: `${employee.firstName} ${employee.lastName}`,
                status: "assigned" as const,
                assignmentDate: new Date().toISOString().split("T")[0],
              }
            : a,
        ),
      )
      setShowAssignForm(false)
      setSelectedAsset(null)
      alert("Asset assigned successfully!")
    }
  }

  const handleEdit = (asset: Asset) => {
    alert(`Edit functionality for ${asset.name}`)
  }

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this asset?")) {
      setAssets((prev) => prev.filter((a) => a.id !== id))
    }
  }

  const totalAssets = assets.length
  const assignedAssets = assets.filter((a) => a.status === "assigned").length
  const totalValue = assets.reduce((sum, a) => sum + a.currentValue, 0)

  return (
    <div>
      <MainNav />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Asset Management</h1>
          <p className="text-gray-600 mt-1">Track company assets and equipment</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-2">Total Assets</div>
            <div className="text-3xl font-bold text-blue-600">{totalAssets}</div>
            <div className="text-xs text-gray-500 mt-2">{assignedAssets} assigned</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-2">Total Current Value</div>
            <div className="text-3xl font-bold text-green-600">${totalValue.toLocaleString()}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-2">Available Assets</div>
            <div className="text-3xl font-bold text-amber-600">
              {assets.filter((a) => a.status === "available").length}
            </div>
          </div>
        </div>

        <AssetTable assets={assets} onAssign={handleAssign} onEdit={handleEdit} onDelete={handleDelete} />

        {showAssignForm && selectedAsset && (
          <AssetAssignForm
            asset={selectedAsset}
            employees={mockEmployees}
            onSubmit={handleSubmitAssignment}
            onCancel={() => {
              setShowAssignForm(false)
              setSelectedAsset(null)
            }}
          />
        )}
      </div>
    </div>
  )
}
