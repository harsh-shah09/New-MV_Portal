"use client"

import { useState, useEffect } from "react"
import { Spin, message, Button } from "antd"
import { DownloadOutlined } from "@ant-design/icons"

interface PayslipData {
  pdfUrl: string
  employeeName: string
  payrollMonth: string
  payrollYear: number
}

interface PayslipViewProps {
  payrollId: string
}

export function PayslipView({ payrollId }: PayslipViewProps) {
  const [payslip, setPayslip] = useState<PayslipData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPayslip()
  }, [payrollId])

  const fetchPayslip = async () => {
    setLoading(true)
    try {
      console.info("[PayslipView] Fetching payslip metadata", { payrollId })
      const res = await fetch(`/api/payroll/payslips/${payrollId}`)
      if (!res.ok) {
        const errorText = await res.text().catch(() => "")
        console.error("[PayslipView] Metadata fetch failed", {
          payrollId,
          status: res.status,
          statusText: res.statusText,
          body: errorText,
        })
        throw new Error(`Failed to fetch payslip (${res.status})`)
      }
      
      const data = await res.json()
      console.info("[PayslipView] Metadata fetch success", {
        payrollId,
        hasPdfUrl: Boolean(data?.payslip?.pdfUrl),
        payrollMonth: data?.payslip?.payrollMonth,
        payrollYear: data?.payslip?.payrollYear,
      })
      setPayslip(data.payslip)
    } catch (error) {
      console.error("[PayslipView] Error fetching payslip", { payrollId, error })
      message.error("Failed to load payslip")
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async () => {
    try {
      message.loading({ content: "Downloading PDF...", key: "pdf-download" })
      console.info("[PayslipView] Download requested", { payrollId, payrollMonth: payslip?.payrollMonth, payrollYear: payslip?.payrollYear })
      
      // Use the download API route to avoid CORS issues
      const response = await fetch(`/api/payroll/payslips/${payrollId}/download`)
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => "")
        console.error("[PayslipView] Download failed", {
          payrollId,
          status: response.status,
          statusText: response.statusText,
          body: errorText,
        })
        throw new Error(`Failed to download PDF (${response.status})`)
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `Payslip_${payslip?.payrollMonth}_${payslip?.payrollYear}.pdf`
      link.style.display = 'none'
      
      document.body.appendChild(link)
      link.click()
      
      // Clean up after a short delay
      setTimeout(() => {
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
      }, 100)
      
      message.success({ content: "PDF downloaded successfully!", key: "pdf-download" })
    } catch (error) {
      console.error("[PayslipView] Error downloading PDF", { payrollId, error })
      message.error({ content: "Failed to download PDF. Please try again.", key: "pdf-download" })
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Spin size="large" tip="Loading payslip..." />
      </div>
    )
  }

  if (!payslip) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Payslip not found</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with actions */}
      <div className="flex justify-between items-center px-4 py-3 bg-white rounded-lg shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Payslip - {payslip.payrollMonth} {payslip.payrollYear}
          </h2>
          <p className="text-sm text-gray-500 mt-1">{payslip.employeeName}</p>
        </div>
        <Button 
          type="primary"
          icon={<DownloadOutlined />} 
          onClick={handleDownload}
          size="large"
        >
          Download PDF
        </Button>
      </div>

      {/* PDF Preview with enhanced styling */}
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg shadow-lg p-4" style={{ height: 'calc(100vh - 200px)', minHeight: '600px' }}>
        <div className="bg-white rounded-md shadow-inner h-full overflow-auto" style={{ WebkitOverflowScrolling: 'touch', scrollBehavior: 'smooth' }}>
          <iframe
            src={`${payslip.pdfUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
            className="w-full border-0"
            title={`Payslip - ${payslip.payrollMonth} ${payslip.payrollYear}`}
            loading="eager"
            style={{ 
              minHeight: '100%',
              height: 'auto',
              display: 'block'
            }}
          />
        </div>
      </div>
    </div>
  )
}

