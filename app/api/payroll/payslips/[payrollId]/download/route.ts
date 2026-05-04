import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifyToken } from "@/lib/auth-utils"
import { getSalesforceConnection } from "@/lib/salesforce"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ payrollId: string }> }
) {
  try {
    const { payrollId } = await params
    console.info("[API][PayslipDownload] Request received", { payrollId, path: request.nextUrl.pathname })

    const cookieStore = await cookies()
    const session = cookieStore.get("session")?.value

    if (!session) {
      console.warn("[API][PayslipDownload] Unauthorized - missing session", { payrollId })
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = await verifyToken(session)
    if (!payload) {
      console.warn("[API][PayslipDownload] Unauthorized - invalid session token", { payrollId })
      return NextResponse.json({ error: "Invalid session" }, { status: 401 })
    }

    const userRole = payload.role || ""
    const isPrivilegedUser = userRole === "Admin" || userRole === "HR"

    console.info("[API][PayslipDownload] Session verified", { payrollId, userEmail: payload.email, role: payload.role })

    const conn = await getSalesforceConnection()
    if (!conn) {
      console.error("[API][PayslipDownload] Salesforce connection failed", { payrollId })
      return NextResponse.json({ error: "Failed to connect to Salesforce" }, { status: 500 })
    }

    // Fetch payroll record to get employee and period details
    const payrollResult = await conn.query<any>(`
      SELECT 
        Id,
        Employee__c,
        Employee__r.Employee_Email__c,
        Employee__r.Employee_Id__c,
        Employee__r.Employee_Name__c,
        Employee__r.Name,
        Payroll_Summary__r.Status__c,
        Payroll_Summary__r.Payroll_Month__c,
        Payroll_Summary__r.Payroll_Year__c,
        Payroll_Month__c
      FROM Payroll__c
      WHERE Id = '${payrollId}'
      LIMIT 1
    `)

    if (!payrollResult.records || payrollResult.records.length === 0) {
      console.warn("[API][PayslipDownload] Payroll record not found", { payrollId })
      return NextResponse.json({ error: "Payroll record not found" }, { status: 404 })
    }

    const payroll = payrollResult.records[0]
    const payrollOwnerEmail = payroll.Employee__r?.Employee_Email__c || ""
    const payrollSummaryStatus = String(payroll.Payroll_Summary__r?.Status__c || "").toLowerCase()

    if (!isPrivilegedUser && payload.email !== payrollOwnerEmail) {
      console.warn("[API][PayslipDownload] Forbidden - employee attempted download of another employee payslip", {
        payrollId,
        requester: payload.email,
        owner: payrollOwnerEmail,
      })
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (!isPrivilegedUser && payrollSummaryStatus !== "paid") {
      console.warn("[API][PayslipDownload] Blocked - payroll not marked paid for employee download", {
        payrollId,
        summaryStatus: payroll.Payroll_Summary__r?.Status__c,
      })
      return NextResponse.json({ error: "Payslip is available only after payroll is marked as Paid" }, { status: 403 })
    }

  const employeeId = payroll.Employee__r?.Employee_Id__c || payroll.Employee__r?.Name
    const employeeName = payroll.Employee__r?.Employee_Name__c || "Unknown"
    const payrollMonth = payroll.Payroll_Summary__r?.Payroll_Month__c || payroll.Payroll_Month__c
    const payrollYear = payroll.Payroll_Summary__r?.Payroll_Year__c || new Date().getFullYear()

    // Fetch the payslip PDF URL from Document__c
    const documentName = `Payslip_${employeeId}_${payrollMonth}_${payrollYear}`
    console.info("[API][PayslipDownload] Resolving document", {
      payrollId,
      employeeId,
      employeeName,
      payrollMonth,
      payrollYear,
      documentName,
    })

    const documentResult = await conn.query<any>(`
      SELECT File_URL__c 
      FROM Document__c 
      WHERE Name = '${documentName}' 
      AND Document_Category__c = 'Payslip'
      LIMIT 1
    `)

    if (!documentResult.records || documentResult.records.length === 0) {
      console.warn("[API][PayslipDownload] Payslip document not found", { payrollId, documentName })
      return NextResponse.json({ error: "Payslip PDF not found" }, { status: 404 })
    }

    const pdfUrl = documentResult.records[0].File_URL__c
    console.info("[API][PayslipDownload] Fetching PDF from source URL", { payrollId, hasPdfUrl: Boolean(pdfUrl) })

    // Fetch the PDF from S3
    const pdfResponse = await fetch(pdfUrl)
    
    if (!pdfResponse.ok) {
      console.error("[API][PayslipDownload] Source PDF fetch failed", {
        payrollId,
        status: pdfResponse.status,
        statusText: pdfResponse.statusText,
      })
      return NextResponse.json({ error: "Failed to fetch PDF from S3" }, { status: 500 })
    }

    const pdfBuffer = await pdfResponse.arrayBuffer()
    const filename = `Payslip_${employeeName.replace(/\s+/g, '_')}_${payrollMonth}_${payrollYear}.pdf`
    console.info("[API][PayslipDownload] Success", { payrollId, filename, sizeBytes: pdfBuffer.byteLength })

    // Return PDF as downloadable file
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.byteLength.toString(),
      },
    })
  } catch (error) {
    console.error("[API][PayslipDownload] Unhandled error", error)
    return NextResponse.json({ error: "Failed to download PDF" }, { status: 500 })
  }
}
