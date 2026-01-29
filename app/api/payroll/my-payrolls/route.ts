import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifyToken } from "@/lib/auth-utils"
import { getSalesforceConnection } from "@/lib/salesforce"

export async function GET(request: NextRequest) {
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

    const { email } = payload

    const conn = await getSalesforceConnection()
    if (!conn) {
      return NextResponse.json({ error: "Failed to connect to Salesforce" }, { status: 500 })
    }

    // Get the employee record
    const employeeResult = await conn.query<any>(`
      SELECT Id, Employee_Name__c, Employee_Email__c
      FROM Employee__c
      WHERE Employee_Email__c = '${email}'
      LIMIT 1
    `)

    if (!employeeResult.records || employeeResult.records.length === 0) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }

    const employeeId = employeeResult.records[0].Id

    // Fetch all payroll records for this employee
    const payrollResult = await conn.query<any>(`
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
        Net_Salary__c,
        Payroll_Summary__r.Payroll_Month__c,
        Payroll_Summary__r.Payroll_Year__c,
        CreatedDate
      FROM Payroll__c
      WHERE Employee__c = '${employeeId}'
      ORDER BY CreatedDate DESC
    `)

    const payrolls = payrollResult.records.map((record: any) => ({
      id: record.Id,
      employeeId: record.Employee__c,
      employeeName: record.Employee__r?.Employee_Name__c || "Unknown",
      email: record.Employee__r?.Employee_Email__c || "",
      department: record.Employee__r?.Department__c || "",
      role: record.Employee__r?.Role__c || "",
      payrollMonth: record.Payroll_Summary__r?.Payroll_Month__c || record.Payroll_Month__c,
      payrollYear: record.Payroll_Summary__r?.Payroll_Year__c || new Date().getFullYear(),
      basicSalary: record.Basic_Salary__c || 0,
      bonus: record.Bonus__c || 0,
      totalAdditions: record.Total_Additions__c || 0,
      totalDeductions: record.Total_Deductions__c || 0,
      netSalary: record.Net_Salary__c || 0,
      createdDate: record.CreatedDate,
    }))

    return NextResponse.json({ payrolls })
  } catch (error) {
    console.error("Error fetching employee payrolls:", error)
    return NextResponse.json({ error: "Failed to fetch payrolls" }, { status: 500 })
  }
}
