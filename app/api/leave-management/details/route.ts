import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifyToken } from "@/lib/auth-utils"
import { getSalesforceConnection } from "@/lib/salesforce"
import type { LeaveRequest } from "@/types"

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

    const { employeeId, recordId, name, role, title } = payload
    const currentEmployeeId = employeeId || name || recordId

    const leaveId = request.nextUrl.searchParams.get("leaveId")
    if (!leaveId) {
      return NextResponse.json({ error: "leaveId is required" }, { status: 400 })
    }

    if (!/^[a-zA-Z0-9]{15,18}$/.test(leaveId)) {
      return NextResponse.json({ error: "Invalid leaveId" }, { status: 400 })
    }

    const conn = await getSalesforceConnection()

    const detailsQuery = await conn.query<any>(`
      SELECT
        Id,
        Employee__c,
        Employee__r.Name,
        Employee__r.Employee_Id__c,
        Employee__r.Employee_Name__c,
        Employee__r.Team_Lead__r.Employee_Name__c,
        Start_Date__c,
        End_Date__c,
        Leave_Category__c,
        Leave_Type__c,
        Total_Days__c,
        Total_Days_After_Rule__c,
        Reason__c,
        Status__c,
        TL_Approval__c,
        HR_Approval__c,
        Approved_Date__c,
        Cancellation_Reason_TL__c,
        Cancellation_Reason_HR__c,
        OnePlusTwo_Rule__c,
        Sandwich_Rule__c,
        Session_Start__c,
        Session_End__c
      FROM Leave__c
      WHERE Id = '${leaveId}'
      LIMIT 1
    `)

    if (!detailsQuery.records || detailsQuery.records.length === 0) {
      return NextResponse.json({ error: "Leave not found" }, { status: 404 })
    }

    const record = detailsQuery.records[0]

    const isHRorAdmin = role === "HR" || role === "Admin"
    const isTeamLead = role === "Developer" && title === "Team Lead"
    const isSelf = record.Employee__c === currentEmployeeId
    const isTeamLeadEmployee = isTeamLead && record.Employee__r?.Team_Lead__r?.Employee_Name__c === name

    if (!isHRorAdmin && !isSelf && !isTeamLeadEmployee) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const leave: LeaveRequest = {
      id: record.Id,
      employeeId: record.Employee__c || "",
      employeeRecordName: record.Employee__r?.Employee_Id__c || "",
      employeeName: record.Employee__r?.Employee_Name__c || "Unknown",
      teamLeadName: record.Employee__r?.Team_Lead__r?.Employee_Name__c || undefined,
      startDate: record.Start_Date__c || "",
      endDate: record.End_Date__c || "",
      leaveCategory: record.Leave_Category__c || "",
      leaveType: record.Leave_Type__c || "",
      duration: record.Total_Days__c || 0,
      totalDaysAfterRule: record.Total_Days_After_Rule__c || 0,
      reason: record.Reason__c || "",
      status: record.Status__c?.toLowerCase() || "pending",
      tlApproved: record.TL_Approval__c || undefined,
      hrApproval: record.HR_Approval__c || undefined,
      approvalDate: record.Approved_Date__c || undefined,
      tlRejectionReason: record.Cancellation_Reason_TL__c || undefined,
      hrRejectionReason: record.Cancellation_Reason_HR__c || undefined,
      onePlusTwoRuleApplicable: record.OnePlusTwo_Rule__c === true,
      sandwichRuleApplicable: record.Sandwich_Rule__c === true,
      sessionStart: record.Session_Start__c || undefined,
      sessionEnd: record.Session_End__c || undefined,
      session: record.Session_Start__c && record.Session_End__c
        ? record.Session_Start__c === record.Session_End__c
          ? record.Session_Start__c
          : `${record.Session_Start__c} → ${record.Session_End__c}`
        : undefined,
    }

    return NextResponse.json({ leave })
  } catch (error) {
    console.error("Error fetching leave details:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
