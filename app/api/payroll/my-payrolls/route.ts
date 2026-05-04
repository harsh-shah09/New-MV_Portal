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

    // Fetch payroll records that are released to employees (Paid summaries only)
    const payrollResult = await conn.query<any>(`
      SELECT 
        Id,
        Employee__c,
        Employee__r.Name,
        Employee__r.Employee_Id__c,
        Employee__r.Employee_Name__c,
        Employee__r.Employee_Email__c,
        Employee__r.Department__c,
        Employee__r.Role__c,
        Employee__r.Salary_CTC__c,
        Employee__r.Basic_Console__c,
        Employee__r.HRA__c,
        Employee__r.CONV__c,
        Employee__r.S_All__c,
        Employee__r.PF_Basic__c,
        Employee__r.PF__c,
        Employee__r.PT__c,
        Employee__r.ESI__c,
        Payroll_Month__c,
        Basic_Salary__c,
        Bonus__c,
        Adjustment_Type__c,
        Adjustment_Amount__c,
        Adjustment_Description__c,
        Total_Additions__c,
        Total_Deductions__c,
        Net_Salary__c,
        Payroll_Summary__r.Status__c,
        Payroll_Summary__r.Payroll_Month__c,
        Payroll_Summary__r.Payroll_Year__c,
        CreatedDate
      FROM Payroll__c
      WHERE Employee__c = '${employeeId}'
      AND Payroll_Summary__r.Status__c = 'Paid'
      ORDER BY CreatedDate DESC
    `)

    const round2 = (value: number) => Math.round((Number(value) || 0) * 100) / 100
    const toNumber = (value: any) => Number.isFinite(Number(value)) ? Number(value) : 0

    const payrolls = payrollResult.records.map((record: any) => ({
      id: record.Id,
      employeeId: record.Employee__r?.Employee_Id__c || record.Employee__c,
      employeeName: record.Employee__r?.Employee_Name__c || "Unknown",
      email: record.Employee__r?.Employee_Email__c || "",
      department: record.Employee__r?.Department__c || "",
      role: record.Employee__r?.Role__c || "",
      payrollMonth: record.Payroll_Summary__r?.Payroll_Month__c || record.Payroll_Month__c,
      payrollYear: record.Payroll_Summary__r?.Payroll_Year__c || new Date().getFullYear(),
      monthlyIncome: record.Basic_Salary__c || record.Employee__r?.Salary_CTC__c || 0,
      basicSalary: record.Basic_Salary__c || record.Employee__r?.Salary_CTC__c || 0,
      basicComponent: round2(toNumber(record.Employee__r?.Salary_CTC__c || record.Basic_Salary__c) * (toNumber(record.Employee__r?.Basic_Console__c) / 100)),
      hraComponent: round2(toNumber(record.Employee__r?.Salary_CTC__c || record.Basic_Salary__c) * (toNumber(record.Employee__r?.HRA__c) / 100)),
      convComponent: round2(toNumber(record.Employee__r?.Salary_CTC__c || record.Basic_Salary__c) * (toNumber(record.Employee__r?.CONV__c) / 100)),
      specialAllowanceComponent: round2(toNumber(record.Employee__r?.Salary_CTC__c || record.Basic_Salary__c) * (toNumber(record.Employee__r?.S_All__c) / 100)),
      grossIncome: round2(
        round2(toNumber(record.Employee__r?.Salary_CTC__c || record.Basic_Salary__c) * (toNumber(record.Employee__r?.Basic_Console__c) / 100)) +
        round2(toNumber(record.Employee__r?.Salary_CTC__c || record.Basic_Salary__c) * (toNumber(record.Employee__r?.HRA__c) / 100)) +
        round2(toNumber(record.Employee__r?.Salary_CTC__c || record.Basic_Salary__c) * (toNumber(record.Employee__r?.CONV__c) / 100)) +
        round2(toNumber(record.Employee__r?.Salary_CTC__c || record.Basic_Salary__c) * (toNumber(record.Employee__r?.S_All__c) / 100))
      ),
      pfDeduction: round2(toNumber(record.Employee__r?.PF_Basic__c) * (toNumber(record.Employee__r?.PF__c) / 100)),
      ptDeduction: round2(toNumber(record.Employee__r?.PT__c)),
      esiDeduction: round2(
        round2(
          round2(toNumber(record.Employee__r?.Salary_CTC__c || record.Basic_Salary__c) * (toNumber(record.Employee__r?.Basic_Console__c) / 100)) +
          round2(toNumber(record.Employee__r?.Salary_CTC__c || record.Basic_Salary__c) * (toNumber(record.Employee__r?.HRA__c) / 100)) +
          round2(toNumber(record.Employee__r?.Salary_CTC__c || record.Basic_Salary__c) * (toNumber(record.Employee__r?.CONV__c) / 100)) +
          round2(toNumber(record.Employee__r?.Salary_CTC__c || record.Basic_Salary__c) * (toNumber(record.Employee__r?.S_All__c) / 100))
        ) * (toNumber(record.Employee__r?.ESI__c) / 100)
      ),
      bonus: record.Bonus__c || 0,
      totalAdditions: record.Total_Additions__c || 0,
      totalDeductions: record.Total_Deductions__c || 0,
      netSalary: record.Net_Salary__c || 0,
      summaryStatus: record.Payroll_Summary__r?.Status__c || "",
      createdDate: record.CreatedDate,
    }))

    return NextResponse.json({ payrolls })
  } catch (error) {
    console.error("Error fetching employee payrolls:", error)
    return NextResponse.json({ error: "Failed to fetch payrolls" }, { status: 500 })
  }
}
