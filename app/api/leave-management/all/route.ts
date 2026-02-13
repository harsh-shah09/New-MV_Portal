import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth-utils";
import { getSalesforceConnection } from "@/lib/salesforce";
import type { LeaveRequest } from "@/types";

export async function GET(request: NextRequest) {
  try {
    // Get session from cookies
    const cookieStore = await cookies();
    const session = cookieStore.get("session")?.value;

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify the session token
    const payload = await verifyToken(session);

    if (!payload) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const { role } = payload;

    // Only HR and Admin can access all leaves
    if (role !== 'HR' && role !== 'Admin') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const conn = await getSalesforceConnection();

    // Query all leaves
    const leaveRecords = await conn.query<any>(`
      SELECT 
        Id, 
        Employee__c,
        Employee__r.Employee_Name__c,
        Leave_Type__c,
        Leave_Category__c,
        Start_Date__c,
        End_Date__c,
        Total_Days__c,
        Status__c,
        Approved_Date__c,
        Reason__c,
        TL_Approval__c,
        HR_Approval__c
      FROM Leave__c
      ORDER BY Start_Date__c DESC
      LIMIT 1000
    `);

    console.log("Fetched all leave records:", leaveRecords.totalSize);

    // Map Salesforce records to LeaveRequest format
    const allLeaves: LeaveRequest[] = leaveRecords.records.map((record: any) => ({
      id: record.Id,
      employeeId: record.Employee__c,
      employeeName: record.Employee__r?.Employee_Name__c || "Unknown",
      leaveType: record.Leave_Category__c === 'Extra Day Pay' ? 'Extra Day Pay' : (record.Leave_Type__c || ""),
      leaveCategory: record.Leave_Category__c,
      startDate: record.Start_Date__c || "",
      endDate: record.End_Date__c || "",
      duration: record.Total_Days__c || 0,
      status: record.Status__c?.toLowerCase() || "pending",
      approvedBy: record.Approved_By__c,
      approvalDate: record.Approved_Date__c,
      reason: record.Reason__c || '',
      tlApproved: record.TL_Approval__c,
      hrApproval: record.HR_Approval__c,
    }));

    return NextResponse.json({
      allLeaves,
    });
  } catch (error) {
    console.error("Error fetching all leaves:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
