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

    const { employeeId, email, recordId, name } = payload;
    console.log("Payload:", payload);
    console.log("Authenticated user:", employeeId || name, email, recordId);

    // Use name as fallback if employeeId is not present
    const currentEmployeeId = employeeId || name || recordId;

    // Fetch leaves from Salesforce for this employee
    const conn = await getSalesforceConnection();
    
    // Query upcoming leaves for the current employee
    const leaveRecords = await conn.query<any>(`
      SELECT 
        Id, 
        Employee__c,
        Employee__r.Contact__r.Name,
        Leave_Type__c,
        Leave_Category__c,
        Start_Date__c,
        End_Date__c,
        Total_Days__c,
        Status__c,
        Approved_Date__c
      FROM Leave__c
      WHERE Employee__c = '${recordId}'
      ORDER BY Start_Date__c DESC
    `);

    console.log("Fetched leave records:", leaveRecords);
    // Map Salesforce records to LeaveRequest format
    const leaves: LeaveRequest[] = leaveRecords.records.map((record: any) => ({
      id: record.Id,
      employeeId: currentEmployeeId,
      employeeName: record.Employee__r?.Contact__r?.Name || email || name || "Unknown",
      leaveType: record.Leave_Category__c === 'Extra Day Pay' ? 'Extra Day Pay' : (record.Leave_Type__c || ""),
      leaveCategory: record.Leave_Category__c,
      startDate: record.Start_Date__c || "",
      endDate: record.End_Date__c || "",
      duration: record.Total_Days__c || 0,
      status: record.Status__c?.toLowerCase() || "pending",
      approvedBy: record.Approved_By__c,
      approvalDate: record.Approved_Date__c,
      reason : '',
    }));

    // For now, pending approvals would be managed differently (manager view)
    // This endpoint is for the current employee's leaves only
    const pendingApprovals: LeaveRequest[] = [];

    return NextResponse.json({
      currentUser: {
        employeeId: currentEmployeeId,
        email,
        recordId,
      },
      leaves,
      pendingApprovals,
    });
  } catch (error) {
    console.error("Error fetching leave management data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    const { recordId, name, email } = payload;
    const body = await request.json();
    console.log("Request body:", body);

    const { 
      leaveCategory, 
      leaveType, 
      startDate, 
      endDate, 
      duration, 
      totalDeduction,
      session: sessionValue,
      extraDayReason 
    } = body;

    // Validate required fields
    if (!leaveCategory || !startDate || !endDate || !sessionValue) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const conn = await getSalesforceConnection();

    // Prepare leave record based on category
    const leaveRecord: any = {
      Employee__c: recordId,
      Start_Date__c: startDate,
      End_Date__c: endDate,
      Total_Days__c: duration || 0,
      Total_Days_After_Rule__c: totalDeduction || duration || 0,
      Session__c: sessionValue,
      Status__c: 'Applied',
    };

    // Add fields based on leave category
    if (leaveCategory === 'loss-of-pay') {
      if (!leaveType) {
        return NextResponse.json({ error: "Leave type is required for loss of pay" }, { status: 400 });
      }
      leaveRecord.Leave_Type__c = mapLeaveTypeToSalesforce(leaveType);
      leaveRecord.Leave_Category__c = 'Loss of Pay';
    } else if (leaveCategory === 'extra-day-pay') {
      if (!extraDayReason) {
        return NextResponse.json({ error: "Extra day reason is required for extra day pay" }, { status: 400 });
      }
      leaveRecord.Extra_Day_Reason__c = extraDayReason;
      leaveRecord.Leave_Category__c = 'Extra Day Pay';
    }

    // Create the leave record in Salesforce
    const result = await conn.sobject('Leave__c').create(leaveRecord) as any;

    if (!result.success) {
      console.error("Failed to create leave record:", result);
      return NextResponse.json({ error: "Failed to create leave request" }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: "Leave request submitted successfully",
      leaveId: result.id 
    });
  } catch (error) {
    console.error("Error creating leave request:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
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

    const { recordId } = payload;
    const body = await request.json();
    const { leaveId, action } = body;

    if (!leaveId || !action) {
      return NextResponse.json({ error: "Missing leaveId or action" }, { status: 400 });
    }

    const conn = await getSalesforceConnection();

    // Handle cancel action
    if (action === "cancel") {
      // Verify the leave belongs to the current user
      const leaveRecord = await conn.query<any>(`
        SELECT Id, Employee__c, Status__c
        FROM Leave__c
        WHERE Id = '${leaveId}'
        LIMIT 1
      `);

      if (leaveRecord.records.length === 0) {
        return NextResponse.json({ error: "Leave not found" }, { status: 404 });
      }

      const leave = leaveRecord.records[0];

      // Check if the leave belongs to the current user
      if (leave.Employee__c !== recordId) {
        return NextResponse.json({ error: "Unauthorized to cancel this leave" }, { status: 403 });
      }

      // Update the status to Cancelled in Salesforce
      await conn.sobject('Leave__c').update({
        Id: leaveId,
        Status__c: 'Cancelled',
      });

      return NextResponse.json({ success: true, message: "Leave cancelled successfully" });
    }

    // Handle withdraw action
    if (action === "withdraw") {
      // Verify the leave belongs to the current user
      const leaveRecord = await conn.query<any>(`
        SELECT Id, Employee__c, Status__c
        FROM Leave__c
        WHERE Id = '${leaveId}'
        LIMIT 1
      `);

      if (leaveRecord.records.length === 0) {
        return NextResponse.json({ error: "Leave not found" }, { status: 404 });
      }

      const leave = leaveRecord.records[0];

      // Check if the leave belongs to the current user
      if (leave.Employee__c !== recordId) {
        return NextResponse.json({ error: "Unauthorized to withdraw this leave" }, { status: 403 });
      }

      // Update the status to Withdrawn in Salesforce
      await conn.sobject('Leave__c').update({
        Id: leaveId,
        Status__c: 'Withdrawn',
      });

      return NextResponse.json({ success: true, message: "Leave withdrawn successfully" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error updating leave:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Helper function to map frontend leave types to Salesforce
function mapLeaveTypeToSalesforce(frontendType: string): string {
  const typeMap: Record<string, string> = {
    "planned": "Planned Leave",
    "sick": "Sick Leave",
    "emergency": "Emergency Leave",
  };
  return typeMap[frontendType] || "Planned Leave";
}