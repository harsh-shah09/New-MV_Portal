"use client"

import { useState } from "react"
import { Modal, Select, Button, message } from "antd"

interface GeneratePayrollModalProps {
  open: boolean
  onClose: () => void
  onGenerate: (month: string, year: number) => void
}

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

const currentYear = new Date().getFullYear()
const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

export function GeneratePayrollModal({ open, onClose, onGenerate }: GeneratePayrollModalProps) {
  const [selectedMonth, setSelectedMonth] = useState<string>("")
  const [selectedYear, setSelectedYear] = useState<number>(currentYear)

  const handleGenerate = () => {
    if (!selectedMonth) {
      message.error("Please select a month")
      return
    }

    onGenerate(selectedMonth, selectedYear)
    setSelectedMonth("")
    setSelectedYear(currentYear)
    onClose()
  }

  return (
    <Modal
      title="Generate Payroll"
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button key="generate" type="primary" onClick={handleGenerate}>
          Generate Payroll
        </Button>,
      ]}
    >
      <div className="space-y-4 py-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Month</label>
          <Select
            className="w-full"
            placeholder="Select month"
            value={selectedMonth || undefined}
            onChange={(value) => setSelectedMonth(value)}
            options={months.map((month) => ({
              label: month,
              value: month,
            }))}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Year</label>
          <Select
            className="w-full"
            placeholder="Select year"
            value={selectedYear}
            onChange={(value) => setSelectedYear(value)}
            options={years.map((year) => ({
              label: year,
              value: year,
            }))}
          />
        </div>
      </div>
    </Modal>
  )
}
