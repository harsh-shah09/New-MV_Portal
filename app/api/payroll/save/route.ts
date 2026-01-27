import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifyToken } from "@/lib/auth-utils"
import { getSalesforceConnection } from "@/lib/salesforce"

export async function POST(request: NextRequest) {
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

    const { role } = payload
    if (role !== "HR" && role !== "Admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { month, year, employees } = body || {}

    if (!month || !year || !Array.isArray(employees)) {
      return NextResponse.json({ error: "Month, year, and employees are required" }, { status: 400 })
    }

    const conn = await getSalesforceConnection()
    if (!conn) {
      return NextResponse.json({ error: "Failed to connect to Salesforce" }, { status: 500 })
    }

    // 1) Create Payroll_Summary__c
    const summaryPayload: any = {
      Payroll_Month__c: month,
      Payroll_Year__c: year,
      Status__c: "Draft",
      Period_Type__c: "Month",
    }

    console.log("Creating Payroll Summary:", summaryPayload)

    const summaryResult = await conn.sobject("Payroll_Summary__c").create(summaryPayload)
    
    // Handle result (can be single object or array)
    const summary = Array.isArray(summaryResult) ? summaryResult[0] : summaryResult
    
    if (!summary.success) {
      console.error("Failed to create payroll summary:", summary.errors)
      return NextResponse.json({ 
        error: "Failed to create payroll summary", 
        details: summary.errors 
      }, { status: 500 })
    }

    const summaryId = summary.id
    console.log("Payroll Summary created with ID:", summaryId)

    // 2) Create Payroll__c records for each employee
    const payrollRecords = employees.map((emp: any) => {
      // Extract adjustment details (only 1 adjustment allowed per employee)
      const adjustment = emp.adjustments && emp.adjustments.length > 0 ? emp.adjustments[0] : null
      
      return {
        Payroll_Summary__c: summaryId,
        Employee__c: emp.employeeId,
        Payroll_Month__c: month,
        Basic_Salary__c: emp.baseSalary || emp.basicSalary || 0,
        Bonus__c: emp.bonus || 0,
        Adjustment_Type__c: adjustment?.adjustmentType || null,
        Adjustment_Amount__c: adjustment?.adjustmentAmount || null,
        Adjustment_Description__c: adjustment?.adjustmentDescription || null,
        Total_Additions__c: emp.totalAdditions || 0,
        Total_Deductions__c: emp.totalDeductions || 0,
      }
    })

    console.log("Creating Payroll records:", JSON.stringify(payrollRecords, null, 2))
    console.log("Number of payroll records to create:", payrollRecords.length)

    const payrollResult = await conn.sobject("Payroll__c").create(payrollRecords, { allOrNone: false })
    
    console.log("Payroll creation result:", JSON.stringify(payrollResult, null, 2))

    return NextResponse.json({
      payrollSummaryId: summaryId,
      payrollResults: payrollResult,
      totalRecordsCreated: Array.isArray(payrollResult) ? payrollResult.length : 1,
    })
  } catch (error) {
    console.error("Error saving payroll:", error)
    return NextResponse.json({ error: "Failed to save payroll" }, { status: 500 })
  }
}
