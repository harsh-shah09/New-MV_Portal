"use client"
import type { Payroll } from "@/types"

interface BankFileGeneratorProps {
  payrolls: Payroll[]
}

export function BankFileGenerator({ payrolls }: BankFileGeneratorProps) {
  const generateBankFile = () => {
    const paidPayrolls = payrolls.filter((p) => p.status === "paid" && p.paymentDate)

    if (paidPayrolls.length === 0) {
      alert("No paid payrolls to generate bank file")
      return
    }

    let bankFileContent = "BANK TRANSFER FILE\n"
    bankFileContent += `Generated: ${new Date().toISOString()}\n`
    bankFileContent += `Total Records: ${paidPayrolls.length}\n`
    bankFileContent += `Total Amount: $${paidPayrolls.reduce((sum, p) => sum + p.netSalary, 0).toLocaleString()}\n\n`
    bankFileContent += "EMPLOYEE_ID,EMPLOYEE_NAME,AMOUNT,BANK_ACCOUNT,REFERENCE\n"

    paidPayrolls.forEach((payroll) => {
      bankFileContent += `${payroll.employeeId},${payroll.employeeName},${payroll.netSalary},XXXX-XXXX-${Math.random().toString().slice(2, 6)},${payroll.month}-${payroll.year}\n`
    })

    const blob = new Blob([bankFileContent], { type: "text/plain" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `payroll_${new Date().toISOString().split("T")[0]}.txt`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)

    alert("Bank file generated and downloaded successfully!")
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-blue-900 mb-3">Bank File Export</h3>
      <p className="text-sm text-blue-800 mb-4">Generate a bank file with all processed payrolls for bulk transfer</p>
      <button
        onClick={generateBankFile}
        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition"
      >
        Generate Bank File
      </button>
    </div>
  )
}
