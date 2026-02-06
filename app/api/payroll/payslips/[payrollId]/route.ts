import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifyToken } from "@/lib/auth-utils"
import { getSalesforceConnection } from "@/lib/salesforce"

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

    const conn = await getSalesforceConnection()
    if (!conn) {
      return NextResponse.json({ error: "Failed to connect to Salesforce" }, { status: 500 })
    }

    // Fetch payroll record to get employee and period details
    const payrollResult = await conn.query<any>(`
      SELECT 
        Id,
        Employee__c,
        Employee__r.Employee_Name__c,
        Employee__r.Name,
        Payroll_Summary__r.Payroll_Month__c,
        Payroll_Summary__r.Payroll_Year__c,
        Payroll_Month__c
      FROM Payroll__c
      WHERE Id = '${payrollId}'
      LIMIT 1
    `)

    if (!payrollResult.records || payrollResult.records.length === 0) {
      return NextResponse.json({ error: "Payroll record not found" }, { status: 404 })
    }

    const payroll = payrollResult.records[0]
    const employeeId = payroll.Employee__r?.Name
    const payrollMonth = payroll.Payroll_Summary__r?.Payroll_Month__c || payroll.Payroll_Month__c
    const payrollYear = payroll.Payroll_Summary__r?.Payroll_Year__c || new Date().getFullYear()

    // Fetch the payslip PDF URL from Document__c
    const documentName = `Payslip_${employeeId}_${payrollMonth}_${payrollYear}`
    const documentResult = await conn.query<any>(`
      SELECT File_URL__c 
      FROM Document__c 
      WHERE Name = '${documentName}' 
      AND Document_Category__c = 'Payslip'
      LIMIT 1
    `)

    if (!documentResult.records || documentResult.records.length === 0) {
      return NextResponse.json({ error: "Payslip PDF not found" }, { status: 404 })
    }

    const pdfUrl = documentResult.records[0].File_URL__c

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
    console.error("Error fetching payslip:", error)
    return NextResponse.json({ error: "Failed to fetch payslip" }, { status: 500 })
  }
}
