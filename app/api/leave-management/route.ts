import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import dayjs from "dayjs";
import { verifyToken } from "@/lib/auth-utils";
import { getSalesforceConnection } from "@/lib/salesforce";
import { sendEmailAsync, getHREmail } from "@/lib/email";
import {
  newLeaveRequestToTeamLead,
  teamLeadLeaveRequestToHR,
  hrLeaveRequestToAdmin,
  tlApprovalToHR,
  leaveApprovedByTL,
  leaveApprovedFinal,
  leaveRejected,
  leaveWithdrawn,
} from "@/lib/email-templates";
import type { LeaveRequest } from "@/types";

/**
 * Leave Configuration Interface
 */
interface LeaveConfig {
  annualLeaveBalance: number;
  enableOnePlusTwoRule: boolean;
  enableSandwichRule: boolean;
  sandwichRuleAppliesTo: string[];
  penaltyAppliesTo: string[];
  minWorkingDayNoticePeriod: number;
  penaltyDaysPerDay: number;
}

/**
 * Fetch Leave Configurations from Salesforce Custom Metadata
 */
async function fetchLeaveConfigurations(conn: any): Promise<LeaveConfig> {
  try {
    const configQuery = await conn.query(
      "SELECT DeveloperName, Value__c FROM Leave_Configurations__mdt"
    );

    const configs = configQuery.records || [];
    const configMap = new Map<string, string>();
    
    configs.forEach((config: any) => {
      configMap.set(config.DeveloperName, config.Value__c);
    });

    // Parse configurations with defaults
    const annualLeaveBalance = parseFloat(configMap.get('Annual_Leave_Balance') || '18');
    const enableOnePlusTwoRule = configMap.get('Enable_One_plus_two_rule')?.toLowerCase() === 'true';
    const enableSandwichRule = configMap.get('Enable_Sandwitch_Rule')?.toLowerCase() === 'true';
    const sandwichRuleAppliesTo = (configMap.get('Sandwitch_Rule_Applies_to') || '')
      .split(',').map(role => role.trim()).filter(Boolean);
    const penaltyAppliesTo = (configMap.get('penalty_applies_to') || '')
      .split(',').map(role => role.trim()).filter(Boolean);
    const minWorkingDayNoticePeriod = parseInt(configMap.get('minimum_working_working_day_notice_perio') || '5');
    const penaltyDaysPerDay = parseFloat(configMap.get('penalty_days_per_day') || '2');

    console.log('[Leave Config] Fetched configurations:', {
      annualLeaveBalance,
      enableOnePlusTwoRule,
      enableSandwichRule,
      sandwichRuleAppliesTo,
      penaltyAppliesTo,
      minWorkingDayNoticePeriod,
      penaltyDaysPerDay,
    });

    return {
      annualLeaveBalance,
      enableOnePlusTwoRule,
      enableSandwichRule,
      sandwichRuleAppliesTo,
      penaltyAppliesTo,
      minWorkingDayNoticePeriod,
      penaltyDaysPerDay,
    };
  } catch (error) {
    console.error('Error fetching leave configurations:', error);
    // Return defaults if fetch fails
    return {
      annualLeaveBalance: 18,
      enableOnePlusTwoRule: true,
      enableSandwichRule: true,
      sandwichRuleAppliesTo: ['Developer'],
      penaltyAppliesTo: ['Developer'],
      minWorkingDayNoticePeriod: 5,
      penaltyDaysPerDay: 2,
    };
  }
}

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
      reason: '',
    }));

    // Fetch pending approvals based on user role
    let pendingApprovals: LeaveRequest[] = [];

    // Admin can approve HR leaves
    if (role === 'Admin') {
      const pendingLeaveRecords = await conn.query<any>(`
        SELECT 
          Id, 
          Employee__c,
          Employee__r.Employee_Name__c,
          Employee__r.Role__c,
          Leave_Type__c,
          Leave_Category__c,
          Start_Date__c,
          End_Date__c,
          Total_Days__c,
          Status__c,
          Approved_Date__c,
          TL_Approval__c,
          HR_Approval__c,
          Reason__c
        FROM Leave__c
        WHERE Status__c = 'Applied'
        AND Employee__r.Role__c = 'HR'
        ORDER BY Start_Date__c ASC
      `);

      console.log("Fetched pending HR approvals for Admin:", pendingLeaveRecords);

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
        reason: record.Reason__c || '',
        tlApproved: record.TL_Approval__c,
        hrApproval: record.HR_Approval__c,
      }));
    } else if (role === 'HR') {
      // HR can approve regular employees and Team Lead leaves (but not their own)
      const pendingLeaveRecords = await conn.query<any>(`
        SELECT 
          Id, 
          Employee__c,
          Employee__r.Employee_Name__c,
          Employee__r.Role__c,
          Employee__r.Title__c,
          Leave_Type__c,
          Leave_Category__c,
          Start_Date__c,
          End_Date__c,
          Total_Days__c,
          Status__c,
          Approved_Date__c,
          TL_Approval__c,
          HR_Approval__c,
          Reason__c
        FROM Leave__c
        WHERE Status__c = 'Applied'
        AND Employee__r.Role__c != 'HR'
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
        reason: record.Reason__c || '',
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
          HR_Approval__c,
          Reason__c
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
        reason: record.Reason__c || '',
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

    const { employeeId, name, email, role, title } = payload;
    const body = await request.json();
    console.log("Request body:", body);
    console.log("Submitting user - Role:", role, "Title:", title);

    const {
      leaveCategory,
      leaveType,
      startDate,
      endDate,
      duration,
      totalDeduction,
      session: sessionValue,
      reason,
      onePlusTwoApplied,
      confirmedRules
    } = body;
    const rulesAlreadyConfirmed = confirmedRules === true;

    console.log('Duration received from client:', duration);

    // Validate required fields
    if (!leaveCategory || !startDate || !endDate || !sessionValue) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Validate that leave is not being applied for past dates
    const today = dayjs().startOf("day");
    const leaveStartDate = dayjs(startDate).startOf("day");

    if (leaveStartDate.isBefore(today)) {
      return NextResponse.json({
        error: "Cannot apply leave for past dates",
        details: {
          message: "Leave start date cannot be in the past. Please select a current or future date."
        }
      }, { status: 400 });
    }

    const conn = await getSalesforceConnection();

    // Fetch dynamic leave configurations
    const leaveConfig = await fetchLeaveConfigurations(conn);

    // Check if sandwich rule applies to this user's role
    const sandwichRuleAppliesToUser = leaveConfig.sandwichRuleAppliesTo.includes(role);
    // Check if penalty (one+two rule) applies to this user's role
    const penaltyAppliesToUser = leaveConfig.penaltyAppliesTo.includes(role);

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
    const isHalfDay = (sessionValue === "Session-1" || sessionValue === "Session-2");
    const clientDuration = typeof duration === "number" ? duration : undefined;
    // For session-based leaves: calculate as half-days (e.g., 5 days = 2.5 days)
    const computedDuration = isHalfDay ? baseCalendarDays * 0.5 : baseCalendarDays;
    const applyRules = leaveCategory === 'loss-of-pay' && leaveType === 'Planned Leave';
    // Sandwich rule applies only if: enabled, user role is eligible, not half-day leave
    const applySandwichRule = applyRules && !isHalfDay && leaveConfig.enableSandwichRule && sandwichRuleAppliesToUser;

    // Block leaves that fall entirely on weekends/holidays (ONLY for Loss of Pay)
    // Extra Day Pay can ONLY be applied on weekends/holidays
    if (leaveCategory === 'loss-of-pay') {
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
              message: "Select working days; weekends and holidays are not eligible for Loss of Pay leave.",
            },
          },
          { status: 400 }
        );
      }
    } else if (leaveCategory === 'extra-day-pay') {
      // Extra Day Pay can ONLY be applied on weekends/holidays
      const workingDays: string[] = [];
      let hasWorkingDay = false;
      let cursor = start.clone();
      while (cursor.isSame(end) || cursor.isBefore(end)) {
        const formatted = cursor.format("YYYY-MM-DD");
        if (!isNonWorking(cursor)) {
          workingDays.push(formatted);
          hasWorkingDay = true;
        }
        cursor = cursor.add(1, "day");
      }

      if (hasWorkingDay) {
        return NextResponse.json(
          {
            error: "Extra Day Pay can only be applied on weekends/holidays",
            details: {
              workingDays,
              message: "Extra Day Pay is only allowed for weekends and holidays. Please select only non-working days.",
            },
          },
          { status: 400 }
        );
      }
    }

    // Sandwich rule calculation (only for Loss of Pay and NOT for half-day leaves)
    let hasNonWorkingInside = false;
    let cursor = start.clone();

    if (applySandwichRule) {
      while (cursor.isSame(end) || cursor.isBefore(end)) {
        if (isNonWorking(cursor)) {
          hasNonWorkingInside = true;
          break;
        }
        cursor = cursor.add(1, "day");
      }
    }

    let preSandwich = 0;
    if (applySandwichRule) {
      cursor = start.subtract(1, "day");
      while (isNonWorking(cursor)) {
        preSandwich += 1;
        cursor = cursor.subtract(1, "day");
      }
    }

    let postSandwich = 0;
    if (applySandwichRule) {
      cursor = end.add(1, "day");
      while (isNonWorking(cursor)) {
        postSandwich += 1;
        cursor = cursor.add(1, "day");
      }
    }

    const sandwichApplied = applySandwichRule && (hasNonWorkingInside || (preSandwich > 0 && postSandwich > 0));
    const rangeLeaveDays = sandwichApplied ? baseCalendarDays : computedDuration;
    const sandwichExtra = sandwichApplied ? preSandwich + postSandwich : 0;
    const totalSandwichDeduction = rangeLeaveDays + sandwichExtra;

    // Server-side One+Two rule calculation (planned leave within minimum working day notice period)
    // Only applies to full-day leaves, NOT half-day leaves
    let onePlusTwoExtra = 0;
    if (applyRules && !isHalfDay && leaveConfig.enableOnePlusTwoRule && penaltyAppliesToUser) {
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

      // For full-day: penalty is penaltyDaysPerDay days per day
      const penaltyMultiplier = leaveConfig.penaltyDaysPerDay;

      let cursorPenalty = start.startOf("day");
      const endPenalty = end.startOf("day");
      while (cursorPenalty.isSame(endPenalty) || cursorPenalty.isBefore(endPenalty)) {
        // Count only working days between today and this leave day
        const workingDaysInAdvance = countWorkingDaysBetween(today, cursorPenalty);
        if (workingDaysInAdvance < leaveConfig.minWorkingDayNoticePeriod) {
          onePlusTwoExtra += penaltyMultiplier;
        }
        cursorPenalty = cursorPenalty.add(1, "day");
      }
    }
    const onePlusTwoRuleApplied = applyRules && onePlusTwoExtra > 0;
    const finalTotalAfterRules = totalSandwichDeduction + onePlusTwoExtra;

    console.log("[Leave Rules] Input", {
      startDate,
      endDate,
      sessionValue,
      leaveCategory,
      leaveType,
      applyRules,
      isHalfDay,
      baseCalendarDays,
      clientDuration,
      computedDuration,
      holidayCount: holidaySet.size,
    });
    console.log("[Leave Rules] Holidays", holidayDates);
    console.log("[Leave Rules] Evaluation", {
      hasNonWorkingInside,
      preSandwich,
      postSandwich,
      sandwichApplied,
      applySandwichRule,
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
      if (!reason) {
        return NextResponse.json({ error: "Leave reason is required" }, { status: 400 });
      }
      leaveRecord.Leave_Type__c = leaveType;
      leaveRecord.Leave_Category__c = 'Loss of Pay';
      leaveRecord.Reason__c = reason;
    } else if (leaveCategory === 'extra-day-pay') {
      if (!reason) {
        return NextResponse.json({ error: "Leave reason is required" }, { status: 400 });
      }
      leaveRecord.Leave_Category__c = 'Extra Day Pay';
      leaveRecord.Reason__c = reason;
    }

    // Create the leave record in Salesforce
    const result = await conn.sobject('Leave__c').create(leaveRecord) as any;

    if (!result.success) {
      console.error("Failed to create leave record:", result);
      return NextResponse.json({ error: "Failed to create leave request" }, { status: 500 });
    }

    // After Insert: Send email notification based on employee role/title
    try {
      const empData = await conn.query<any>(`
        SELECT Id, Employee_Name__c, Role__c, Title__c, Team_Lead__c, 
               Team_Lead__r.Employee_Name__c, Team_Lead__r.Employee_Email__c
        FROM Employee__c
        WHERE Id = '${employeeId}'
        LIMIT 1
      `);

      if (empData.records && empData.records.length > 0) {
        const emp = empData.records[0];
        const employeeName = emp.Employee_Name__c || name;
        const employeeRole = emp.Role__c || role;
        const employeeTitle = emp.Title__c || title;

        console.log("Employee applying leave - Name:", employeeName, "Role:", employeeRole, "Title:", employeeTitle);

        // Case 1: If employee is HR, send notification to Admin
        if (employeeRole === 'HR') {
          // Find Admin employee
          const adminQuery = await conn.query<any>(`
            SELECT Id, Employee_Name__c, Employee_Email__c
            FROM Employee__c
            WHERE Role__c = 'Admin'
            LIMIT 1
          `);

          if (adminQuery.records && adminQuery.records.length > 0) {
            const admin = adminQuery.records[0];
            const adminEmail = admin.Employee_Email__c;
            const adminName = admin.Employee_Name__c;

            if (adminEmail) {
              const emailTemplate = hrLeaveRequestToAdmin({
                recipientName: adminName,
                employeeName,
                leaveType: leaveType || 'N/A',
                startDate: start.format('YYYY-MM-DD'),
                endDate: end.format('YYYY-MM-DD'),
                duration: duration
              });
              sendEmailAsync({
                to: adminEmail,
                subject: emailTemplate.subject,
                body: emailTemplate.html
              });
              console.log("Email sent to Admin:", adminEmail);
            }
          } else {
            console.log("No Admin found to send notification for HR leave");
          }
        }
        // Case 2: If employee is Team Lead, send notification directly to HR
        else if (employeeRole === 'Developer' && employeeTitle === 'Team Lead') {
          const emailTemplate = teamLeadLeaveRequestToHR({
            recipientName: 'HR Team',
            employeeName,
            leaveType: leaveType || 'N/A',
            startDate: start.format('YYYY-MM-DD'),
            endDate: end.format('YYYY-MM-DD'),
            duration: duration
          });
          sendEmailAsync({
            to: getHREmail(),
            subject: emailTemplate.subject,
            body: emailTemplate.html
          });
          console.log("Email sent to HR for Team Lead leave:", getHREmail());
        }
        // Case 3: Regular employee - send to their Team Lead
        else {
          const teamLeadEmail = emp.Team_Lead__r?.Employee_Email__c;
          const teamLeadName = emp.Team_Lead__r?.Employee_Name__c;

          if (teamLeadEmail && !leaveRecord.TL_Approval__c) {
            const emailTemplate = newLeaveRequestToTeamLead({
              recipientName: teamLeadName,
              employeeName,
              leaveType: leaveType || 'N/A',
              startDate: start.format('YYYY-MM-DD'),
              endDate: end.format('YYYY-MM-DD'),
              duration: duration
            });
            sendEmailAsync({
              to: teamLeadEmail,
              subject: emailTemplate.subject,
              body: emailTemplate.html
            });
            console.log("Email sent to Team Lead:", teamLeadEmail);
          }
        }
      }
    } catch (emailError) {
      console.error('Error sending notification:', emailError);
      // Don't fail the request if email fails
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
      const leaveRecordQuery = await conn.query<any>(`
        SELECT Id, Employee__c, Status__c, Leave_Category__c, Leave_Type__c, Total_Days__c, Total_Days_After_Rule__c, Start_Date__c, End_Date__c
        FROM Leave__c
        WHERE Id = '${leaveId}'
        LIMIT 1
      `);

      if (leaveRecordQuery.records.length === 0) {
        return NextResponse.json({ error: "Leave not found" }, { status: 404 });
      }

      const leave = leaveRecordQuery.records[0];
      const oldStatus = leave.Status__c;

      // Check if the leave belongs to the current user
      if (leave.Employee__c !== employeeId) {
        return NextResponse.json({ error: "Unauthorized to withdraw this leave" }, { status: 403 });
      }

      // Update the status to Withdrawn in Salesforce
      await conn.sobject('Leave__c').update({
        Id: leaveId,
        Status__c: 'Withdrawn',
      });

      // afterUpdate: Revert Leave Balance if leave was previously Approved
      if (oldStatus === 'Approved') {
        await updateLeaveBalance(conn, leave, 'revert');

        // Send email notification about withdrawal
        try {
          const empData = await conn.query<any>(`
            SELECT Id, Employee_Email__c, Employee_Name__c, Role__c, Title__c,
                   Team_Lead__c, Team_Lead__r.Employee_Name__c, Team_Lead__r.Employee_Email__c
            FROM Employee__c
            WHERE Id = '${leave.Employee__c}'
            LIMIT 1
          `);

          if (empData.records && empData.records.length > 0) {
            const emp = empData.records[0];
            const employeeName = emp.Employee_Name__c || 'Employee';
            const employeeRole = emp.Role__c;
            const employeeTitle = emp.Title__c;

            // Send email to employee
            if (emp.Employee_Email__c) {
              const emailTemplate = leaveWithdrawn({
                recipientName: employeeName,
                leaveType: leave.Leave_Type__c || leave.Leave_Category__c || 'N/A',
                startDate: leave.Start_Date__c || 'N/A',
                endDate: leave.End_Date__c || 'N/A',
                duration: leave.Total_Days__c || 0
              });
              sendEmailAsync({
                to: emp.Employee_Email__c,
                subject: emailTemplate.subject,
                body: emailTemplate.html
              });
            }

            // Send notification to Team Lead (for regular employees)
            if (employeeRole !== 'HR' && employeeRole !== 'Admin' && !(employeeRole === 'Developer' && employeeTitle === 'Team Lead')) {
              const teamLeadEmail = emp.Team_Lead__r?.Employee_Email__c;
              const teamLeadName = emp.Team_Lead__r?.Employee_Name__c;

              if (teamLeadEmail) {
                const tlEmailTemplate = leaveWithdrawn({
                  recipientName: teamLeadName || 'Team Lead',
                  employeeName,
                  leaveType: leave.Leave_Type__c || leave.Leave_Category__c || 'N/A',
                  startDate: leave.Start_Date__c || 'N/A',
                  endDate: leave.End_Date__c || 'N/A',
                  duration: leave.Total_Days__c || 0
                });
                sendEmailAsync({
                  to: teamLeadEmail,
                  subject: `Leave Withdrawn - ${employeeName}`,
                  body: tlEmailTemplate.html
                });
              }
            }

            // Send notification to HR (for all employees except Admin)
            if (employeeRole !== 'Admin') {
              const hrEmailTemplate = leaveWithdrawn({
                recipientName: 'HR Team',
                employeeName,
                leaveType: leave.Leave_Type__c || leave.Leave_Category__c || 'N/A',
                startDate: leave.Start_Date__c || 'N/A',
                endDate: leave.End_Date__c || 'N/A',
                duration: leave.Total_Days__c || 0
              });
              sendEmailAsync({
                to: getHREmail(),
                subject: `Leave Withdrawn - ${employeeName}`,
                body: hrEmailTemplate.html
              });
            }

            // Send notification to Admin (if employee is HR)
            if (employeeRole === 'HR') {
              const adminQuery = await conn.query<any>(`
                SELECT Id, Employee_Name__c, Employee_Email__c
                FROM Employee__c
                WHERE Role__c = 'Admin'
                LIMIT 1
              `);

              if (adminQuery.records && adminQuery.records.length > 0) {
                const admin = adminQuery.records[0];
                const adminEmail = admin.Employee_Email__c;
                const adminName = admin.Employee_Name__c;

                if (adminEmail) {
                  const adminEmailTemplate = leaveWithdrawn({
                    recipientName: adminName || 'Admin',
                    employeeName,
                    leaveType: leave.Leave_Type__c || leave.Leave_Category__c || 'N/A',
                    startDate: leave.Start_Date__c || 'N/A',
                    endDate: leave.End_Date__c || 'N/A',
                    duration: leave.Total_Days__c || 0
                  });
                  sendEmailAsync({
                    to: adminEmail,
                    subject: `Leave Withdrawn - ${employeeName} (HR)`,
                    body: adminEmailTemplate.html
                  });
                }
              }
            }
          }
        } catch (emailError) {
          console.error('Error sending withdrawal notification:', emailError);
        }
      }

      return NextResponse.json({ success: true, message: "Leave withdrawn successfully" });
    }

    // Handle approve action (HR, Team Lead, or Admin)
    if (action === "approve") {
      const { role, title, name: approverName } = payload;

      // Check if user can approve leaves
      const isHR = role === 'HR';
      const isTeamLead = role === 'Developer' && title === 'Team Lead';
      const isAdmin = role === 'Admin';

      console.log("Approval attempt by:", role, title, "isHR:", isHR, "isTeamLead:", isTeamLead, "isAdmin:", isAdmin);

      if (!isHR && !isTeamLead && !isAdmin) {
        return NextResponse.json({ error: "Only HR, Team Lead, or Admin can approve leaves" }, { status: 403 });
      }

      const leaveRecordQuery = await conn.query<any>(`
        SELECT Id, Status__c, Employee__c, Employee__r.Role__c,Employee__r.Base_Salary__c, Leave_Category__c, Leave_Type__c, Total_Days__c, Total_Days_After_Rule__c, HR_Approval__c, TL_Approval__c, Start_Date__c, End_Date__c, Actual_Deduction__c, After_Rule_Deduction__c
        FROM Leave__c
        WHERE Id = '${leaveId}'
        LIMIT 1
      `);

      if (leaveRecordQuery.records.length === 0) {
        return NextResponse.json({ error: "Leave not found" }, { status: 404 });
      }

      const oldLeave = leaveRecordQuery.records[0];
      const employeeRole = oldLeave.Employee__r?.Role__c;

      // Admin can only approve HR leaves
      if (isAdmin && employeeRole !== 'HR') {
        return NextResponse.json({ error: "Admin can only approve HR leaves" }, { status: 403 });
      }

      // Update approval based on role
      const updateData: any = {
        Id: leaveId,
      };

      if (isHR || isAdmin) {
        updateData.HR_Approval__c = 'Approved';
        updateData.Approved_Date__c = new Date().toISOString();
        // beforeUpdate: Sync Status__c with HR_Approval__c
        updateData.Status__c = 'Approved';

        //calculate the salary amount for Actual_Deduction__c and After_Rule_Deduction__c fields

      } else if (isTeamLead) {
        updateData.TL_Approval__c = 'Approved';
      }

      await conn.sobject('Leave__c').update(updateData);

      // afterUpdate: Send email notifications based on approval type
      try {
        const empData = await conn.query<any>(`
          SELECT Id, Employee_Name__c, Employee_Email__c, Team_Lead__r.Employee_Name__c
          FROM Employee__c
          WHERE Id = '${oldLeave.Employee__c}'
          LIMIT 1
        `);

        if (empData.records && empData.records.length > 0) {
          const emp = empData.records[0];
          const employeeEmail = emp.Employee_Email__c;
          const employeeName = emp.Employee_Name__c;
          const teamLeadName = emp.Team_Lead__r?.Employee_Name__c;

          if (isTeamLead && !oldLeave.TL_Approval__c) {
            // TL just approved - send email to employee
            if (employeeEmail) {
              const emailTemplate = leaveApprovedByTL({
                recipientName: employeeName,
                leaveType: oldLeave.Leave_Type__c || 'N/A',
                startDate: oldLeave.Start_Date__c || 'N/A',
                endDate: oldLeave.End_Date__c || 'N/A',
                duration: oldLeave.Total_Days__c || 0
              });
              sendEmailAsync({
                to: employeeEmail,
                subject: emailTemplate.subject,
                body: emailTemplate.html
              });
            }

            // Send email to HR about TL approval
            const emailTemplateHR = tlApprovalToHR({
              recipientName: 'HR Team',
              employeeName,
              teamLeadName,
              leaveType: oldLeave.Leave_Type__c || 'N/A',
              startDate: oldLeave.Start_Date__c || 'N/A',
              endDate: oldLeave.End_Date__c || 'N/A',
              duration: oldLeave.Total_Days__c || 0
            });
            sendEmailAsync({
              to: getHREmail(),
              subject: emailTemplateHR.subject,
              body: emailTemplateHR.html
            });
          } else if ((isHR || isAdmin) && !oldLeave.HR_Approval__c) {
            // HR or Admin just approved - send email to employee
            if (employeeEmail) {
              const approverTitle = isAdmin ? 'Admin' : 'HR';
              const emailTemplate = leaveApprovedFinal({
                recipientName: employeeName,
                approverTitle,
                leaveType: oldLeave.Leave_Type__c || 'N/A',
                startDate: oldLeave.Start_Date__c || 'N/A',
                endDate: oldLeave.End_Date__c || 'N/A',
                duration: oldLeave.Total_Days__c || 0
              });
              sendEmailAsync({
                to: employeeEmail,
                subject: emailTemplate.subject,
                body: emailTemplate.html
              });
            }

            // Update Leave Balance when HR/Admin approves (Status becomes Approved)
            await updateLeaveBalance(conn, oldLeave, 'approve');
          }
        }
      } catch (emailError) {
        console.error('Error sending approval notification:', emailError);
      }

      return NextResponse.json({ success: true, message: "Leave approved successfully" });
    }

    // Handle reject action (HR, Team Lead, or Admin)
    if (action === "reject") {
      const { role, title } = payload;
      const { reason } = body;

      // Check if user can reject leaves
      const isHR = role === 'HR';
      const isTeamLead = role === 'Developer' && title === 'Team Lead';
      const isAdmin = role === 'Admin';

      if (!isHR && !isTeamLead && !isAdmin) {
        return NextResponse.json({ error: "Only HR, Team Lead, or Admin can reject leaves" }, { status: 403 });
      }

      const leaveRecordQuery = await conn.query<any>(`
        SELECT Id, Status__c, Employee__c, Employee__r.Role__c, HR_Approval__c, TL_Approval__c, Leave_Type__c, Total_Days__c, Start_Date__c, End_Date__c
        FROM Leave__c
        WHERE Id = '${leaveId}'
        LIMIT 1
      `);

      if (leaveRecordQuery.records.length === 0) {
        return NextResponse.json({ error: "Leave not found" }, { status: 404 });
      }

      const oldLeave = leaveRecordQuery.records[0];
      const employeeRole = oldLeave.Employee__r?.Role__c;

      // Admin can only reject HR leaves
      if (isAdmin && employeeRole !== 'HR') {
        return NextResponse.json({ error: "Admin can only reject HR leaves" }, { status: 403 });
      }

      // Update rejection based on role
      const updateData: any = {
        Id: leaveId,
        Status__c: 'Rejected',
      };

      if (isHR || isAdmin) {
        updateData.HR_Approval__c = 'Rejected';
        updateData.Cancellation_Reason_HR__c = reason || '';
      } else if (isTeamLead) {
        updateData.TL_Approval__c = 'Rejected';
        updateData.Cancellation_Reason_TL__c = reason || '';
      }

      await conn.sobject('Leave__c').update(updateData);

      // afterUpdate: Send email notifications
      try {
        const empData = await conn.query<any>(`
          SELECT Id, Employee_Name__c, Employee_Email__c
          FROM Employee__c
          WHERE Id = '${oldLeave.Employee__c}'
          LIMIT 1
        `);

        if (empData.records && empData.records.length > 0) {
          const emp = empData.records[0];
          const employeeEmail = emp.Employee_Email__c;
          const employeeName = emp.Employee_Name__c;

          if (isTeamLead && !oldLeave.TL_Approval__c) {
            // TL just rejected
            if (employeeEmail) {
              const emailTemplate = leaveRejected({
                recipientName: employeeName,
                approverTitle: 'Team Lead',
                leaveType: oldLeave.Leave_Type__c || 'N/A',
                startDate: oldLeave.Start_Date__c || 'N/A',
                endDate: oldLeave.End_Date__c || 'N/A',
                duration: oldLeave.Total_Days__c || 0,
                reason
              });
              sendEmailAsync({
                to: employeeEmail,
                subject: emailTemplate.subject,
                body: emailTemplate.html
              });
            }
          } else if ((isHR || isAdmin) && !oldLeave.HR_Approval__c) {
            // HR or Admin just rejected
            if (employeeEmail) {
              const approverTitle = isAdmin ? 'Admin' : 'HR';
              const emailTemplate = leaveRejected({
                recipientName: employeeName,
                approverTitle,
                leaveType: oldLeave.Leave_Type__c || 'N/A',
                startDate: oldLeave.Start_Date__c || 'N/A',
                endDate: oldLeave.End_Date__c || 'N/A',
                duration: oldLeave.Total_Days__c || 0,
                reason
              });
              sendEmailAsync({
                to: employeeEmail,
                subject: emailTemplate.subject,
                body: emailTemplate.html
              });
            }
          }
        }
      } catch (emailError) {
        console.error('Error sending rejection notification:', emailError);
      }

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

/**
 * Update Leave Balance when leave is approved or withdrawn
 * This function handles the Leave_Balance__c updates similar to Apex afterUpdate logic
 */
async function updateLeaveBalance(conn: any, leaveRecord: any, action: 'approve' | 'revert'): Promise<void> {
  try {
    const currentYear = new Date().getFullYear();

    // Fetch Leave Balance record for the employee
    const leaveBalanceQuery = await conn.query(`
      SELECT Id, Annual_Leave_Remaining__c, Earned_Leave_Balance__c, 
             Sick_Leave_Count__c, Emergency_Leave_Count__c, Planned_Leave_Count__c
      FROM Leave_Balance__c
      WHERE Employee__c = '${leaveRecord.Employee__c}' AND Year__c = ${currentYear}
      LIMIT 1
    `);

    let leaveBalance: any;
    const isNewRecord = leaveBalanceQuery.records.length === 0;

    if (!isNewRecord) {
      leaveBalance = leaveBalanceQuery.records[0];
    } else {
      // Fetch dynamic leave configurations for annual leave balance
      const leaveConfig = await fetchLeaveConfigurations(conn);
      
      // Create new Leave Balance record
      leaveBalance = {
        Employee__c: leaveRecord.Employee__c,
        Year__c: currentYear,
        Annual_Leave_Remaining__c: leaveConfig.annualLeaveBalance,
        Earned_Leave_Balance__c: 0,
        Sick_Leave_Count__c: 0,
        Emergency_Leave_Count__c: 0,
        Planned_Leave_Count__c: 0,
      };
    }

    const multiplier = action === 'approve' ? -1 : 1; // Subtract on approve, add back on revert
    const totalDaysAfterRule = leaveRecord.Total_Days_After_Rule__c || 0;
    const totalDays = leaveRecord.Total_Days__c || 0;

    // Update based on Leave Category
    if (leaveRecord.Leave_Category__c === 'Loss of Pay') {
      // Update Annual Leave Remaining
      leaveBalance.Annual_Leave_Remaining__c =
        (leaveBalance.Annual_Leave_Remaining__c || 0) + (multiplier * totalDaysAfterRule);

      // Update specific leave type counts
      if (leaveRecord.Leave_Type__c === 'Sick Leave') {
        leaveBalance.Sick_Leave_Count__c =
          (leaveBalance.Sick_Leave_Count__c || 0) - (multiplier * totalDays);
      } else if (leaveRecord.Leave_Type__c === 'Emergency Leave') {
        leaveBalance.Emergency_Leave_Count__c =
          (leaveBalance.Emergency_Leave_Count__c || 0) - (multiplier * totalDays);
      } else if (leaveRecord.Leave_Type__c === 'Planned Leave') {
        leaveBalance.Planned_Leave_Count__c =
          (leaveBalance.Planned_Leave_Count__c || 0) - (multiplier * totalDaysAfterRule);
      }
    } else if (leaveRecord.Leave_Category__c === 'Extra Day Pay') {
      // Update Earned Leave Balance
      leaveBalance.Earned_Leave_Balance__c =
        (leaveBalance.Earned_Leave_Balance__c || 0) - (multiplier * totalDays);
    }

    // Upsert the Leave Balance record
    if (isNewRecord) {
      await conn.sobject('Leave_Balance__c').create(leaveBalance);
      console.log('Created new Leave Balance record:', leaveBalance);
    } else {
      await conn.sobject('Leave_Balance__c').update({
        Id: leaveBalance.Id,
        Annual_Leave_Remaining__c: leaveBalance.Annual_Leave_Remaining__c,
        Earned_Leave_Balance__c: leaveBalance.Earned_Leave_Balance__c,
        Sick_Leave_Count__c: leaveBalance.Sick_Leave_Count__c,
        Emergency_Leave_Count__c: leaveBalance.Emergency_Leave_Count__c,
        Planned_Leave_Count__c: leaveBalance.Planned_Leave_Count__c,
      });
      console.log('Updated Leave Balance record:', leaveBalance.Id);
    }
  } catch (error) {
    console.error('Error updating Leave Balance:', error);
    throw error; // Re-throw to handle in calling function
  }
}