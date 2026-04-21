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

    const { role } = payload
    if (role !== "HR" && role !== "Admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const conn = await getSalesforceConnection()
    if (!conn) {
      return NextResponse.json({ error: "Failed to connect to Salesforce" }, { status: 500 })
    }

    // Fetch all payroll summaries
    const summaries = await conn.query<any>(`
      SELECT 
        Id,
        Payroll_Month__c,
        Payroll_Year__c,
        Status__c,
        Period_Type__c,
        Total_Employees__c,
        Net_Total_Salary__c,
        CreatedDate
      FROM Payroll_Summary__c
      ORDER BY Payroll_Year__c DESC, CreatedDate DESC
    `)

    const approvedLeaves = await conn.query<any>(`
      SELECT Start_Date__c, Total_Days_After_Rule__c
      FROM Leave__c
      WHERE Status__c = 'Approved'
      AND Start_Date__c != NULL
    `)

    const leaveDaysAfterRuleByMonth = new Map<string, number>()
    approvedLeaves.records.forEach((record: any) => {
      const startDate = record.Start_Date__c
      if (!startDate) return

      const date = new Date(startDate)
      const key = `${date.getFullYear()}-${date.getMonth() + 1}`
      const existing = leaveDaysAfterRuleByMonth.get(key) || 0
      const value = Number(record.Total_Days_After_Rule__c || 0)
      leaveDaysAfterRuleByMonth.set(key, existing + value)
    })

    const monthNameToNumber: Record<string, number> = {
      january: 1,
      february: 2,
      march: 3,
      april: 4,
      may: 5,
      june: 6,
      july: 7,
      august: 8,
      september: 9,
      october: 10,
      november: 11,
      december: 12,
    }

    const payrollSummaries = summaries.records.map((record: any) => {
      const monthName = String(record.Payroll_Month__c || "").toLowerCase()
      const monthNumber = monthNameToNumber[monthName]
      const year = Number(record.Payroll_Year__c || 0)
      const monthKey = monthNumber ? `${year}-${monthNumber}` : ""

      return {
        id: record.Id,
        month: record.Payroll_Month__c,
        year: record.Payroll_Year__c,
        totalEmployees: record.Total_Employees__c || 0,
        totalDaysAfterRule: monthKey ? Math.round((leaveDaysAfterRuleByMonth.get(monthKey) || 0) * 100) / 100 : 0,
        netTotalSalary: record.Net_Total_Salary__c || 0,
        status: record.Status__c?.toLowerCase() || "draft",
        createdAt: record.CreatedDate,
      }
    })

    return NextResponse.json({ summaries: payrollSummaries })
  } catch (error) {
    console.error("Error fetching payroll summaries:", error)
    return NextResponse.json({ error: "Failed to fetch payroll summaries" }, { status: 500 })
  }
}