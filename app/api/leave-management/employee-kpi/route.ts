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

    const employeeId = request.nextUrl.searchParams.get("employeeId")
    if (!employeeId) {
      return NextResponse.json({ error: "employeeId is required" }, { status: 400 })
    }

    const conn = await getSalesforceConnection()

    const escapedEmployeeId = employeeId.replace(/'/g, "\\'")
    const currentYear = new Date().getFullYear()

    const leaveBalanceQuery = await conn.query<any>(`
      SELECT Annual_Leave_Remaining__c, Sick_Leave_Count__c, Emergency_Leave_Count__c, Planned_Leave_Count__c
      FROM Leave_Balance__c
      WHERE Employee__c = '${escapedEmployeeId}'
      AND Year__c = ${currentYear}
      LIMIT 1
    `)

    const configQuery = await conn.query<any>(
      "SELECT DeveloperName, Value__c FROM Leave_Configurations__mdt WHERE DeveloperName = 'Annual_Leave_Balance' LIMIT 1"
    )

    const configuredAnnualBalance = parseFloat(configQuery.records?.[0]?.Value__c || "18")
    const record = leaveBalanceQuery.records?.[0]

    return NextResponse.json({
      annualLeaveRemaining: record?.Annual_Leave_Remaining__c ?? configuredAnnualBalance,
      sickLeaveCount: record?.Sick_Leave_Count__c ?? 0,
      emergencyLeaveCount: record?.Emergency_Leave_Count__c ?? 0,
      plannedLeaveCount: record?.Planned_Leave_Count__c ?? 0,
    })
  } catch (error) {
    console.error("Error fetching employee leave KPI:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
