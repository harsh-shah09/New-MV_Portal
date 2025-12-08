"use client"

import type React from "react"
import { useState } from "react"

interface SalaryCalculationInput {
  basicSalary: number
  allowances?: number
  deductions?: number
  taxRate?: number
}

interface SalaryBreakdown {
  basicSalary: number
  allowances: number
  grossSalary: number
  taxAmount: number
  deductions: number
  netSalary: number
}

interface SalaryCalculatorProps {
  onCalculate: (breakdown: SalaryBreakdown) => void
}

export function SalaryCalculator({ onCalculate }: SalaryCalculatorProps) {
  const [input, setInput] = useState<SalaryCalculationInput>({
    basicSalary: 0,
    allowances: 0,
    deductions: 0,
    taxRate: 15,
  })

  const [breakdown, setBreakdown] = useState<SalaryBreakdown | null>(null)

  const calculateSalary = (e: React.FormEvent) => {
    e.preventDefault()

    const allowances = input.allowances || 0
    const deductions = input.deductions || 0
    const taxRate = (input.taxRate || 15) / 100

    const grossSalary = input.basicSalary + allowances
    const taxableAmount = grossSalary - deductions
    const taxAmount = taxableAmount * taxRate
    const netSalary = grossSalary - taxAmount - deductions

    const result: SalaryBreakdown = {
      basicSalary: input.basicSalary,
      allowances,
      grossSalary,
      taxAmount,
      deductions,
      netSalary,
    }

    setBreakdown(result)
    onCalculate(result)
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Salary Calculator</h3>

      <form onSubmit={calculateSalary} className="space-y-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Basic Salary</label>
            <input
              type="number"
              value={input.basicSalary}
              onChange={(e) => setInput({ ...input, basicSalary: Number(e.target.value) })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Allowances</label>
            <input
              type="number"
              value={input.allowances}
              onChange={(e) => setInput({ ...input, allowances: Number(e.target.value) })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Deductions</label>
            <input
              type="number"
              value={input.deductions}
              onChange={(e) => setInput({ ...input, deductions: Number(e.target.value) })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tax Rate (%)</label>
            <input
              type="number"
              value={input.taxRate}
              onChange={(e) => setInput({ ...input, taxRate: Number(e.target.value) })}
              min="0"
              max="100"
              step="0.1"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="15"
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition"
        >
          Calculate Salary
        </button>
      </form>

      {breakdown && (
        <div className="border-t border-gray-200 pt-6">
          <h4 className="font-semibold text-gray-900 mb-4">Breakdown</h4>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Basic Salary</span>
              <span className="font-medium text-gray-900">${breakdown.basicSalary.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Allowances</span>
              <span className="font-medium text-green-600">+${breakdown.allowances.toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-3 border-t border-b border-gray-200">
              <span className="font-medium text-gray-900">Gross Salary</span>
              <span className="font-semibold text-gray-900">${breakdown.grossSalary.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Tax</span>
              <span className="font-medium text-red-600">-${breakdown.taxAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Deductions</span>
              <span className="font-medium text-red-600">-${breakdown.deductions.toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-3 border-t border-gray-200 bg-blue-50 px-4 py-3 rounded-lg">
              <span className="font-semibold text-gray-900">Net Salary</span>
              <span className="font-bold text-blue-600 text-lg">${breakdown.netSalary.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
