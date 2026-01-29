import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifyToken } from "@/lib/auth-utils"
import { generatePayslipPDF } from "@/lib/pdf-generator"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ payrollId: string }> }
) {
  try {
    const cookieStore = await cookies()
    const session = cookieStore.get("session")?.value

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = await verifyToken(session)
    if (!payload) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 })
    }

    const { payrollId } = await params

    // Fetch the payslip data using the existing API endpoint
    const baseUrl = request.url.replace('/download', '')
    const payslipResponse = await fetch(baseUrl, {
      headers: {
        Cookie: `session=${session}`,
      },
    })

    if (!payslipResponse.ok) {
      return NextResponse.json({ error: "Failed to fetch payslip data" }, { status: 500 })
    }

    const { payslip } = await payslipResponse.json()

    // Generate PDF
    const pdfBuffer = await generatePayslipPDF(payslip)

    // Create filename
    const filename = `Payslip_${payslip.employeeName.replace(/\s+/g, '_')}_${payslip.payrollMonth}_${payslip.payrollYear}.pdf`

    // Return PDF as downloadable file
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error("Error generating PDF:", error)
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 })
  }
}
