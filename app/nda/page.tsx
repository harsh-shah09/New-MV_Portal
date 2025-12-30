"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { MainNav } from "@/components/main-nav"
import { NDATable } from "./components/nda-table"
import type { NDA } from "@/types"

const mockNDAs: NDA[] = [
  {
    id: "1",
    employeeId: "1",
    employeeName: "John Doe",
    templateId: "T-001",
    signDate: "2021-03-15",
    expiryDate: "2026-03-15",
    status: "signed",
    documentUrl: "https://example.com/nda/1.pdf",
  },
  {
    id: "2",
    employeeId: "2",
    employeeName: "Jane Smith",
    templateId: "T-001",
    signDate: "2020-06-20",
    expiryDate: "2025-06-20",
    status: "signed",
    documentUrl: "https://example.com/nda/2.pdf",
  },
  {
    id: "3",
    employeeId: "3",
    employeeName: "Mike Johnson",
    templateId: "T-002",
    signDate: "2022-01-10",
    expiryDate: "2027-01-10",
    status: "signed",
    documentUrl: "https://example.com/nda/3.pdf",
  },
  {
    id: "4",
    employeeId: "4",
    employeeName: "Sarah Williams",
    templateId: "T-002",
    signDate: "",
    expiryDate: "2025-01-01",
    status: "pending",
    documentUrl: "https://example.com/nda/4.pdf",
  },
]

import { Tabs, message } from 'antd';

export default function NDAPage() {
  const router = useRouter()
  const [ndas, setNDAs] = useState<NDA[]>([])
  const [activeTab, setActiveTab] = useState<string>("all")

 
  const getFilteredNDAs = (status: string) => {
      if (status === 'all') return ndas;
      return ndas.filter(n => n.status === status);
  }

  const handleDownload = (nda: NDA) => {
    console.log("[v0] Downloading NDA for", nda.employeeName)
    message.success(`Downloading NDA for ${nda.employeeName}`)
  }

  const pendingCount = ndas.filter((n) => n.status === "pending").length
  const signedCount = ndas.filter((n) => n.status === "signed").length
  const expiredCount = ndas.filter((n) => n.status === "expired").length

  const items = [
    { key: 'all', label: 'All NDAs', children: <NDATable ndas={getFilteredNDAs('all')} onDownload={handleDownload} /> },
    { key: 'pending', label: `Pending (${pendingCount})`, children: <NDATable ndas={getFilteredNDAs('pending')} onDownload={handleDownload} /> },
    { key: 'signed', label: `Signed (${signedCount})`, children: <NDATable ndas={getFilteredNDAs('signed')} onDownload={handleDownload} /> },
    { key: 'expired', label: `Expired (${expiredCount})`, children: <NDATable ndas={getFilteredNDAs('expired')} onDownload={handleDownload} /> },
  ];

  return (
    <div>
      <MainNav />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div>
          <h1 className="text-4xl font-extrabold text-slate-900 mb-2 tracking-tight">NDA Management</h1>
          <p className="text-slate-500 text-lg">Manage employee NDAs and confidentiality agreements</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-100">
            <div className="text-sm font-medium text-slate-500 mb-2">Pending Signatures</div>
            <div className="text-3xl font-bold text-amber-600">{pendingCount}</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-100">
            <div className="text-sm font-medium text-slate-500 mb-2">Signed</div>
            <div className="text-3xl font-bold text-emerald-600">{signedCount}</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-100">
            <div className="text-sm font-medium text-slate-500 mb-2">Expired</div>
            <div className="text-3xl font-bold text-rose-600">{expiredCount}</div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <Tabs defaultActiveKey="all" items={items} onChange={setActiveTab} />
        </div>
      </div>
    </div>
  )
}
