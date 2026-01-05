"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { SalaryCalculator } from "./components/salary-calculator"
import { PayrollTable } from "./components/payroll-table"
import { BankFileGenerator } from "./components/bank-file-generator"
import { usePayrollStore } from "@/store/payrollStore"
import type { Payroll } from "@/types"

const mockPayrolls: Payroll[] = [
  {
    id: "1",
    employeeId: "1",
    employeeName: "John Doe",
    month: "June",
    year: 2024,
    basicSalary: 120000,
    allowances: 15000,
    deductions: 5000,
    taxAmount: 18000,
    netSalary: 112000,
    status: "paid",
    paymentDate: "2024-06-30",
  },
  {
    id: "2",
    employeeId: "2",
    employeeName: "Jane Smith",
    month: "June",
    year: 2024,
    basicSalary: 95000,
    allowances: 12000,
    deductions: 4000,
    taxAmount: 14250,
    netSalary: 88750,
    status: "paid",
    paymentDate: "2024-06-30",
  },
  {
    id: "3",
    employeeId: "3",
    employeeName: "Mike Johnson",
    month: "July",
    year: 2024,
    basicSalary: 75000,
    allowances: 8000,
    deductions: 3000,
    taxAmount: 11250,
    netSalary: 68750,
    status: "processed",
  },
  {
    id: "4",
    employeeId: "4",
    employeeName: "Sarah Williams",
    month: "July",
    year: 2024,
    basicSalary: 85000,
    allowances: 10000,
    deductions: 3500,
    taxAmount: 12750,
    netSalary: 78750,
    status: "draft",
  },
]

import { message } from "antd"

// ... imports

export default function PayrollPage() {
  const router = useRouter()
  const [payrolls, setPayrolls] = useState<Payroll[]>([])
  const { setPayrolls: setStorePayrolls } = usePayrollStore()
  const handleProcessPayroll = (id: string) => {
    setPayrolls((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              status: "paid" as const,
              paymentDate: new Date().toISOString().split("T")[0],
            }
          : p,
      ),
    )
  }

  const handleDeletePayroll = (id: string) => {
    if (confirm("Are you sure you want to delete this payroll record?")) {
      setPayrolls((prev) => prev.filter((p) => p.id !== id))
    }
  }

  const handleCalculateSalary = (breakdown: any) => {
    console.log("Salary calculated:", breakdown)
  }

  const totalPayroll = payrolls.reduce((sum, p) => sum + p.netSalary, 0)
  const paidPayroll = payrolls.filter((p) => p.status === "paid").reduce((sum, p) => sum + p.netSalary, 0)
  const pendingPayroll = payrolls.filter((p) => p.status !== "paid").reduce((sum, p) => sum + p.netSalary, 0)

  return (
    <div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">Payroll Management</h1>
          <p className="text-gray-600 mt-1">Process salaries and manage employee payments</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-2">Total Payroll</div>
            <div className="text-3xl font-bold text-blue-600">${totalPayroll.toLocaleString()}</div>
            <div className="text-xs text-gray-500 mt-2">All payroll records</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-2">Paid</div>
            <div className="text-3xl font-bold text-green-600">${paidPayroll.toLocaleString()}</div>
            <div className="text-xs text-gray-500 mt-2">Processed payments</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-2">Pending</div>
            <div className="text-3xl font-bold text-amber-600">${pendingPayroll.toLocaleString()}</div>
            <div className="text-xs text-gray-500 mt-2">Draft & processed</div>
          </div>
        </div>

        <SalaryCalculator onCalculate={handleCalculateSalary} />

        <div className="mb-6">
          <BankFileGenerator payrolls={payrolls} />
        </div>

        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Payroll Records</h2>
          <PayrollTable payrolls={payrolls} onProcess={handleProcessPayroll} onDelete={handleDeletePayroll} />
        </div>
      </div>
    </div>
  )
}
