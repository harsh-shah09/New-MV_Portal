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
    console.info("[API][PayslipMeta] Request received", { payrollId, path: request.nextUrl.pathname })

    const cookieStore = await cookies()
    const session = cookieStore.get("session")?.value

    if (!session) {
      console.warn("[API][PayslipMeta] Unauthorized - missing session", { payrollId })
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = await verifyToken(session)
    if (!payload) {
      console.warn("[API][PayslipMeta] Unauthorized - invalid session token", { payrollId })
      return NextResponse.json({ error: "Invalid session" }, { status: 401 })
    }

    const userRole = payload.role || ""
    const isPrivilegedUser = userRole === "Admin" || userRole === "HR"

    console.info("[API][PayslipMeta] Session verified", { payrollId, userEmail: payload.email, role: payload.role })

    const conn = await getSalesforceConnection()
    if (!conn) {
      console.error("[API][PayslipMeta] Salesforce connection failed", { payrollId })
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
      console.warn("[API][PayslipMeta] Payroll record not found", { payrollId })
      return NextResponse.json({ error: "Payroll record not found" }, { status: 404 })
    }

    const payroll = payrollResult.records[0]
    const payrollOwnerEmail = payroll.Employee__r?.Employee_Email__c || ""
    const payrollSummaryStatus = String(payroll.Payroll_Summary__r?.Status__c || "").toLowerCase()

    if (!isPrivilegedUser && payload.email !== payrollOwnerEmail) {
      console.warn("[API][PayslipMeta] Forbidden - employee attempted access to another employee payslip", {
        payrollId,
        requester: payload.email,
        owner: payrollOwnerEmail,
      })
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (!isPrivilegedUser && payrollSummaryStatus !== "paid") {
      console.warn("[API][PayslipMeta] Blocked - payroll not marked paid for employee access", {
        payrollId,
        summaryStatus: payroll.Payroll_Summary__r?.Status__c,
      })
      return NextResponse.json({ error: "Payslip is available only after payroll is marked as Paid" }, { status: 403 })
    }

  const employeeId = payroll.Employee__r?.Employee_Id__c || payroll.Employee__r?.Name
    const payrollMonth = payroll.Payroll_Summary__r?.Payroll_Month__c || payroll.Payroll_Month__c
    const payrollYear = payroll.Payroll_Summary__r?.Payroll_Year__c || new Date().getFullYear()

    // Fetch the payslip PDF URL from Document__c
    const documentName = `Payslip_${employeeId}_${payrollMonth}_${payrollYear}`
    console.info("[API][PayslipMeta] Resolving document", {
      payrollId,
      employeeId,
      employeeName: payroll.Employee__r?.Employee_Name__c,
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
      console.warn("[API][PayslipMeta] Payslip document not found", { payrollId, documentName })
      return NextResponse.json({ error: "Payslip PDF not found" }, { status: 404 })
    }

    const pdfUrl = documentResult.records[0].File_URL__c
    console.info("[API][PayslipMeta] Success", { payrollId, documentName, hasPdfUrl: Boolean(pdfUrl) })

    return NextResponse.json({ 
      payslip: {
        pdfUrl,
        employeeId,
        employeeName: payroll.Employee__r?.Employee_Name__c || "Unknown",
        payrollMonth,
        payrollYear,
      }
    })
  } catch (error) {
    console.error("[API][PayslipMeta] Unhandled error", error)
    return NextResponse.json({ error: "Failed to fetch payslip" }, { status: 500 })
  }
}
