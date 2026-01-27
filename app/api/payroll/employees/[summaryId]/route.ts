import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifyToken } from "@/lib/auth-utils"
import { getSalesforceConnection } from "@/lib/salesforce"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ summaryId: string }> }
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

    const { role } = payload
    if (role !== "HR" && role !== "Admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { summaryId } = await params

    const conn = await getSalesforceConnection()
    if (!conn) {
      return NextResponse.json({ error: "Failed to connect to Salesforce" }, { status: 500 })
    }

    // Fetch payroll records for this summary
    const payrolls = await conn.query<any>(`
      SELECT 
        Id,
        Employee__c,
        Employee__r.Employee_Name__c,
        Employee__r.Employee_Email__c,
        Employee__r.Department__c,
        Employee__r.Role__c,
        Payroll_Month__c,
        Basic_Salary__c,
        Bonus__c,
        Adjustment_Type__c,
        Adjustment_Amount__c,
        Adjustment_Description__c,
        Total_Additions__c,
        Total_Deductions__c,
        Net_Salary__c
      FROM Payroll__c
      WHERE Payroll_Summary__c = '${summaryId}'
      ORDER BY Employee__r.Employee_Name__c
    `)

    const employeePayrolls = payrolls.records.map((record: any) => {
      const adjustments = []
      if (record.Adjustment_Type__c && record.Adjustment_Amount__c) {
        adjustments.push({
          id: `adj-${record.Id}`,
          adjustmentType: record.Adjustment_Type__c,
          adjustmentAmount: record.Adjustment_Amount__c,
          adjustmentDescription: record.Adjustment_Description__c || "",
        })
      }

      return {
        id: record.Id,
        employeeId: record.Employee__c,
        employeeName: record.Employee__r?.Employee_Name__c || "Unknown",
        email: record.Employee__r?.Employee_Email__c || "",
        department: record.Employee__r?.Department__c || "",
        role: record.Employee__r?.Role__c || "",
        payrollMonth: record.Payroll_Month__c,
        baseSalary: record.Basic_Salary__c || 0,
        basicSalary: record.Basic_Salary__c || 0,
        bonus: record.Bonus__c || 0,
        totalAdditions: record.Total_Additions__c || 0,
        totalDeductions: record.Total_Deductions__c || 0,
        netSalary: record.Net_Salary__c || 0,
        adjustments,
        leaves: [], // Leaves are not stored in Payroll__c, would need separate query if needed
      }
    })

    return NextResponse.json({ employees: employeePayrolls })
  } catch (error) {
    console.error("Error fetching employee payrolls:", error)
    return NextResponse.json({ error: "Failed to fetch employee payrolls" }, { status: 500 })
  }
}
