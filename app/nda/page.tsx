"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { MainNav } from "@/components/main-nav"
import { getAuthToken } from "@/lib/auth"
import { NDATable } from "./components/nda-table"
import type { NDA } from "@/types"

const mockNDAs: NDA[] = [
  {
    id: "1",
    employeeId: "1",
    employeeName: "John Doe",
    signDate: "2021-03-15",
    expiryDate: "2026-03-15",
    status: "signed",
    documentUrl: "https://example.com/nda/1.pdf",
  },
  {
    id: "2",
    employeeId: "2",
    employeeName: "Jane Smith",
    signDate: "2020-06-20",
    expiryDate: "2025-06-20",
    status: "signed",
    documentUrl: "https://example.com/nda/2.pdf",
  },
  {
    id: "3",
    employeeId: "3",
    employeeName: "Mike Johnson",
    signDate: "2022-01-10",
    expiryDate: "2027-01-10",
    status: "signed",
    documentUrl: "https://example.com/nda/3.pdf",
  },
  {
    id: "4",
    employeeId: "4",
    employeeName: "Sarah Williams",
    signDate: "",
    expiryDate: "2025-01-01",
    status: "pending",
    documentUrl: "https://example.com/nda/4.pdf",
  },
]

export default function NDAPage() {
  const router = useRouter()
  const [ndas, setNDAs] = useState<NDA[]>([])
  const [filter, setFilter] = useState<"all" | "pending" | "signed" | "expired">("all")

  useEffect(() => {
    if (!getAuthToken()) {
      router.push("/auth/login")
    }
    setNDAs(mockNDAs)
  }, [router])

  const filteredNDAs = ndas.filter((nda) => {
    if (filter === "all") return true
    return nda.status === filter
  })

  const handleDownload = (nda: NDA) => {
    console.log("[v0] Downloading NDA for", nda.employeeName)
    alert(`Downloading NDA for ${nda.employeeName}`)
  }

  const pendingCount = ndas.filter((n) => n.status === "pending").length
  const signedCount = ndas.filter((n) => n.status === "signed").length
  const expiredCount = ndas.filter((n) => n.status === "expired").length

  return (
    <div>
      <MainNav />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">NDA Management</h1>
          <p className="text-gray-600 mt-1">Manage employee NDAs and confidentiality agreements</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-2">Pending Signatures</div>
            <div className="text-3xl font-bold text-amber-600">{pendingCount}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-2">Signed</div>
            <div className="text-3xl font-bold text-green-600">{signedCount}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-2">Expired</div>
            <div className="text-3xl font-bold text-red-600">{expiredCount}</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex gap-2 flex-wrap">
            {[
              { id: "all", label: "All" },
              { id: "pending", label: "Pending" },
              { id: "signed", label: "Signed" },
              { id: "expired", label: "Expired" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id as any)}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  filter === f.id ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <NDATable ndas={filteredNDAs} onDownload={handleDownload} />
      </div>
    </div>
  )
}
