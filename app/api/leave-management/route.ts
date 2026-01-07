import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import dayjs from "dayjs";
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

    const { employeeId, email, recordId, name, role, title } = payload;
    console.log("Payload:", payload);
    console.log("Authenticated user:", employeeId || name, email, recordId, "Role:", role, "Title:", title);

    // Use name as fallback if employeeId is not present
    const currentEmployeeId = employeeId || name || recordId;

    // Fetch leaves from Salesforce for this employee
    const conn = await getSalesforceConnection();
    
    // Query upcoming leaves for the current employee
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
        Approved_Date__c
      FROM Leave__c
      WHERE Employee__c = '${currentEmployeeId}'
      ORDER BY Start_Date__c DESC
    `);

    console.log("Fetched leave records:", leaveRecords);
    // Map Salesforce records to LeaveRequest format
    const leaves: LeaveRequest[] = leaveRecords.records.map((record: any) => ({
      id: record.Id,
      employeeId: currentEmployeeId,
      employeeName: record.Employee__r?.Employee_Name__c || email || name || "Unknown",
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

    // Fetch pending approvals if user is HR or Team Lead
    let pendingApprovals: LeaveRequest[] = [];
    
    if (role === 'HR') {
      const pendingLeaveRecords = await conn.query<any>(`
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
          TL_Approval__c,
          HR_Approval__c
        FROM Leave__c
        WHERE Status__c = 'Applied'
        ORDER BY Start_Date__c ASC
      `);

      console.log("Fetched pending approvals for HR:", pendingLeaveRecords);
      
      pendingApprovals = pendingLeaveRecords.records.map((record: any) => ({
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
        reason: '',
        tlApproved: record.TL_Approval__c,
        hrApproval: record.HR_Approval__c,
      }));
    } else if (role === 'Developer' && title === 'Team Lead') {
      // Fetch leaves for employees managed by this Team Lead
      const pendingLeaveRecords = await conn.query<any>(`
        SELECT 
          Id, 
          Employee__c,
          Employee__r.Employee_Name__c,
          Employee__r.Team_Lead__r.Employee_Name__c,
          Leave_Type__c,
          Leave_Category__c,
          Start_Date__c,
          End_Date__c,
          Total_Days__c,
          Status__c,
          Approved_Date__c,
          TL_Approval__c,
          HR_Approval__c
        FROM Leave__c
        WHERE Employee__r.Team_Lead__r.Employee_Name__c = '${name}'
        AND Status__c = 'Applied'
        ORDER BY Start_Date__c ASC
      `);

      console.log("Fetched pending approvals for Team Lead:", pendingLeaveRecords);
      
      pendingApprovals = pendingLeaveRecords.records.map((record: any) => ({
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
        reason: '',
        tlApproved: record.TL_Approval__c,
        hrApproval: record.HR_Approval__c,
      }));
    }

    return NextResponse.json({
      currentUser: {
        employeeId: currentEmployeeId,
        email,
        recordId,
        role,
        title,
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

    console.log("Payload 111:", payload);
    
    if (!payload) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const { employeeId, name, email } = payload;
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
      extraDayReason,
      onePlusTwoApplied,
      confirmedRules
    } = body;
    const rulesAlreadyConfirmed = confirmedRules === true;

    // Validate required fields
    if (!leaveCategory || !startDate || !endDate || !sessionValue) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const conn = await getSalesforceConnection();

    // --- Sandwich Rule Calculation ---
    // Fetch holidays from custom setting Holidays_List__c
    const holidayQuery = await conn.query<any>(
      "SELECT Name, Date__c, Day__c, Year__c FROM Holidays_List__c"
    );
    console.log("Fetched holidays:", holidayQuery);
    const holidayDates = (holidayQuery.records || [])
      .map((h: any) => h?.Date__c)
      .filter(Boolean)
      .map((d: string) => dayjs(d).format("YYYY-MM-DD"));
    const holidaySet = new Set(holidayDates);

    const start = dayjs(startDate);
    const end = dayjs(endDate);
    if (!start.isValid() || !end.isValid() || end.isBefore(start)) {
      return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
    }

    const isWeekend = (d: dayjs.Dayjs) => {
      const day = d.day();
      return day === 0 || day === 6;
    };
    const isHoliday = (d: dayjs.Dayjs) => holidaySet.has(d.format("YYYY-MM-DD"));
    const isNonWorking = (d: dayjs.Dayjs) => isWeekend(d) || isHoliday(d);

    const baseCalendarDays = end.diff(start, "day") + 1;
    const isHalfDay = (sessionValue === "Session-1" || sessionValue === "Session-2") && baseCalendarDays === 1;
    const clientDuration = typeof duration === "number" ? duration : undefined;
    const computedDuration = isHalfDay ? 0.5 : baseCalendarDays;
    const applyRules = leaveCategory === 'loss-of-pay' && leaveType === 'Planned Leave';

    // Block leaves that fall entirely on weekends/holidays
    const nonWorkingDays: string[] = [];
    let allNonWorking = true;
    let cursor = start.clone();
    while (cursor.isSame(end) || cursor.isBefore(end)) {
      const formatted = cursor.format("YYYY-MM-DD");
      if (isNonWorking(cursor)) {
        nonWorkingDays.push(formatted);
      } else {
        allNonWorking = false;
      }
      cursor = cursor.add(1, "day");
    }

    if (allNonWorking) {
      return NextResponse.json(
        {
          error: "Leave dates fall on weekends/holidays",
          details: {
            nonWorkingDays,
            message: "Select working days; weekends and holidays are not eligible for leave.",
          },
        },
        { status: 400 }
      );
    }

    let hasNonWorkingInside = false;
    cursor = start.clone();
    while (cursor.isSame(end) || cursor.isBefore(end)) {
      if (isNonWorking(cursor)) {
        hasNonWorkingInside = true;
        break;
      }
      cursor = cursor.add(1, "day");
    }

    let preSandwich = 0;
    cursor = start.subtract(1, "day");
    while (isNonWorking(cursor)) {
      preSandwich += 1;
      cursor = cursor.subtract(1, "day");
    }

    let postSandwich = 0;
    cursor = end.add(1, "day");
    while (isNonWorking(cursor)) {
      postSandwich += 1;
      cursor = cursor.add(1, "day");
    }

    const sandwichApplied = applyRules && (hasNonWorkingInside || (preSandwich > 0 && postSandwich > 0));
    const rangeLeaveDays = sandwichApplied ? baseCalendarDays : computedDuration;
    const sandwichExtra = sandwichApplied ? preSandwich + postSandwich : 0;
    const totalSandwichDeduction = rangeLeaveDays + sandwichExtra;

    // Server-side One+Two rule calculation (planned leave within 5 working days)
    const today = dayjs().startOf("day");
    let onePlusTwoExtra = 0;
    if (applyRules) {
      // Helper to count working days between two dates
      const countWorkingDaysBetween = (fromDate: dayjs.Dayjs, toDate: dayjs.Dayjs): number => {
        let workingDays = 0;
        let current = fromDate.clone();
        
        while (current.isBefore(toDate)) {
          if (!isNonWorking(current)) {
            workingDays++;
          }
          current = current.add(1, "day");
        }
        
        return workingDays;
      };
      
      let cursorPenalty = start.startOf("day");
      const endPenalty = end.startOf("day");
      while (cursorPenalty.isSame(endPenalty) || cursorPenalty.isBefore(endPenalty)) {
        // Count only working days between today and this leave day
        const workingDaysInAdvance = countWorkingDaysBetween(today, cursorPenalty);
        if (workingDaysInAdvance < 5) {
          onePlusTwoExtra += 2;
        }
        cursorPenalty = cursorPenalty.add(1, "day");
      }
    }
    const onePlusTwoRuleApplied = applyRules && onePlusTwoExtra > 0;
    const finalTotalAfterRules = totalSandwichDeduction + onePlusTwoExtra;

    console.log("[Sandwich Rule] Input", {
      startDate,
      endDate,
      sessionValue,
      leaveCategory,
      leaveType,
      applyRules,
      baseCalendarDays,
      clientDuration,
      computedDuration,
      holidayCount: holidaySet.size,
    });
    console.log("[Sandwich Rule] Holidays", holidayDates);
    console.log("[Sandwich Rule] Evaluation", {
      hasNonWorkingInside,
      preSandwich,
      postSandwich,
      sandwichApplied,
      rangeLeaveDays,
      sandwichExtra,
      totalSandwichDeduction,
      onePlusTwoExtra,
      onePlusTwoRuleApplied,
      finalTotalAfterRules,
    });

    if (applyRules && (sandwichApplied || onePlusTwoRuleApplied) && !rulesAlreadyConfirmed) {
      return NextResponse.json(
        {
          requiresConfirmation: true,
          message: "Additional rules applied to your leave. Please confirm.",
          details: {
            sandwichApplied,
            onePlusTwoRuleApplied,
            baseCalendarDays,
            rangeLeaveDays,
            sandwichExtra,
            totalSandwichDeduction,
            onePlusTwoExtra,
            finalTotalAfterRules,
          },
        },
        { status: 409 }
      );
    }

    // Prepare leave record based on category
    const leaveRecord: any = {
      Employee__c: employeeId,
      Start_Date__c: startDate,
      End_Date__c: endDate,
      Total_Days__c: rangeLeaveDays,
      Total_Days_After_Rule__c: finalTotalAfterRules,
      Session__c: sessionValue,
      Status__c: 'Applied',
      OnePlusTwo_Rule__c: onePlusTwoRuleApplied,
      Sandwich_Rule__c: sandwichApplied,
    };

    console.log("Prepared leave record:", leaveRecord);

    // Add fields based on leave category
    if (leaveCategory === 'loss-of-pay') {
      if (!leaveType) {
        return NextResponse.json({ error: "Leave type is required for loss of pay" }, { status: 400 });
      }
      leaveRecord.Leave_Type__c = leaveType;
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
      leaveId: result.id,
      totals: {
        baseCalendarDays,
        rangeLeaveDays,
        sandwichExtra,
        onePlusTwoExtra,
        finalTotalAfterRules,
        sandwichApplied,
        onePlusTwoRuleApplied,
      },
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

    const { employeeId } = payload;
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
      if (leave.Employee__c !== employeeId) {
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
      if (leave.Employee__c !== employeeId) {
        return NextResponse.json({ error: "Unauthorized to withdraw this leave" }, { status: 403 });
      }

      // Update the status to Withdrawn in Salesforce
      await conn.sobject('Leave__c').update({
        Id: leaveId,
        Status__c: 'Withdrawn',
      });

      return NextResponse.json({ success: true, message: "Leave withdrawn successfully" });
    }

    // Handle approve action (HR or Team Lead)
    if (action === "approve") {
      const { role, title } = payload;
      
      // Check if user is HR or Team Lead
      const isHR = role === 'HR';
      const isTeamLead = role === 'Developer' && title === 'Team Lead';
      console.log("Approval attempt by:", role, title, "isHR:", isHR, "isTeamLead:", isTeamLead);
      
      if (!isHR && !isTeamLead) {
        return NextResponse.json({ error: "Only HR or Team Lead can approve leaves" }, { status: 403 });
      }

      const leaveRecord = await conn.query<any>(`
        SELECT Id, Status__c
        FROM Leave__c
        WHERE Id = '${leaveId}'
        LIMIT 1
      `);

      if (leaveRecord.records.length === 0) {
        return NextResponse.json({ error: "Leave not found" }, { status: 404 });
      }

      // Update approval based on role
      const updateData: any = {
        Id: leaveId,
      };

      if (isHR) {
        updateData.HR_Approval__c = 'Approved';
        updateData.Approved_Date__c = new Date().toISOString();
      } else if (isTeamLead) {
        updateData.TL_Approval__c = 'Approved';
      }

      await conn.sobject('Leave__c').update(updateData);

      return NextResponse.json({ success: true, message: "Leave approved successfully" });
    }

    // Handle reject action (HR or Team Lead)
    if (action === "reject") {
      const { role, title } = payload;
      const { reason } = body;
      
      // Check if user is HR or Team Lead
      const isHR = role === 'HR';
      const isTeamLead = role === 'Developer' && title === 'Team Lead';
      
      if (!isHR && !isTeamLead) {
        return NextResponse.json({ error: "Only HR or Team Lead can reject leaves" }, { status: 403 });
      }

      const leaveRecord = await conn.query<any>(`
        SELECT Id, Status__c
        FROM Leave__c
        WHERE Id = '${leaveId}'
        LIMIT 1
      `);

      if (leaveRecord.records.length === 0) {
        return NextResponse.json({ error: "Leave not found" }, { status: 404 });
      }

      // Update rejection based on role
      const updateData: any = {
        Id: leaveId,
        Status__c: 'Rejected',
      };

      if (isHR) {
        updateData.HR_Approval__c = 'Rejected';
        updateData.Cancellation_Reason_HR__c = reason || '';
      } else if (isTeamLead) {
        updateData.TL_Approval__c = 'Rejected';
        updateData.Cancellation_Reason_TL__c = reason || '';
      }

      await conn.sobject('Leave__c').update(updateData);

      return NextResponse.json({ success: true, message: "Leave rejected successfully" });
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