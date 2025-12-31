'use client'

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { AssetTable } from "./components/asset-table"
import { AssetAssignForm } from "./components/asset-assign-form"
import { AssetForm } from "./components/asset-form"
import type { Asset } from "@/types"
import { Button, message } from "antd"
import { PlusOutlined } from "@ant-design/icons"

const mockAssets: Asset[] = [
  {
    id: "1",
    assetTag: "LAPTOP-001",
    name: "Dell XPS 13",
    type: "laptop",
    category: "laptop",
    purchaseDate: "2022-03-15",
    purchaseCost: 1500,
    currentValue: 900,
    status: "assigned",
    assignedTo: "John Doe",
    assignmentDate: "2022-03-15",
    condition: "good",
    serialNumber: "SN-99922",
    vendor: "Dell"
  },
  {
    id: "2",
    assetTag: "PHONE-001",
    name: "iPhone 14 Pro",
    type: "mobile",
    category: "mobile",
    purchaseDate: "2022-09-20",
    purchaseCost: 1200,
    currentValue: 600,
    status: "available",
    condition: "new",
    serialNumber: "SN-77711",
    vendor: "Apple"
  }
]

const mockEmployees = [
  { id: "1", firstName: "John", lastName: "Doe" },
  { id: "2", firstName: "Jane", lastName: "Smith" },
]

export default function AssetsPage() {
  const router = useRouter()
  const [assets, setAssets] = useState<Asset[]>([])
  const [showAssignForm, setShowAssignForm] = useState(false)
  const [showAssetForm, setShowAssetForm] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null)

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
      message.success("Asset assigned successfully!")
    }
  }

  const handleAddAsset = (data: Asset | Omit<Asset, "id">) => {
      const newAsset = { ...data, id: Math.random().toString(36).substr(2, 9) } as Asset
      setAssets([...assets, newAsset])
      setShowAssetForm(false)
  }

  const handleUpdateAsset = (data: Asset | Omit<Asset, "id">) => {
      setAssets(assets.map(a => a.id === (data as Asset).id ? (data as Asset) : a))
      setEditingAsset(null)
  }

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this asset?")) {
      setAssets((prev) => prev.filter((a) => a.id !== id))
      message.success("Asset deleted")
    }
  }

  return (
    <div className="min-h-screen bg-slate-50/50">

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-extrabold text-slate-900 mb-2 tracking-tight">Asset Management</h1>
            <p className="text-slate-500 text-lg">Track company assets and equipment</p>
          </div>
          <Button 
            type="primary" 
            size="large" 
            icon={<PlusOutlined />} 
            onClick={() => setShowAssetForm(true)}
          >
            Add New Asset
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-100">
            <div className="text-sm font-medium text-slate-500 mb-2">Total Assets</div>
            <div className="text-3xl font-bold text-blue-600">{assets.length}</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-100">
            <div className="text-sm font-medium text-slate-500 mb-2">Total Value</div>
            <div className="text-3xl font-bold text-emerald-600">
              ${assets.reduce((sum, a) => sum + (Number(a.currentValue) || 0), 0).toLocaleString()}
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-100">
            <div className="text-sm font-medium text-slate-500 mb-2">Available</div>
            <div className="text-3xl font-bold text-amber-600">
              {assets.filter((a) => a.status === "available").length}
            </div>
          </div>
        </div>

        <AssetTable 
            assets={assets} 
            onAssign={handleAssign} 
            onEdit={(asset) => setEditingAsset(asset)} 
            onDelete={handleDelete} 
        />

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

        {(showAssetForm || editingAsset) && (
            <AssetForm
                asset={editingAsset || undefined}
                onSubmit={editingAsset ? handleUpdateAsset : handleAddAsset}
                onCancel={() => {
                    setShowAssetForm(false)
                    setEditingAsset(null)
                }}
            />
        )}
      </div>
    </div>
  )
}
