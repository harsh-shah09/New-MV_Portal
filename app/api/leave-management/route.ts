import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import dayjs from "dayjs";
import { verifyToken } from "@/lib/auth-utils";
import { getSalesforceConnection, sendInAppNotifications } from "@/lib/salesforce";
import { sendEmailAsync, getHREmail } from "@/lib/email";
import { calculateLeaveDays, type LeaveDateInput } from "@/lib/leave-policy";
import {
  newLeaveRequestToTeamLead,
  teamLeadLeaveRequestToHR,
  hrLeaveRequestToAdmin,
  tlApprovalToHR,
  leaveApprovedByTL,
  leaveApprovedFinal,
  leaveRejected,
  leaveWithdrawn,
  withdrawalRequestSubmitted,
  withdrawalRequestToHR,
  withdrawalApproved,
  withdrawalRejected,
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

/**
 * Interface for the rule calculation details JSON structure
 */
interface RuleCalculationDetails {
  // Basic info
  requestedStartDate: string;
  requestedEndDate: string;
  effectiveStartDate: string;
  effectiveEndDate: string;

  // Days breakdown
  baseCalendarDays: number;
  rangeLeaveDays: number;

  // Same-request sandwich details
  sameRequestSandwich: {
    applied: boolean;
    preSandwichDates: string[];
    postSandwichDates: string[];
    countedLeaveDates?: string[];
    totalDays: number;
  };

  // 1+2 rule details
  onePlusTwoRule: {
    applied: boolean;
    extraDays: number;
  };

  // Totals
  totalSandwichDays: number;
  finalTotalAfterRules: number;

  // Merge audit
  mergeInfo?: {
    merged: boolean;
    existingLeaveId?: string;
    previousStartDate?: string;
    previousEndDate?: string;
    newRequestStartDate?: string;
    newRequestEndDate?: string;
    mergedAt?: string;
    mergedBy?: string;
    gapDates?: string[];
  };

  // Timestamp
  calculatedAt: string;
}

interface RecalculatedLeaveMetrics {
  totalDays: number;
  totalDaysAfterRule: number;
  sandwichApplied: boolean;
  onePlusTwoRuleApplied: boolean;
  details: RuleCalculationDetails;
}

function parseRuleCalculationDetails(rawValue: any): RuleCalculationDetails | null {
  if (!rawValue || typeof rawValue !== "string") {
    return null;
  }

  try {
    return JSON.parse(rawValue) as RuleCalculationDetails;
  } catch (error) {
    console.error("Failed to parse Rule_Calculation_Details__c:", error);
    return null;
  }
}

async function getHolidaySet(conn: any): Promise<Set<string>> {
  const holidayQuery = await conn.query(
    "SELECT Name, Date__c, Day__c, Year__c FROM Holidays_List__c"
  );

  const holidayDates = (holidayQuery.records || [])
    .map((holiday: any) => holiday?.Date__c)
    .filter(Boolean)
    .map((dateValue: string) => dayjs(dateValue).format("YYYY-MM-DD"));

  return new Set(holidayDates);
}

function getDisplayLeaveType(leaveType: string | undefined, leaveCategory: string): string {
  const normalized = (leaveCategory || "").toLowerCase();
  if (normalized === "extra day pay" || normalized === "extra-day-pay") {
    return "Extra Day Pay";
  }
  return leaveType || "N/A";
}

function getCanonicalLeaveCategory(leaveCategory: string): "loss-of-pay" | "extra-day-pay" {
  const normalized = (leaveCategory || "").toLowerCase().replace(/\s+/g, "-");
  return normalized === "extra-day-pay" ? "extra-day-pay" : "loss-of-pay";
}

function createRuleCalculationDetails(
  startDate: dayjs.Dayjs,
  endDate: dayjs.Dayjs,
  role: string | undefined,
  leaveType: string | undefined,
  leaveCategory: string,
  sessionValue: string | undefined,
  leaveConfig: LeaveConfig,
  holidaySet: Set<string>,
  createdReferenceDate: dayjs.Dayjs,
  mergeInfo?: RuleCalculationDetails["mergeInfo"]
): RecalculatedLeaveMetrics {
  const isWeekend = (d: dayjs.Dayjs) => {
    const day = d.day();
    return day === 0 || day === 6;
  };
  const isHoliday = (d: dayjs.Dayjs) => holidaySet.has(d.format("YYYY-MM-DD"));
  const isNonWorking = (d: dayjs.Dayjs) => isWeekend(d) || isHoliday(d);

  const normalizedCategory = getCanonicalLeaveCategory(leaveCategory);
  const effectiveLeaveCategory = normalizedCategory === "loss-of-pay" ? "Loss of Pay" : "Extra Day Pay";

  const requestedStartDate = startDate.format("YYYY-MM-DD");
  const requestedEndDate = endDate.format("YYYY-MM-DD");
  const baseCalendarDays = endDate.diff(startDate, "day") + 1;
  const isHalfDay = sessionValue === "Session-1" || sessionValue === "Session-2";
  const applyRules = effectiveLeaveCategory === "Loss of Pay" && (leaveType || "") === "Planned Leave";
  const sandwichRuleAppliesToUser = leaveConfig.sandwichRuleAppliesTo.includes(role || "");
  const penaltyAppliesToUser = leaveConfig.penaltyAppliesTo.includes(role || "");
  const applySandwichRule = applyRules && !isHalfDay && leaveConfig.enableSandwichRule && sandwichRuleAppliesToUser;

  let workingDaysInRange = 0;
  let nonWorkingDaysInRange = 0;
  let cursor = startDate.clone();

  while (cursor.isSame(endDate) || cursor.isBefore(endDate)) {
    if (isNonWorking(cursor)) {
      nonWorkingDaysInRange++;
    } else {
      workingDaysInRange++;
    }
    cursor = cursor.add(1, "day");
  }

  const sandwichDateList: LeaveDateInput[] = [];
  if (applySandwichRule && workingDaysInRange > 0) {
    let sandwichCursor = startDate.clone();
    const sandwichWindowEnd = endDate.add(3, "day");
    while (sandwichCursor.isSame(sandwichWindowEnd) || sandwichCursor.isBefore(sandwichWindowEnd)) {
      const dateKey = sandwichCursor.format("YYYY-MM-DD");
      const isLeaveDay =
        (sandwichCursor.isSame(startDate) || sandwichCursor.isAfter(startDate)) &&
        (sandwichCursor.isSame(endDate) || sandwichCursor.isBefore(endDate)) &&
        !isNonWorking(sandwichCursor);

      sandwichDateList.push({
        date: dateKey,
        isLeaveDay,
        isHalfDay,
        leaveType,
        leaveCategory,
        isPublicHoliday: holidaySet.has(dateKey),
        isWeekend: isWeekend(sandwichCursor),
      });

      sandwichCursor = sandwichCursor.add(1, "day");
    }
  }

  const sandwichPolicy =
    sandwichDateList.length > 0
      ? calculateLeaveDays(sandwichDateList, {
          allowedLeaveTypes: ["Planned Leave"],
          allowedLeaveCategories: ["loss-of-pay", "loss of pay"],
        })
      : {
          sandwichApplied: false,
          sandwichDates: [] as string[],
        };

  const sandwichDates = applySandwichRule ? sandwichPolicy.sandwichDates : [];
  const preSandwichDates = sandwichDates.filter((dateValue) => dayjs(dateValue).isBefore(startDate, "day"));
  const postSandwichDates = sandwichDates.filter((dateValue) => dayjs(dateValue).isAfter(endDate, "day"));
  const sandwichApplied = applySandwichRule && sandwichPolicy.sandwichApplied;

  let rangeLeaveDays: number;
  if (effectiveLeaveCategory === "Extra Day Pay") {
    rangeLeaveDays = baseCalendarDays;
  } else {
    rangeLeaveDays = workingDaysInRange;
  }

  if (isHalfDay) {
    rangeLeaveDays = rangeLeaveDays * 0.5;
  }

  const sandwichExtra = sandwichApplied ? sandwichDates.length : 0;

  let onePlusTwoExtra = 0;
  if (applyRules && !isHalfDay && leaveConfig.enableOnePlusTwoRule && penaltyAppliesToUser) {
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

    const penaltyMultiplier = leaveConfig.penaltyDaysPerDay;
    let cursorPenalty = startDate.startOf("day");
    const endPenalty = endDate.startOf("day");

    while (cursorPenalty.isSame(endPenalty) || cursorPenalty.isBefore(endPenalty)) {
      if (!isNonWorking(cursorPenalty)) {
        const workingDaysInAdvance = countWorkingDaysBetween(createdReferenceDate.startOf("day"), cursorPenalty);
        if (workingDaysInAdvance < leaveConfig.minWorkingDayNoticePeriod) {
          onePlusTwoExtra += penaltyMultiplier;
        }
      }
      cursorPenalty = cursorPenalty.add(1, "day");
    }
  }

  const onePlusTwoRuleApplied = applyRules && onePlusTwoExtra > 0;
  const finalTotalAfterRules = rangeLeaveDays + sandwichExtra + onePlusTwoExtra;

  let effectiveStartDate = requestedStartDate;
  let effectiveEndDate = requestedEndDate;

  if (sandwichApplied) {
    if (preSandwichDates.length > 0) {
      const earliestPreDate = preSandwichDates.reduce((earliest, dateValue) =>
        dayjs(dateValue).isBefore(dayjs(earliest)) ? dateValue : earliest
      );
      effectiveStartDate = earliestPreDate;
    }

    if (postSandwichDates.length > 0) {
      const latestPostDate = postSandwichDates.reduce((latest, dateValue) =>
        dayjs(dateValue).isAfter(dayjs(latest)) ? dateValue : latest
      );
      effectiveEndDate = latestPostDate;
    }
  }

  const details: RuleCalculationDetails = {
    requestedStartDate,
    requestedEndDate,
    effectiveStartDate,
    effectiveEndDate,
    baseCalendarDays,
    rangeLeaveDays,
    sameRequestSandwich: {
      applied: sandwichApplied,
      preSandwichDates,
      postSandwichDates,
      countedLeaveDates: sandwichDates,
      totalDays: sandwichExtra,
    },
    onePlusTwoRule: {
      applied: onePlusTwoRuleApplied,
      extraDays: onePlusTwoExtra,
    },
    totalSandwichDays: sandwichExtra,
    finalTotalAfterRules,
    mergeInfo,
    calculatedAt: new Date().toISOString(),
  };

  return {
    totalDays: rangeLeaveDays,
    totalDaysAfterRule: finalTotalAfterRules,
    sandwichApplied,
    onePlusTwoRuleApplied,
    details,
  };
}

/**
 * Helper function to check if a date is a non-working day (weekend or holiday)
 */
function createNonWorkingDayChecker(holidaySet: Set<string>) {
  const isWeekend = (d: dayjs.Dayjs) => {
    const day = d.day();
    return day === 0 || day === 6;
  };
  const isHoliday = (d: dayjs.Dayjs) => holidaySet.has(d.format("YYYY-MM-DD"));
  return (d: dayjs.Dayjs) => isWeekend(d) || isHoliday(d);
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
        Approved_Date__c,
        Rule_Calculation_Details__c
      FROM Leave__c
      WHERE Employee__c = '${currentEmployeeId}'
      ORDER BY Start_Date__c DESC
    `);

    console.log("Fetched leave records:", leaveRecords);
    // Map Salesforce records to LeaveRequest format
    const leaves: LeaveRequest[] = leaveRecords.records.map((record: any) => {
      const parsedDetails = parseRuleCalculationDetails(record.Rule_Calculation_Details__c);
      const partialRequest = (parsedDetails as any)?.partialWithdrawalRequest;

      return {
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
        withdrawalStartDate: partialRequest?.requested ? partialRequest.withdrawalStartDate : undefined,
        withdrawalEndDate: partialRequest?.requested ? partialRequest.withdrawalEndDate : undefined,
      };
    });

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
          Reason__c,
          Rule_Calculation_Details__c
        FROM Leave__c
        WHERE Status__c IN ('Applied', 'Withdrawal Pending')
        AND Employee__r.Role__c = 'HR'
        ORDER BY Start_Date__c ASC
      `);

      console.log("Fetched pending HR approvals for Admin:", pendingLeaveRecords);

      pendingApprovals = pendingLeaveRecords.records.map((record: any) => {
        const parsedDetails = parseRuleCalculationDetails(record.Rule_Calculation_Details__c);
        const partialRequest = (parsedDetails as any)?.partialWithdrawalRequest;

        return {
          id: record.Id,
          employeeId: record.Employee__c,
          employeeName: record.Employee__r?.Employee_Name__c || "Unknown",
          leaveType: record.Leave_Category__c === 'Extra Day Pay' ? 'Extra Day Pay' : (record.Leave_Type__c || ""),
          leaveCategory: record.Leave_Category__c,
          startDate: record.Start_Date__c || "",
          endDate: record.End_Date__c || "",
          duration: record.Total_Days__c || 0,
          status: record.Status__c?.toLowerCase() || "pending",
          isWithdrawalRequest: record.Status__c === 'Withdrawal Pending',
          approvedBy: record.Approved_By__c,
          approvalDate: record.Approved_Date__c,
          reason: record.Reason__c || '',
          tlApproved: record.TL_Approval__c,
          hrApproval: record.HR_Approval__c,
          withdrawalStartDate: partialRequest?.requested ? partialRequest.withdrawalStartDate : undefined,
          withdrawalEndDate: partialRequest?.requested ? partialRequest.withdrawalEndDate : undefined,
        };
      });
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
          Reason__c,
          Rule_Calculation_Details__c
        FROM Leave__c
        WHERE Status__c IN ('Applied', 'Withdrawal Pending')
        AND Employee__r.Role__c != 'HR'
        ORDER BY Start_Date__c ASC
      `);

      console.log("Fetched pending approvals for HR:", pendingLeaveRecords);

      pendingApprovals = pendingLeaveRecords.records.map((record: any) => {
        const parsedDetails = parseRuleCalculationDetails(record.Rule_Calculation_Details__c);
        const partialRequest = (parsedDetails as any)?.partialWithdrawalRequest;

        return {
          id: record.Id,
          employeeId: record.Employee__c,
          employeeName: record.Employee__r?.Employee_Name__c || "Unknown",
          leaveType: record.Leave_Category__c === 'Extra Day Pay' ? 'Extra Day Pay' : (record.Leave_Type__c || ""),
          leaveCategory: record.Leave_Category__c,
          startDate: record.Start_Date__c || "",
          endDate: record.End_Date__c || "",
          duration: record.Total_Days__c || 0,
          status: record.Status__c?.toLowerCase() || "pending",
          isWithdrawalRequest: record.Status__c === 'Withdrawal Pending',
          approvedBy: record.Approved_By__c,
          approvalDate: record.Approved_Date__c,
          reason: record.Reason__c || '',
          tlApproved: record.TL_Approval__c,
          hrApproval: record.HR_Approval__c,
          withdrawalStartDate: partialRequest?.requested ? partialRequest.withdrawalStartDate : undefined,
          withdrawalEndDate: partialRequest?.requested ? partialRequest.withdrawalEndDate : undefined,
        };
      });
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
          Reason__c,
          Rule_Calculation_Details__c
        FROM Leave__c
        WHERE Employee__r.Team_Lead__r.Employee_Name__c = '${name}'
        AND Status__c IN ('Applied', 'Withdrawal Pending')
        ORDER BY Start_Date__c ASC
      `);

      console.log("Fetched pending approvals for Team Lead:", pendingLeaveRecords);

      pendingApprovals = pendingLeaveRecords.records.map((record: any) => {
        const parsedDetails = parseRuleCalculationDetails(record.Rule_Calculation_Details__c);
        const partialRequest = (parsedDetails as any)?.partialWithdrawalRequest;

        return {
          id: record.Id,
          employeeId: record.Employee__c,
          employeeName: record.Employee__r?.Employee_Name__c || "Unknown",
          leaveType: record.Leave_Category__c === 'Extra Day Pay' ? 'Extra Day Pay' : (record.Leave_Type__c || ""),
          leaveCategory: record.Leave_Category__c,
          startDate: record.Start_Date__c || "",
          endDate: record.End_Date__c || "",
          duration: record.Total_Days__c || 0,
          status: record.Status__c?.toLowerCase() || "pending",
          isWithdrawalRequest: record.Status__c === 'Withdrawal Pending',
          approvedBy: record.Approved_By__c,
          approvalDate: record.Approved_Date__c,
          reason: record.Reason__c || '',
          tlApproved: record.TL_Approval__c,
          hrApproval: record.HR_Approval__c,
          withdrawalStartDate: partialRequest?.requested ? partialRequest.withdrawalStartDate : undefined,
          withdrawalEndDate: partialRequest?.requested ? partialRequest.withdrawalEndDate : undefined,
        };
      });
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
      applyForOthers,
      leaveCategory,
      leaveType,
      startDate,
      endDate,
      duration,
      totalDeduction,
      session: sessionValue,
      reason: rawReason,
      onePlusTwoApplied,
      confirmedRules,
      confirmMerge,
      mergeExistingLeaveId
    } = body;
    const targetEmployeeId = body?.employeeId;
    const reason = rawReason?.trim() || '';
    const rulesAlreadyConfirmed = confirmedRules === true;
    const confirmMergeWithExisting = confirmMerge === true;
    const requestedStartDateStr = startDate;
    const requestedEndDateStr = endDate;
    let requestStartDate = dayjs(startDate);
    let requestEndDate = dayjs(endDate);
    let finalStartDateStr = startDate;
    let finalEndDateStr = endDate;
    let mergeContext: {
      existingLeaveId: string;
      previousStartDate: string;
      previousEndDate: string;
      gapDates: string[];
    } | null = null;

    console.log('Duration received from client:', duration);

    const conn = await getSalesforceConnection();

    // Special flow: HR/Admin applying leave for other employees
    if (applyForOthers === true) {
      const isHR = role === 'HR';
      const isAdmin = role === 'Admin';

      if (!isHR && !isAdmin) {
        return NextResponse.json({ error: 'Only HR and Admin can apply leave for others' }, { status: 403 });
      }

      if (!targetEmployeeId || !leaveType || !startDate || !endDate) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }

      if (leaveType !== 'Sick Leave' && leaveType !== 'Emergency Leave') {
        return NextResponse.json({ error: 'Leave type must be Sick Leave or Emergency Leave' }, { status: 400 });
      }

      const parsedStart = dayjs(startDate).startOf('day');
      const parsedEnd = dayjs(endDate).startOf('day');

      if (!parsedStart.isValid() || !parsedEnd.isValid()) {
        return NextResponse.json({ error: 'Invalid leave dates' }, { status: 400 });
      }

      if (parsedStart.isAfter(parsedEnd, 'day')) {
        return NextResponse.json({ error: 'Start date must be on or before end date' }, { status: 400 });
      }

      const holidaySet = await getHolidaySet(conn);
      const isNonWorkingDay = createNonWorkingDayChecker(holidaySet);
      const blockedDates: string[] = [];
      let currentDate = parsedStart.clone();

      while (currentDate.isSame(parsedEnd) || currentDate.isBefore(parsedEnd)) {
        if (isNonWorkingDay(currentDate)) {
          blockedDates.push(currentDate.format('YYYY-MM-DD'));
        }
        currentDate = currentDate.add(1, 'day');
      }

      if (blockedDates.length > 0) {
        return NextResponse.json(
          {
            error: `Leave cannot be applied on weekends/holidays. Invalid date(s): ${blockedDates.join(', ')}`,
          },
          { status: 400 }
        );
      }

      const overlapCheckQuery = await conn.query<any>(`
        SELECT Id, Start_Date__c, End_Date__c, Status__c, Leave_Type__c, Leave_Category__c
        FROM Leave__c
        WHERE Employee__c = '${targetEmployeeId}'
        AND Status__c IN ('Applied', 'Approved', 'Withdrawal Pending')
        AND (Start_Date__c <= ${parsedEnd.format('YYYY-MM-DD')} AND End_Date__c >= ${parsedStart.format('YYYY-MM-DD')})
      `);

      if (overlapCheckQuery.records && overlapCheckQuery.records.length > 0) {
        const existingLeave = overlapCheckQuery.records[0];
        return NextResponse.json(
          {
            error: `Overlapping leave exists from ${dayjs(existingLeave.Start_Date__c).format('DD MMM YYYY')} to ${dayjs(existingLeave.End_Date__c).format('DD MMM YYYY')} (${existingLeave.Status__c}).`,
          },
          { status: 400 }
        );
      }

      const targetEmployeeQuery = await conn.query<any>(`
        SELECT Id, Employee_Name__c, Employee_Email__c, Base_Salary__c,
               Team_Lead__c, Team_Lead__r.Employee_Name__c, Team_Lead__r.Employee_Email__c
        FROM Employee__c
        WHERE Id = '${targetEmployeeId}'
        LIMIT 1
      `);

      if (!targetEmployeeQuery.records || targetEmployeeQuery.records.length === 0) {
        return NextResponse.json({ error: 'Selected employee not found' }, { status: 404 });
      }

      const targetEmployee = targetEmployeeQuery.records[0];
      const fullDayDuration = parsedEnd.diff(parsedStart, 'day') + 1;
      const approverTitle = isAdmin ? 'Admin' : 'HR';

      const approvedLeaveRecord: any = {
        Employee__c: targetEmployeeId,
        Leave_Category__c: 'Loss of Pay',
        Leave_Type__c: leaveType,
        Start_Date__c: parsedStart.format('YYYY-MM-DD'),
        End_Date__c: parsedEnd.format('YYYY-MM-DD'),
        Session__c: 'Full Day',
        Reason__c: reason || `Applied by ${approverTitle}`,
        Status__c: 'Approved',
        HR_Approval__c: 'Approved',
        TL_Approval__c: 'Approved',
        Approved_Date__c: new Date().toISOString(),
        Total_Days__c: fullDayDuration,
        Total_Days_After_Rule__c: fullDayDuration,
        OnePlusTwo_Rule__c: false,
        Sandwich_Rule__c: false,
        Actual_Deduction__c: calculateLeaveDeduction(
          'Loss of Pay',
          parsedStart.format('YYYY-MM-DD'),
          fullDayDuration,
          targetEmployee.Base_Salary__c
        ),
        After_Rule_Deduction__c: calculateLeaveDeduction(
          'Loss of Pay',
          parsedStart.format('YYYY-MM-DD'),
          fullDayDuration,
          targetEmployee.Base_Salary__c
        ),
      };

      const createResult = await conn.sobject('Leave__c').create(approvedLeaveRecord) as any;

      if (!createResult.success) {
        return NextResponse.json({ error: 'Failed to create leave request' }, { status: 500 });
      }

      // Keep leave summary/balance in sync for direct-approved apply-for-others flow
      await updateLeaveBalance(conn, approvedLeaveRecord, 'approve');

      try {
        const employeeName = targetEmployee.Employee_Name__c || 'Employee';
        const employeeEmail = targetEmployee.Employee_Email__c;
        const teamLeadEmail = targetEmployee.Team_Lead__r?.Employee_Email__c;
        const teamLeadName = targetEmployee.Team_Lead__r?.Employee_Name__c || 'Team Lead';

        if (employeeEmail) {
          const employeeEmailTemplate = leaveApprovedFinal({
            recipientName: employeeName,
            approverTitle,
            leaveType,
            startDate: parsedStart.format('YYYY-MM-DD'),
            endDate: parsedEnd.format('YYYY-MM-DD'),
            duration: fullDayDuration,
          });

          sendEmailAsync({
            to: employeeEmail,
            subject: employeeEmailTemplate.subject,
            body: employeeEmailTemplate.html,
          });
        }

        if (teamLeadEmail) {
          sendEmailAsync({
            to: teamLeadEmail,
            subject: `Leave Auto-Approved for ${employeeName}`,
            body: `
              <p>Dear ${teamLeadName},</p>
              <p>${approverTitle} has applied and approved a leave on behalf of <strong>${employeeName}</strong>.</p>
              <p><strong>Leave Details:</strong></p>
              <ul>
                <li>Type: ${leaveType}</li>
                <li>Category: Loss of Pay</li>
                <li>Start Date: ${parsedStart.format('YYYY-MM-DD')}</li>
                <li>End Date: ${parsedEnd.format('YYYY-MM-DD')}</li>
                <li>Duration: ${fullDayDuration} day(s)</li>
              </ul>
              <p>Regards,<br/>HRMS System</p>
            `,
          });
        }

        const inAppRecipients: string[] = [targetEmployeeId];
        if (targetEmployee.Team_Lead__c) {
          inAppRecipients.push(targetEmployee.Team_Lead__c);
        }

        await sendInAppNotifications(
          inAppRecipients,
          `Leave has been applied and approved by ${approverTitle} for ${targetEmployee.Employee_Name__c || 'employee'} from ${parsedStart.format('DD MMM YYYY')} to ${parsedEnd.format('DD MMM YYYY')}.`,
          'Leave',
          false
        );
      } catch (notifyError) {
        console.error('Error sending apply-for-others notifications:', notifyError);
      }

      return NextResponse.json({
        success: true,
        message: 'Leave applied and approved successfully for selected employee',
        leaveId: createResult.id,
      });
    }

    // Validate required fields
    if (!leaveCategory || !startDate || !endDate || !sessionValue) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Validate past-date policy:
    // - Loss of Pay: current/future only
    // - Extra Day Pay: past dates allowed
    const today = dayjs().startOf("day");
    const leaveStartDate = dayjs(startDate).startOf("day");
    const normalizedCategory = (leaveCategory || "").toLowerCase().replace(/\s+/g, "-");
    const isExtraDayPay = normalizedCategory === "extra-day-pay";

    if (!isExtraDayPay && leaveStartDate.isBefore(today)) {
      return NextResponse.json({
        error: "Cannot apply leave for past dates",
        details: {
          message: "Loss of Pay leave start date cannot be in the past. Please select a current or future date."
        }
      }, { status: 400 });
    }

    // Check for existing leaves that overlap with the requested dates
    const existingLeavesQuery = await conn.query<any>(`
      SELECT 
        Id, 
        Start_Date__c,
        End_Date__c,
        Status__c,
        Leave_Type__c,
        Leave_Category__c
      FROM Leave__c
      WHERE Employee__c = '${employeeId}'
      AND Status__c IN ('Applied', 'Approved', 'Withdrawal Pending')
      AND (
        (Start_Date__c <= ${endDate} AND End_Date__c >= ${startDate})
      )
    `);

    console.log("Existing leaves check:", existingLeavesQuery);

    if (existingLeavesQuery.records && existingLeavesQuery.records.length > 0) {
      const overlappingLeave = existingLeavesQuery.records[0];
      return NextResponse.json({
        error: "Leave already exists for the selected dates",
        details: {
          message: `You already have a ${overlappingLeave.Status__c?.toLowerCase()} leave from ${dayjs(overlappingLeave.Start_Date__c).format('DD MMM YYYY')} to ${dayjs(overlappingLeave.End_Date__c).format('DD MMM YYYY')}. Please choose different dates.`,
          existingLeave: {
            startDate: overlappingLeave.Start_Date__c,
            endDate: overlappingLeave.End_Date__c,
            status: overlappingLeave.Status__c,
            leaveType: overlappingLeave.Leave_Type__c,
            leaveCategory: overlappingLeave.Leave_Category__c
          }
        }
      }, { status: 400 });
    }

    // Check for consecutive dates with the same leave category
    const isRequestHalfDay = sessionValue === "Session-1" || sessionValue === "Session-2";

    // Query for leaves that are consecutive (one day before or after the requested dates)
    const consecutiveLeavesQuery = await conn.query<any>(`
      SELECT 
        Id, 
        Start_Date__c,
        End_Date__c,
        Status__c,
        Leave_Type__c,
        Leave_Category__c,
        Session__c
      FROM Leave__c
      WHERE Employee__c = '${employeeId}'
      AND Status__c IN ('Applied', 'Approved')
      AND Leave_Category__c = '${leaveCategory === 'loss-of-pay' ? 'Loss of Pay' : 'Extra Day Pay'}'
    `);

    console.log("Consecutive leaves check:", consecutiveLeavesQuery);

    if (consecutiveLeavesQuery.records && consecutiveLeavesQuery.records.length > 0) {
      for (const existingLeave of consecutiveLeavesQuery.records) {
        const existingStart = dayjs(existingLeave.Start_Date__c);
        const existingEnd = dayjs(existingLeave.End_Date__c);
        const existingSession = existingLeave.Session__c;
        const isExistingHalfDay = existingSession === "Session-1" || existingSession === "Session-2";

        // Check if applying for the same date with same session (not allowed)
        if (requestStartDate.isSame(existingStart, 'day') && requestEndDate.isSame(existingEnd, 'day')) {
          // Same day - only allow if both are half-day and different sessions
          if (isRequestHalfDay && isExistingHalfDay && sessionValue !== existingSession) {
            // Different sessions on the same day - allowed
            continue;
          } else {
            // Same day with same session or full day conflict
            return NextResponse.json({
              error: "Leave already exists for this date",
              details: {
                message: `You already have a ${existingSession || 'Full Day'} leave on ${existingStart.format('DD MMM YYYY')}. ${isRequestHalfDay && isExistingHalfDay ? 'You cannot apply for the same session twice.' : 'Please choose different dates.'}`,
                existingLeave: {
                  startDate: existingLeave.Start_Date__c,
                  endDate: existingLeave.End_Date__c,
                  status: existingLeave.Status__c,
                  leaveCategory: existingLeave.Leave_Category__c,
                  session: existingSession
                }
              }
            }, { status: 400 });
          }
        }

        // For full-day leaves, check if consecutive days should be combined
        // Skip this check if either leave is half-day (sessions can be on consecutive days)
        if (!isRequestHalfDay && !isExistingHalfDay) {
          // Check if the new leave is exactly one day before or after an existing leave
          const isOneDayBefore = requestEndDate.add(1, 'day').isSame(existingStart, 'day');
          const isOneDayAfter = requestStartDate.subtract(1, 'day').isSame(existingEnd, 'day');

          if (isOneDayBefore || isOneDayAfter) {
            const combinedStart = isOneDayBefore ? requestStartDate : existingStart;
            const combinedEnd = isOneDayAfter ? requestEndDate : existingEnd;

            return NextResponse.json({
              error: "Consecutive leave dates detected",
              details: {
                message: `You have an existing ${existingLeave.Leave_Category__c} leave from ${existingStart.format('DD MMM YYYY')} to ${existingEnd.format('DD MMM YYYY')}. Please apply a single leave for consecutive dates from ${combinedStart.format('DD MMM YYYY')} to ${combinedEnd.format('DD MMM YYYY')} instead of multiple separate requests.`,
                existingLeave: {
                  startDate: existingLeave.Start_Date__c,
                  endDate: existingLeave.End_Date__c,
                  status: existingLeave.Status__c,
                  leaveCategory: existingLeave.Leave_Category__c
                },
                suggestedDates: {
                  startDate: combinedStart.format('YYYY-MM-DD'),
                  endDate: combinedEnd.format('YYYY-MM-DD')
                }
              }
            }, { status: 400 });
          }
        }
      }
    }

    // Fetch holidays early to check for sandwich scenario with separate leave records
    const earlyHolidayQuery = await conn.query<any>(
      "SELECT Name, Date__c, Day__c, Year__c FROM Holidays_List__c"
    );
    console.log("Fetched holidays:", earlyHolidayQuery);
    const tempHolidayDates = (earlyHolidayQuery.records || [])
      .map((h: any) => h?.Date__c)
      .filter(Boolean)
      .map((d: string) => dayjs(d).format("YYYY-MM-DD"));
    const tempHolidaySet = new Set(tempHolidayDates);

    const tempIsWeekend = (d: dayjs.Dayjs) => {
      const day = d.day();
      return day === 0 || day === 6;
    };
    const tempIsHoliday = (d: dayjs.Dayjs) => tempHolidaySet.has(d.format("YYYY-MM-DD"));
    const tempIsNonWorking = (d: dayjs.Dayjs) => tempIsWeekend(d) || tempIsHoliday(d);

    // Check for sandwich scenario: existing leave + non-working days + new leave
    if (consecutiveLeavesQuery.records && consecutiveLeavesQuery.records.length > 0 && leaveCategory === 'loss-of-pay') {
      for (const existingLeave of consecutiveLeavesQuery.records) {
        const existingStart = dayjs(existingLeave.Start_Date__c);
        const existingEnd = dayjs(existingLeave.End_Date__c);
        const existingSession = existingLeave.Session__c;
        const isExistingHalfDay = existingSession === "Session-1" || existingSession === "Session-2";

        // Skip half-day leaves for sandwich check
        if (isRequestHalfDay || isExistingHalfDay) {
          continue;
        }

        // Check if there are only non-working days between the two leaves
        // Scenario: existing leave ends, then non-working day(s), then new leave starts
        let daysBetween: dayjs.Dayjs[] = [];
        let checkDate = existingEnd.add(1, 'day');

        // Check days between existing leave end and new leave start
        while (checkDate.isBefore(requestStartDate)) {
          daysBetween.push(checkDate.clone());
          checkDate = checkDate.add(1, 'day');
        }

        // Also check days between new leave end and existing leave start
        let daysBetweenReverse: dayjs.Dayjs[] = [];
        let checkDateReverse = requestEndDate.add(1, 'day');
        while (checkDateReverse.isBefore(existingStart)) {
          daysBetweenReverse.push(checkDateReverse.clone());
          checkDateReverse = checkDateReverse.add(1, 'day');
        }

        // Use whichever gap is found
        if (daysBetweenReverse.length > 0) {
          daysBetween = daysBetweenReverse;
        }

        // If there are days between and all are non-working days, this is a sandwich scenario
        if (daysBetween.length > 0 && daysBetween.length <= 5) { // Reasonable gap limit
          const allNonWorking = daysBetween.every(day => tempIsNonWorking(day));

          if (allNonWorking) {
            const combinedStart = requestStartDate.isBefore(existingStart) ? requestStartDate : existingStart;
            const combinedEnd = requestEndDate.isAfter(existingEnd) ? requestEndDate : existingEnd;
            const gapDates = daysBetween.map(d => d.format('YYYY-MM-DD'));
            const nonWorkingDaysList = daysBetween.map(d => d.format('DD MMM YYYY')).join(', ');

            if (!confirmMergeWithExisting || mergeExistingLeaveId !== existingLeave.Id) {
              return NextResponse.json({
                requiresMerge: true,
                details: {
                  message: `You have an existing leave from ${existingStart.format('DD MMM YYYY')} to ${existingEnd.format('DD MMM YYYY')}. There are non-working days (${nonWorkingDaysList}) between that leave and the requested leave. We can merge them into a single leave from ${combinedStart.format('DD MMM YYYY')} to ${combinedEnd.format('DD MMM YYYY')} and resubmit for approval.`,
                  existingLeaveId: existingLeave.Id,
                  existingLeave: {
                    startDate: existingLeave.Start_Date__c,
                    endDate: existingLeave.End_Date__c,
                    status: existingLeave.Status__c,
                    leaveCategory: existingLeave.Leave_Category__c
                  },
                  nonWorkingDaysBetween: gapDates,
                  suggestedDates: {
                    startDate: combinedStart.format('YYYY-MM-DD'),
                    endDate: combinedEnd.format('YYYY-MM-DD')
                  }
                }
              }, { status: 409 });
            }

            mergeContext = {
              existingLeaveId: existingLeave.Id,
              previousStartDate: existingLeave.Start_Date__c,
              previousEndDate: existingLeave.End_Date__c,
              gapDates,
            };
            requestStartDate = combinedStart;
            requestEndDate = combinedEnd;
            finalStartDateStr = combinedStart.format('YYYY-MM-DD');
            finalEndDateStr = combinedEnd.format('YYYY-MM-DD');
            break;
          }
        }
      }
    }

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

    const start = requestStartDate;
    const end = requestEndDate;
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
      console.log('is same or before', cursor.isSame(end) || cursor.isBefore(end));

      if (isNonWorking(start)) {
        console.log('start is non working');
        return NextResponse.json(
          {
            error: "Leave dates fall on weekends/holidays",
            details: {
              nonWorkingDays,
              message: "Select start date which is not an holiday or weekend.",
            },
          },
          { status: 400 }
        );
      }
      if (isNonWorking(end)) {
        console.log('end is non working');
        return NextResponse.json(
          {
            error: "Leave dates fall on weekends/holidays",
            details: {
              nonWorkingDays,
              message: "Select end date which is not an holiday or weekend.",
            },
          },
          { status: 400 }
        );
      }

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
    // Count working days in the leave range first
    let workingDaysInRange = 0;
    let nonWorkingDaysInRange = 0;
    let cursor = start.clone();

    while (cursor.isSame(end) || cursor.isBefore(end)) {
      if (isNonWorking(cursor)) {
        nonWorkingDaysInRange++;
      } else {
        workingDaysInRange++;
      }
      cursor = cursor.add(1, "day");
    }

    const sandwichDateList: LeaveDateInput[] = [];
    if (applySandwichRule && workingDaysInRange > 0) {
      let sandwichCursor = start.clone();
      const sandwichWindowEnd = end.add(3, "day");

      while (sandwichCursor.isSame(sandwichWindowEnd) || sandwichCursor.isBefore(sandwichWindowEnd)) {
        const dateKey = sandwichCursor.format("YYYY-MM-DD");
        const isLeaveDay =
          (sandwichCursor.isSame(start) || sandwichCursor.isAfter(start)) &&
          (sandwichCursor.isSame(end) || sandwichCursor.isBefore(end)) &&
          !isNonWorking(sandwichCursor);

        sandwichDateList.push({
          date: dateKey,
          isLeaveDay,
          isHalfDay,
          leaveType,
          leaveCategory,
          isPublicHoliday: holidaySet.has(dateKey),
          isWeekend: isWeekend(sandwichCursor),
        });

        sandwichCursor = sandwichCursor.add(1, "day");
      }
    }

    const sandwichPolicy =
      sandwichDateList.length > 0
        ? calculateLeaveDays(sandwichDateList, {
            allowedLeaveTypes: ["Planned Leave"],
            allowedLeaveCategories: ["loss-of-pay", "loss of pay"],
          })
        : {
            sandwichApplied: false,
            sandwichDates: [] as string[],
          };

    const sandwichApplied = applySandwichRule && sandwichPolicy.sandwichApplied;
    const sandwichDates = sandwichApplied ? sandwichPolicy.sandwichDates : [];
    const sameRequestSandwichDates = new Set<string>(sandwichDates);
    const preSandwichDates = sandwichDates.filter((dateValue) => dayjs(dateValue).isBefore(start, "day"));
    const postSandwichDates = sandwichDates.filter((dateValue) => dayjs(dateValue).isAfter(end, "day"));
    const insideSandwichDates = sandwichDates.filter(
      (dateValue) =>
        !dayjs(dateValue).isBefore(start, "day") &&
        !dayjs(dateValue).isAfter(end, "day")
    );

    const preSandwich = preSandwichDates.length;
    const postSandwich = postSandwichDates.length;
    const hasNonWorkingInside = insideSandwichDates.length > 0;

    console.log('[Same-Request Sandwich] Pre-sandwich dates:', preSandwichDates);
    console.log('[Same-Request Sandwich] Post-sandwich dates:', postSandwichDates);
    console.log('[Same-Request Sandwich] All counted dates:', Array.from(sameRequestSandwichDates));

    // Base leave days calculation:
    // - For Extra Day Pay: Always use calendar days (weekends/holidays are the purpose)
    // - For Loss of Pay: Base = working leave days; sandwich days are added separately
    let rangeLeaveDays: number;
    if (leaveCategory === 'extra-day-pay') {
      rangeLeaveDays = baseCalendarDays;
    } else {
      rangeLeaveDays = workingDaysInRange;
    }

    console.log('[Half-Day Check] Before adjustment:', {
      isHalfDay,
      sessionValue,
      workingDaysInRange,
      rangeLeaveDays,
      leaveCategory
    });

    // For half-day leaves, calculate as 0.5 per day
    if (isHalfDay) {
      rangeLeaveDays = rangeLeaveDays * 0.5;
      console.log('[Half-Day Check] After 0.5 multiplication:', rangeLeaveDays);
    }

    const sandwichExtra = sandwichApplied ? sandwichDates.length : 0;

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

      // Only count penalty for WORKING days in the leave range
      let cursorPenalty = start.startOf("day");
      const endPenalty = end.startOf("day");
      console.log(`[One+Two Rule] Today: ${today.format('YYYY-MM-DD')}, Start: ${start.format('YYYY-MM-DD')}, End: ${end.format('YYYY-MM-DD')}`);
      console.log(`[One+Two Rule] Min notice period: ${leaveConfig.minWorkingDayNoticePeriod} working days, Penalty per day: ${penaltyMultiplier}`);

      while (cursorPenalty.isSame(endPenalty) || cursorPenalty.isBefore(endPenalty)) {
        // Only apply penalty if this is a working day
        if (!isNonWorking(cursorPenalty)) {
          // Count only working days between today and this leave day
          const workingDaysInAdvance = countWorkingDaysBetween(today, cursorPenalty);
          console.log(`[One+Two Rule] Checking ${cursorPenalty.format('YYYY-MM-DD')}: ${workingDaysInAdvance} working days in advance`);
          if (workingDaysInAdvance < leaveConfig.minWorkingDayNoticePeriod) {
            onePlusTwoExtra += penaltyMultiplier;
            console.log(`[One+Two Rule] ✅ Penalty applied! Total penalty now: ${onePlusTwoExtra}`);
          } else {
            console.log(`[One+Two Rule] ❌ No penalty - sufficient notice`);
          }
        } else {
          console.log(`[One+Two Rule] Skipping ${cursorPenalty.format('YYYY-MM-DD')} - non-working day`);
        }
        cursorPenalty = cursorPenalty.add(1, "day");
      }
    }
    const onePlusTwoRuleApplied = applyRules && onePlusTwoExtra > 0;

    const totalSandwichDays = sandwichExtra;
    const anySandwichApplied = sandwichApplied;
    const totalSandwichDeduction = rangeLeaveDays + totalSandwichDays;
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
      workingDaysInRange,
      nonWorkingDaysInRange,
      hasNonWorkingInside,
      preSandwich,
      postSandwich,
      sandwichApplied,
      applySandwichRule,
      rangeLeaveDays,
      sandwichExtra,
      totalSandwichDays,
      anySandwichApplied,
      totalSandwichDeduction,
      onePlusTwoExtra,
      onePlusTwoRuleApplied,
      finalTotalAfterRules,
    });

    // Calculate effective leave period for display
    let effectiveStartDate = finalStartDateStr;
    let effectiveEndDate = finalEndDateStr;

    // If sandwich is applied, find the actual effective start/end
    if (anySandwichApplied) {
      // If pre-sandwich days exist, the effective start is earlier
      if (preSandwichDates.length > 0) {
        const earliestPreDate = preSandwichDates.reduce((earliest, date) =>
          dayjs(date).isBefore(dayjs(earliest)) ? date : earliest
        );
        effectiveStartDate = earliestPreDate;
      }
      // If post-sandwich days exist, the effective end is later
      if (postSandwichDates.length > 0) {
        const latestPostDate = postSandwichDates.reduce((latest, date) =>
          dayjs(date).isAfter(dayjs(latest)) ? date : latest
        );
        effectiveEndDate = latestPostDate;
      }
    }

    if (applyRules && (anySandwichApplied || onePlusTwoRuleApplied) && !rulesAlreadyConfirmed) {
      return NextResponse.json(
        {
          requiresConfirmation: true,
          message: "Additional rules applied to your leave. Please confirm.",
          details: {
            sandwichApplied: anySandwichApplied,
            sameRequestSandwich: sandwichApplied,
            onePlusTwoRuleApplied,
            baseCalendarDays,
            workingDaysInRange,
            nonWorkingDaysInRange,
            rangeLeaveDays,
            sameRequestSandwichDays: sandwichExtra,
            sameRequestSandwichDatesList: sandwichApplied ? sandwichDates : [],
            totalSandwichDays,
            totalSandwichDeduction,
            onePlusTwoExtra,
            finalTotalAfterRules,
            // Show user the effective leave period
            requestedStartDate: requestedStartDateStr,
            requestedEndDate: requestedEndDateStr,
            effectiveStartDate,
            effectiveEndDate,
          },
        },
        { status: 409 }
      );
    }

    // Build rule calculation details JSON
    const ruleCalculationDetails: RuleCalculationDetails = {
      // Basic info
      requestedStartDate: requestedStartDateStr,
      requestedEndDate: requestedEndDateStr,
      effectiveStartDate,
      effectiveEndDate,

      // Days breakdown
      baseCalendarDays,
      rangeLeaveDays,

      // Same-request sandwich details
      sameRequestSandwich: {
        applied: sandwichApplied,
        preSandwichDates,
        postSandwichDates,
        countedLeaveDates: sandwichApplied ? sandwichDates : [],
        totalDays: sandwichExtra
      },

      // 1+2 rule details
      onePlusTwoRule: {
        applied: onePlusTwoRuleApplied,
        extraDays: onePlusTwoExtra
      },

      // Totals
      totalSandwichDays,
      finalTotalAfterRules,

      // Merge audit
      mergeInfo: mergeContext ? {
        merged: true,
        existingLeaveId: mergeContext.existingLeaveId,
        previousStartDate: mergeContext.previousStartDate,
        previousEndDate: mergeContext.previousEndDate,
        newRequestStartDate: requestedStartDateStr,
        newRequestEndDate: requestedEndDateStr,
        mergedAt: new Date().toISOString(),
        mergedBy: email || employeeId || name,
        gapDates: mergeContext.gapDates,
      } : { merged: false },

      // Timestamp
      calculatedAt: new Date().toISOString()
    };

    // Prepare leave record based on category
    const saveStartDate = start.format('YYYY-MM-DD');
    const saveEndDate = end.format('YYYY-MM-DD');
    const leaveRecord: any = {
      Employee__c: employeeId,
      Start_Date__c: saveStartDate,
      End_Date__c: saveEndDate,
      Total_Days__c: rangeLeaveDays,
      Total_Days_After_Rule__c: finalTotalAfterRules,
      Session__c: sessionValue,
      Status__c: 'Applied',
      OnePlusTwo_Rule__c: onePlusTwoRuleApplied,
      Sandwich_Rule__c: anySandwichApplied,
      Rule_Calculation_Details__c: JSON.stringify(ruleCalculationDetails),
    };

    console.log("Prepared leave record:", leaveRecord);
    console.log('[Critical] Total_Days__c value being stored:', leaveRecord.Total_Days__c, 'Type:', typeof leaveRecord.Total_Days__c);
    console.log('[Rule Details] Storing calculation details:', ruleCalculationDetails);

    // Add fields based on leave category
    if (leaveCategory === 'loss-of-pay') {
      if (!leaveType) {
        return NextResponse.json({ error: "Leave type is required for loss of pay" }, { status: 400 });
      }
      if (!reason || reason.trim() === '') {
        return NextResponse.json({ error: "Leave reason is required" }, { status: 400 });
      }
      leaveRecord.Leave_Type__c = leaveType;
      leaveRecord.Leave_Category__c = 'Loss of Pay';
      leaveRecord.Reason__c = reason.trim();
    } else if (leaveCategory === 'extra-day-pay') {
      if (!reason || reason.trim() === '') {
        return NextResponse.json({ error: "Leave reason is required" }, { status: 400 });
      }
      leaveRecord.Leave_Category__c = 'Extra Day Pay';
      leaveRecord.Reason__c = reason.trim();
    }

    // Create or merge the leave record in Salesforce
    let result: any = { success: false };
    let mergedExistingLeave = false;

    if (mergeContext) {
      const updatePayload = {
        ...leaveRecord,
        Id: mergeContext.existingLeaveId,
        Status__c: 'Applied', // Re-apply for approval
        TL_Approval__c: null,
        HR_Approval__c: null,
        Approved_Date__c: null,
      };

      result = await conn.sobject('Leave__c').update(updatePayload) as any;
      mergedExistingLeave = true;
      console.log("Leave record merge (update) result:", result);
    } else {
      result = await conn.sobject('Leave__c').create(leaveRecord) as any;
      console.log("Leave record creation result:", result);
    }

    if (!result.success) {
      console.error("Failed to save leave record:", result);
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

        // Prepare notification recipients
        const notificationRecipients: string[] = [];

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

            // Add admin to in-app notification recipients
            notificationRecipients.push(admin.Id);

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
          // Find HR employee(s)
          const hrQuery = await conn.query<any>(`
            SELECT Id, Employee_Name__c, Employee_Email__c
            FROM Employee__c
            WHERE Role__c = 'HR' AND Active__c = true
            LIMIT 1
          `);

          if (hrQuery.records && hrQuery.records.length > 0) {
            const hr = hrQuery.records[0];
            notificationRecipients.push(hr.Id);
          }

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
        // Case 3: Regular employee - send to their Team Lead and HR
        else {
          const teamLeadEmail = emp.Team_Lead__r?.Employee_Email__c;
          const teamLeadName = emp.Team_Lead__r?.Employee_Name__c;
          const teamLeadId = emp.Team_Lead__c;

          // Add TL to notification recipients
          if (teamLeadId) {
            notificationRecipients.push(teamLeadId);
          }

          // Add HR to notification recipients
          const hrQuery = await conn.query<any>(`
            SELECT Id, Employee_Name__c, Employee_Email__c
            FROM Employee__c
            WHERE Role__c = 'HR' AND Active__c = true
            LIMIT 1
          `);

          if (hrQuery.records && hrQuery.records.length > 0) {
            const hr = hrQuery.records[0];
            notificationRecipients.push(hr.Id);
          }

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

        // Send in-app notifications
        if (notificationRecipients.length > 0) {
          await sendInAppNotifications(
            notificationRecipients,
            `${employeeName} has applied for ${leaveType || leaveCategory} leave from ${start.format('DD MMM YYYY')} to ${end.format('DD MMM YYYY')} (${duration} day${duration > 1 ? 's' : ''})`,
            'Leave',
            true
          );
        }
      }
    } catch (emailError) {
      console.error('Error sending notification:', emailError);
      // Don't fail the request if email fails
    }

    const savedLeaveId = mergeContext ? mergeContext.existingLeaveId : result.id;

    return NextResponse.json({
      success: true,
      message: mergeContext ? "Existing leave updated and resubmitted for approval" : "Leave request submitted successfully",
      leaveId: savedLeaveId,
      mergedExistingLeave,
      totals: {
        baseCalendarDays,
        rangeLeaveDays,
        sameRequestSandwichDays: sandwichExtra,
        totalSandwichDays,
        onePlusTwoExtra,
        finalTotalAfterRules,
        sandwichApplied: anySandwichApplied,
        sameRequestSandwich: sandwichApplied,
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
        SELECT Id, Employee__c, Status__c, Leave_Type__c, Leave_Category__c, Start_Date__c, End_Date__c, Total_Days__c,
               Sandwich_Rule__c, Rule_Calculation_Details__c
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

      // Send in-app notifications to TL and HR
      try {
        const empData = await conn.query<any>(`
          SELECT Id, Name, Employee_Name__c, Role__c, Title__c, Team_Lead__c
          FROM Employee__c
          WHERE Id = '${leave.Employee__c}'
          LIMIT 1
        `);

        if (empData.records && empData.records.length > 0) {
          const emp = empData.records[0];
          const employeeName = emp.Employee_Name__c || emp.Name || 'Employee';
          const employeeRole = emp.Role__c;
          const employeeTitle = emp.Title__c;
          const notificationRecipients: string[] = [];

          // Add Team Lead for regular employees
          if (employeeRole !== 'HR' && employeeRole !== 'Admin' && !(employeeRole === 'Developer' && employeeTitle === 'Team Lead')) {
            if (emp.Team_Lead__c) {
              notificationRecipients.push(emp.Team_Lead__c);
            }
          }

          // Add HR for all employees except Admin
          if (employeeRole !== 'Admin') {
            const hrQuery = await conn.query<any>(`
              SELECT Id FROM Employee__c
              WHERE Role__c = 'HR' AND Active__c = true
              LIMIT 1
            `);
            if (hrQuery.records && hrQuery.records.length > 0) {
              notificationRecipients.push(hrQuery.records[0].Id);
            }
          }

          // Add Admin if employee is HR
          if (employeeRole === 'HR') {
            const adminQuery = await conn.query<any>(`
              SELECT Id FROM Employee__c
              WHERE Role__c = 'Admin'
              LIMIT 1
            `);
            if (adminQuery.records && adminQuery.records.length > 0) {
              notificationRecipients.push(adminQuery.records[0].Id);
            }
          }

          if (notificationRecipients.length > 0) {
            await sendInAppNotifications(
              notificationRecipients,
              `${employeeName} has cancelled their leave request from ${dayjs(leave.Start_Date__c).format('DD MMM YYYY')} to ${dayjs(leave.End_Date__c).format('DD MMM YYYY')}.`,
              'Leave',
              false
            );
          }
        }
      } catch (notifError) {
        console.error('Error sending cancellation notifications:', notifError);
      }

      return NextResponse.json({ success: true, message: "Leave cancelled successfully" });
    }

    // Handle withdraw action
    // In the PATCH function, replace the "withdraw" action block and add new actions

    // Handle withdraw action - REQUEST withdrawal approval from HR
    if (action === "withdraw") {
      const { withdrawalStartDate, withdrawalEndDate } = body;

      // Verify the leave belongs to the current user
      const leaveRecordQuery = await conn.query<any>(`
        SELECT Id, Employee__c, Status__c, Leave_Category__c, Leave_Type__c, Total_Days__c, Total_Days_After_Rule__c, 
               Start_Date__c, End_Date__c, Session__c, Sandwich_Rule__c, Rule_Calculation_Details__c
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

      // Only approved leaves can be withdrawn
      if (oldStatus !== 'Approved') {
        return NextResponse.json({ error: "Only approved leaves can be withdrawn" }, { status: 400 });
      }

      const leaveStart = dayjs(leave.Start_Date__c).startOf("day");
      const leaveEnd = dayjs(leave.End_Date__c).startOf("day");
      const isHalfDayLeave = leave.Session__c === "Session-1" || leave.Session__c === "Session-2";

      let requestedWithdrawalStart = leaveStart;
      let requestedWithdrawalEnd = leaveEnd;

      if (withdrawalStartDate || withdrawalEndDate) {
        if (!withdrawalStartDate || !withdrawalEndDate) {
          return NextResponse.json({ error: "Both withdrawal start and end dates are required" }, { status: 400 });
        }

        requestedWithdrawalStart = dayjs(withdrawalStartDate).startOf("day");
        requestedWithdrawalEnd = dayjs(withdrawalEndDate).startOf("day");

        if (!requestedWithdrawalStart.isValid() || !requestedWithdrawalEnd.isValid() || requestedWithdrawalEnd.isBefore(requestedWithdrawalStart)) {
          return NextResponse.json({ error: "Invalid withdrawal date range" }, { status: 400 });
        }

        if (requestedWithdrawalStart.isBefore(leaveStart) || requestedWithdrawalEnd.isAfter(leaveEnd)) {
          return NextResponse.json({ error: "Withdrawal dates must be within approved leave range" }, { status: 400 });
        }

        if (isHalfDayLeave && !requestedWithdrawalStart.isSame(leaveStart, "day") && !requestedWithdrawalEnd.isSame(leaveEnd, "day")) {
          return NextResponse.json({ error: "Partial withdrawal is not supported for half-day leave" }, { status: 400 });
        }
      }

      const isPartialWithdrawal = !requestedWithdrawalStart.isSame(leaveStart, "day") || !requestedWithdrawalEnd.isSame(leaveEnd, "day");
      const existingRuleDetails = parseRuleCalculationDetails(leave.Rule_Calculation_Details__c);
      const updatedRuleDetails = {
        ...(existingRuleDetails || {}),
        partialWithdrawalRequest: {
          requested: isPartialWithdrawal,
          withdrawalStartDate: requestedWithdrawalStart.format("YYYY-MM-DD"),
          withdrawalEndDate: requestedWithdrawalEnd.format("YYYY-MM-DD"),
          requestedAt: new Date().toISOString(),
          requestedBy: employeeId,
        },
      } as any;

      // Update the status to Withdrawal Pending in Salesforce
      await conn.sobject('Leave__c').update({
        Id: leaveId,
        Status__c: 'Withdrawal Pending',
        Withdrawal_Requested_Date__c: new Date().toISOString(),
        Rule_Calculation_Details__c: JSON.stringify(updatedRuleDetails),
      });

      // Send notifications to HR for withdrawal approval
      try {
        const empData = await conn.query<any>(`
          SELECT Id, Name, Employee_Email__c, Employee_Name__c, Role__c, Title__c,
                 Team_Lead__c, Team_Lead__r.Employee_Name__c, Team_Lead__r.Employee_Email__c
          FROM Employee__c
          WHERE Id = '${leave.Employee__c}'
          LIMIT 1
        `);

        if (empData.records && empData.records.length > 0) {
          const emp = empData.records[0];
          const employeeName = emp.Employee_Name__c || emp.Name || 'Employee';
          const employeeRole = emp.Role__c;
          const employeeTitle = emp.Title__c;

          const notificationRecipients: string[] = [];

          // Send notification to HR for all employees except Admin
          if (employeeRole !== 'Admin') {
            const hrQuery = await conn.query<any>(`
              SELECT Id, Employee_Email__c
              FROM Employee__c
              WHERE Role__c = 'HR' AND Active__c = true AND Title__c = 'Senior'
              LIMIT 1
            `);
            if (hrQuery.records && hrQuery.records.length > 0) {
              const hr = hrQuery.records[0];
              notificationRecipients.push(hr.Id);

              // Send email to HR
              if (hr.Employee_Email__c) {
                const emailData = withdrawalRequestToHR({
                  recipientName: 'HR Team',
                  employeeName: employeeName,
                  leaveType: leave.Leave_Type__c || leave.Leave_Category__c,
                  startDate: dayjs(leave.Start_Date__c).format('DD MMM YYYY'),
                  endDate: dayjs(leave.End_Date__c).format('DD MMM YYYY'),
                  duration: leave.Total_Days__c
                });
                sendEmailAsync({
                  to: hr.Employee_Email__c,
                  subject: emailData.subject,
                  body: emailData.html
                });
              }
            }
          }

          // Send notification to Admin if employee is HR
          if (employeeRole === 'HR') {
            const adminQuery = await conn.query<any>(`
              SELECT Id, Employee_Email__c
              FROM Employee__c
              WHERE Role__c = 'Admin'
              LIMIT 1
            `);
            if (adminQuery.records && adminQuery.records.length > 0) {
              const admin = adminQuery.records[0];
              notificationRecipients.push(admin.Id);

              // Send email to Admin
              if (admin.Employee_Email__c) {
                const emailData = withdrawalRequestToHR({
                  recipientName: 'Admin',
                  employeeName: employeeName,
                  leaveType: leave.Leave_Type__c || leave.Leave_Category__c,
                  startDate: dayjs(leave.Start_Date__c).format('DD MMM YYYY'),
                  endDate: dayjs(leave.End_Date__c).format('DD MMM YYYY'),
                  duration: leave.Total_Days__c
                });
                sendEmailAsync({
                  to: admin.Employee_Email__c,
                  subject: emailData.subject,
                  body: emailData.html
                });
              }
            }
          }

          // Send in-app notifications
          if (notificationRecipients.length > 0) {
            await sendInAppNotifications(
              notificationRecipients,
              isPartialWithdrawal
                ? `${employeeName} has requested partial withdrawal for approved leave dates ${requestedWithdrawalStart.format('DD MMM YYYY')} to ${requestedWithdrawalEnd.format('DD MMM YYYY')} (original leave: ${dayjs(leave.Start_Date__c).format('DD MMM YYYY')} to ${dayjs(leave.End_Date__c).format('DD MMM YYYY')}). Please review and approve/reject.`
                : `${employeeName} has requested to withdraw their approved leave from ${dayjs(leave.Start_Date__c).format('DD MMM YYYY')} to ${dayjs(leave.End_Date__c).format('DD MMM YYYY')}. Please review and approve/reject.`,
              'Leave',
              true
            );
          }

          // Notify employee that withdrawal request is pending
          if (emp.Employee_Email__c) {
            const emailData = withdrawalRequestSubmitted({
              recipientName: employeeName,
              leaveType: leave.Leave_Type__c || leave.Leave_Category__c,
              startDate: dayjs(leave.Start_Date__c).format('DD MMM YYYY'),
              endDate: dayjs(leave.End_Date__c).format('DD MMM YYYY'),
              duration: leave.Total_Days__c
            });
            sendEmailAsync({
              to: emp.Employee_Email__c,
              subject: emailData.subject,
              body: emailData.html
            });
          }
        }
      } catch (emailError) {
        console.error('Error sending withdrawal request notification:', emailError);
      }

      return NextResponse.json({
        success: true,
        message: isPartialWithdrawal
          ? "Partial withdrawal request submitted. Awaiting HR approval."
          : "Withdrawal request submitted. Awaiting HR approval.",
        status: 'Withdrawal Pending'
      });
    }

    // Handle approve_withdrawal action (HR or Admin only)
    if (action === "approve_withdrawal") {
      const { role, title } = payload;

      // Check if user can approve withdrawal (HR or Admin only)
      const isHR = role === 'HR';
      const isAdmin = role === 'Admin';

      if (!isHR && !isAdmin) {
        return NextResponse.json({ error: "Only HR or Admin can approve withdrawal requests" }, { status: 403 });
      }

      const leaveRecordQuery = await conn.query<any>(`
        SELECT Id, Employee__c, Status__c, Leave_Category__c, Leave_Type__c, Total_Days__c, Total_Days_After_Rule__c, 
               Start_Date__c, End_Date__c, Session__c, Reason__c, CreatedDate, Employee__r.Role__c,
               Sandwich_Rule__c, Rule_Calculation_Details__c
        FROM Leave__c
        WHERE Id = '${leaveId}'
        LIMIT 1
      `);

      if (leaveRecordQuery.records.length === 0) {
        return NextResponse.json({ error: "Leave not found" }, { status: 404 });
      }

      const leave = leaveRecordQuery.records[0];

      // Verify the leave is in withdrawal pending status
      if (leave.Status__c !== 'Withdrawal Pending') {
        return NextResponse.json({ error: "Leave is not pending withdrawal approval" }, { status: 400 });
      }

      const parsedRuleDetails = parseRuleCalculationDetails(leave.Rule_Calculation_Details__c);
      const partialWithdrawalRequest = (parsedRuleDetails as any)?.partialWithdrawalRequest;

      const leaveStart = dayjs(leave.Start_Date__c).startOf("day");
      const leaveEnd = dayjs(leave.End_Date__c).startOf("day");
      const withdrawalStart = partialWithdrawalRequest?.requested
        ? dayjs(partialWithdrawalRequest.withdrawalStartDate).startOf("day")
        : leaveStart;
      const withdrawalEnd = partialWithdrawalRequest?.requested
        ? dayjs(partialWithdrawalRequest.withdrawalEndDate).startOf("day")
        : leaveEnd;

      if (!withdrawalStart.isValid() || !withdrawalEnd.isValid() || withdrawalEnd.isBefore(withdrawalStart)) {
        return NextResponse.json({ error: "Invalid withdrawal request data" }, { status: 400 });
      }

      const isFullWithdrawal = withdrawalStart.isSame(leaveStart, "day") && withdrawalEnd.isSame(leaveEnd, "day");
      const isTailTrim = withdrawalStart.isAfter(leaveStart, "day") && withdrawalEnd.isSame(leaveEnd, "day");
      const isHeadTrim = withdrawalStart.isSame(leaveStart, "day") && withdrawalEnd.isBefore(leaveEnd, "day");
      const isMiddleSplit = withdrawalStart.isAfter(leaveStart, "day") && withdrawalEnd.isBefore(leaveEnd, "day");

      if (!isFullWithdrawal && !isTailTrim && !isHeadTrim && !isMiddleSplit) {
        return NextResponse.json({ error: "Unsupported withdrawal pattern" }, { status: 400 });
      }

      await updateLeaveBalance(conn, leave, 'revert');

      let responseMessage = "Withdrawal request approved successfully";
      const holidaySet = await getHolidaySet(conn);
      const leaveConfig = await fetchLeaveConfigurations(conn);
      const employeeRole = leave.Employee__r?.Role__c || "";
      const createdReferenceDate = dayjs(leave.CreatedDate || new Date().toISOString()).startOf("day");

      if (isFullWithdrawal) {
        await conn.sobject('Leave__c').update({
          Id: leaveId,
          Status__c: 'Withdrawn',
          Withdrawal_Result_Date__c: new Date().toISOString(),
          Rule_Calculation_Details__c: leave.Rule_Calculation_Details__c,
        });
      } else {
        const canonicalCategory = getCanonicalLeaveCategory(leave.Leave_Category__c || "");
        const sfLeaveCategory = canonicalCategory === "loss-of-pay" ? "Loss of Pay" : "Extra Day Pay";
        const isHalfDayLeave = leave.Session__c === "Session-1" || leave.Session__c === "Session-2";

        if (isHalfDayLeave) {
          return NextResponse.json({ error: "Partial withdrawal is not supported for half-day leave" }, { status: 400 });
        }

        const buildUpdatedRuleDetails = (metrics: RecalculatedLeaveMetrics) => {
          const nextDetails: any = {
            ...metrics.details,
            partialWithdrawalRequest: {
              requested: true,
              withdrawalStartDate: withdrawalStart.format("YYYY-MM-DD"),
              withdrawalEndDate: withdrawalEnd.format("YYYY-MM-DD"),
              approvedAt: new Date().toISOString(),
              approvedBy: employeeId,
            },
          };
          return JSON.stringify(nextDetails);
        };

        if (isTailTrim || isHeadTrim) {
          const retainedStart = isTailTrim ? leaveStart : withdrawalEnd.add(1, "day");
          const retainedEnd = isTailTrim ? withdrawalStart.subtract(1, "day") : leaveEnd;

          const recalculated = createRuleCalculationDetails(
            retainedStart,
            retainedEnd,
            employeeRole,
            leave.Leave_Type__c,
            sfLeaveCategory,
            leave.Session__c,
            leaveConfig,
            holidaySet,
            createdReferenceDate
          );

          await conn.sobject('Leave__c').update({
            Id: leaveId,
            Status__c: 'Approved',
            Start_Date__c: retainedStart.format("YYYY-MM-DD"),
            End_Date__c: retainedEnd.format("YYYY-MM-DD"),
            Total_Days__c: recalculated.totalDays,
            Total_Days_After_Rule__c: recalculated.totalDaysAfterRule,
            OnePlusTwo_Rule__c: recalculated.onePlusTwoRuleApplied,
            Sandwich_Rule__c: recalculated.sandwichApplied,
            Rule_Calculation_Details__c: buildUpdatedRuleDetails(recalculated),
            Withdrawal_Result_Date__c: new Date().toISOString(),
          });

          await updateLeaveBalance(conn, {
            Employee__c: leave.Employee__c,
            Leave_Category__c: leave.Leave_Category__c,
            Leave_Type__c: leave.Leave_Type__c,
            Total_Days__c: recalculated.totalDays,
            Total_Days_After_Rule__c: recalculated.totalDaysAfterRule,
          }, 'approve');

          responseMessage = "Partial withdrawal approved and leave updated successfully";
        }

        if (isMiddleSplit) {
          const leftStart = leaveStart;
          const leftEnd = withdrawalStart.subtract(1, "day");
          const rightStart = withdrawalEnd.add(1, "day");
          const rightEnd = leaveEnd;

          const leftRecalculated = createRuleCalculationDetails(
            leftStart,
            leftEnd,
            employeeRole,
            leave.Leave_Type__c,
            sfLeaveCategory,
            leave.Session__c,
            leaveConfig,
            holidaySet,
            createdReferenceDate
          );

          const rightRecalculated = createRuleCalculationDetails(
            rightStart,
            rightEnd,
            employeeRole,
            leave.Leave_Type__c,
            sfLeaveCategory,
            leave.Session__c,
            leaveConfig,
            holidaySet,
            createdReferenceDate
          );

          await conn.sobject('Leave__c').update({
            Id: leaveId,
            Status__c: 'Approved',
            Start_Date__c: leftStart.format("YYYY-MM-DD"),
            End_Date__c: leftEnd.format("YYYY-MM-DD"),
            Total_Days__c: leftRecalculated.totalDays,
            Total_Days_After_Rule__c: leftRecalculated.totalDaysAfterRule,
            OnePlusTwo_Rule__c: leftRecalculated.onePlusTwoRuleApplied,
            Sandwich_Rule__c: leftRecalculated.sandwichApplied,
            Rule_Calculation_Details__c: buildUpdatedRuleDetails(leftRecalculated),
            Withdrawal_Result_Date__c: new Date().toISOString(),
          });

          await conn.sobject('Leave__c').create({
            Employee__c: leave.Employee__c,
            Leave_Type__c: leave.Leave_Type__c,
            Leave_Category__c: leave.Leave_Category__c,
            Start_Date__c: rightStart.format("YYYY-MM-DD"),
            End_Date__c: rightEnd.format("YYYY-MM-DD"),
            Session__c: leave.Session__c,
            Reason__c: leave.Reason__c || '',
            Status__c: 'Approved',
            Total_Days__c: rightRecalculated.totalDays,
            Total_Days_After_Rule__c: rightRecalculated.totalDaysAfterRule,
            OnePlusTwo_Rule__c: rightRecalculated.onePlusTwoRuleApplied,
            Sandwich_Rule__c: rightRecalculated.sandwichApplied,
            Rule_Calculation_Details__c: buildUpdatedRuleDetails(rightRecalculated),
            HR_Approval__c: 'Approved',
            Approved_Date__c: new Date().toISOString(),
          });

          await updateLeaveBalance(conn, {
            Employee__c: leave.Employee__c,
            Leave_Category__c: leave.Leave_Category__c,
            Leave_Type__c: leave.Leave_Type__c,
            Total_Days__c: leftRecalculated.totalDays,
            Total_Days_After_Rule__c: leftRecalculated.totalDaysAfterRule,
          }, 'approve');

          await updateLeaveBalance(conn, {
            Employee__c: leave.Employee__c,
            Leave_Category__c: leave.Leave_Category__c,
            Leave_Type__c: leave.Leave_Type__c,
            Total_Days__c: rightRecalculated.totalDays,
            Total_Days_After_Rule__c: rightRecalculated.totalDaysAfterRule,
          }, 'approve');

          responseMessage = "Partial withdrawal approved and leave split into two approved records";
        }
      }

      // Send notification emails
      try {
        const empData = await conn.query<any>(`
          SELECT Id, Name, Employee_Email__c, Employee_Name__c, Role__c, Title__c,
                 Team_Lead__c, Team_Lead__r.Employee_Name__c, Team_Lead__r.Employee_Email__c
          FROM Employee__c
          WHERE Id = '${leave.Employee__c}'
          LIMIT 1
        `);

        console.log("Employee data for withdrawal approval notification:", empData);

        if (empData.records && empData.records.length > 0) {
          const emp = empData.records[0];
          const employeeName = emp.Employee_Name__c || emp.Name || 'Employee';
          console.log("Notifying employee:", employeeName);
          const employeeRole = emp.Role__c;
          const employeeTitle = emp.Title__c;

          const notificationRecipients: string[] = [];

          // Send email to employee
          if (emp.Employee_Email__c) {
            const approverTitle = isAdmin ? 'Admin' : 'HR';
            const emailLeaveType = getDisplayLeaveType(leave.Leave_Type__c, leave.Leave_Category__c || "");
            const emailData = withdrawalApproved({
              recipientName: employeeName,
              leaveType: emailLeaveType,
              startDate: dayjs(leave.Start_Date__c).format('DD MMM YYYY'),
              endDate: dayjs(leave.End_Date__c).format('DD MMM YYYY'),
              duration: leave.Total_Days__c,
              approverTitle: approverTitle
            });
            sendEmailAsync({
              to: emp.Employee_Email__c,
              subject: emailData.subject,
              body: emailData.html
            });
          }

          // Send in-app notification to employee
          await sendInAppNotifications(
            [leave.Employee__c],
            `Your withdrawal request for leave from ${dayjs(leave.Start_Date__c).format('DD MMM YYYY')} to ${dayjs(leave.End_Date__c).format('DD MMM YYYY')} has been approved. Your leave balance has been restored.`,
            'Leave',
            false
          );

          // Send notification to Team Lead (for regular employees)
          if (employeeRole !== 'HR' && employeeRole !== 'Admin' && !(employeeRole === 'Developer' && employeeTitle === 'Team Lead')) {
            if (emp.Team_Lead__c) {
              notificationRecipients.push(emp.Team_Lead__c);

              if (emp.Team_Lead__r?.Employee_Email__c) {
                const emailData = withdrawalApproved({
                  recipientName: emp.Team_Lead__r.Employee_Name__c,
                  employeeName: employeeName,
                  leaveType: getDisplayLeaveType(leave.Leave_Type__c, leave.Leave_Category__c || ""),
                  startDate: dayjs(leave.Start_Date__c).format('DD MMM YYYY'),
                  endDate: dayjs(leave.End_Date__c).format('DD MMM YYYY'),
                  duration: leave.Total_Days__c,
                  approverTitle: 'HR'
                });
                sendEmailAsync({
                  to: emp.Team_Lead__r.Employee_Email__c,
                  subject: `Withdrawal Approved: ${employeeName} - Leave from ${dayjs(leave.Start_Date__c).format('DD MMM YYYY')} to ${dayjs(leave.End_Date__c).format('DD MMM YYYY')}`,
                  body: emailData.html
                });
              }
            }

            if (notificationRecipients.length > 0) {
              await sendInAppNotifications(
                notificationRecipients,
                `${employeeName}'s withdrawal request has been approved. Leave from ${dayjs(leave.Start_Date__c).format('DD MMM YYYY')} to ${dayjs(leave.End_Date__c).format('DD MMM YYYY')} has been withdrawn.`,
                'Leave',
                false
              );
            }
          }
        }
      } catch (emailError) {
        console.error('Error sending withdrawal approval notification:', emailError);
      }

      return NextResponse.json({ success: true, message: responseMessage });
    }

    // Handle reject_withdrawal action (HR or Admin only)
    if (action === "reject_withdrawal") {
      const { role, title } = payload;
      const { reason } = body;

      // Check if user can reject withdrawal (HR or Admin only)
      const isHR = role === 'HR';
      const isAdmin = role === 'Admin';

      if (!isHR && !isAdmin) {
        return NextResponse.json({ error: "Only HR or Admin can reject withdrawal requests" }, { status: 403 });
      }

      const leaveRecordQuery = await conn.query<any>(`
        SELECT Id, Employee__c, Status__c, Leave_Category__c, Leave_Type__c, Total_Days__c, 
               Start_Date__c, End_Date__c
        FROM Leave__c
        WHERE Id = '${leaveId}'
        LIMIT 1
      `);

      if (leaveRecordQuery.records.length === 0) {
        return NextResponse.json({ error: "Leave not found" }, { status: 404 });
      }

      const leave = leaveRecordQuery.records[0];

      // Verify the leave is in withdrawal pending status
      if (leave.Status__c !== 'Withdrawal Pending') {
        return NextResponse.json({ error: "Leave is not pending withdrawal approval" }, { status: 400 });
      }

      // Update the status back to Approved and store rejection reason
      await conn.sobject('Leave__c').update({
        Id: leaveId,
        Status__c: 'Approved',
        Withdrawal_Rejection_Reason__c: reason || '',
        Withdrawal_Result_Date__c: new Date().toISOString(),
      });

      // Send notification emails
      try {
        const empData = await conn.query<any>(`
          SELECT Id, Name, Employee_Email__c, Employee_Name__c, Role__c, Title__c,
                 Team_Lead__c, Team_Lead__r.Employee_Name__c
          FROM Employee__c
          WHERE Id = '${leave.Employee__c}'
          LIMIT 1
        `);

        if (empData.records && empData.records.length > 0) {
          const emp = empData.records[0];
          const employeeName = emp.Employee_Name__c || emp.Name || 'Employee';

          // Send email to employee
          if (emp.Employee_Email__c) {
            const approverTitle = isAdmin ? 'Admin' : 'HR';
            const emailData = withdrawalRejected({
              recipientName: employeeName,
              leaveType: leave.Leave_Type__c || leave.Leave_Category__c,
              startDate: dayjs(leave.Start_Date__c).format('DD MMM YYYY'),
              endDate: dayjs(leave.End_Date__c).format('DD MMM YYYY'),
              duration: leave.Total_Days__c,
              approverTitle: approverTitle,
              reason: reason || 'No reason provided'
            });
            sendEmailAsync({
              to: emp.Employee_Email__c,
              subject: emailData.subject,
              body: emailData.html
            });
          }

          // Send in-app notification to employee
          const reasonText = reason ? ` Reason: ${reason}` : '';
          await sendInAppNotifications(
            [leave.Employee__c],
            `Your withdrawal request for leave from ${dayjs(leave.Start_Date__c).format('DD MMM YYYY')} to ${dayjs(leave.End_Date__c).format('DD MMM YYYY')} has been rejected.${reasonText}`,
            'Leave',
            false
          );
        }
      } catch (emailError) {
        console.error('Error sending withdrawal rejection notification:', emailError);
      }

      return NextResponse.json({ success: true, message: "Withdrawal request rejected successfully" });
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
        updateData.Actual_Deduction__c = calculateLeaveDeduction(
          oldLeave.Leave_Category__c,
          oldLeave.Start_Date__c,
          oldLeave.Total_Days__c,
          oldLeave.Employee__r?.Base_Salary__c
        );
        updateData.After_Rule_Deduction__c = calculateLeaveDeduction(
          oldLeave.Leave_Category__c,
          oldLeave.Start_Date__c,
          oldLeave.Total_Days_After_Rule__c,
          oldLeave.Employee__r?.Base_Salary__c
        );

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

            // Send in-app notification to employee
            await sendInAppNotifications(
              [oldLeave.Employee__c],
              `Your leave request from ${dayjs(oldLeave.Start_Date__c).format('DD MMM YYYY')} to ${dayjs(oldLeave.End_Date__c).format('DD MMM YYYY')} has been approved by your Team Lead. Awaiting HR approval.`,
              'Leave',
              false
            );

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

            // Send in-app notification to HR
            const hrQuery = await conn.query<any>(`
              SELECT Id FROM Employee__c
              WHERE Role__c = 'HR' AND Active__c = true
              LIMIT 1
            `);
            if (hrQuery.records && hrQuery.records.length > 0) {
              await sendInAppNotifications(
                [hrQuery.records[0].Id],
                `${employeeName}'s leave request from ${dayjs(oldLeave.Start_Date__c).format('DD MMM YYYY')} to ${dayjs(oldLeave.End_Date__c).format('DD MMM YYYY')} has been approved by Team Lead (${teamLeadName}). Awaiting your approval.`,
                'Leave',
                true
              );
            }
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

            // Send in-app notification to employee
            const approverTitle = isAdmin ? 'Admin' : 'HR';
            await sendInAppNotifications(
              [oldLeave.Employee__c],
              `Your leave request from ${dayjs(oldLeave.Start_Date__c).format('DD MMM YYYY')} to ${dayjs(oldLeave.End_Date__c).format('DD MMM YYYY')} has been approved by ${approverTitle}. Enjoy your leave!`,
              'Leave',
              false
            );

            // Send in-app notification to Team Lead (for regular employees)
            const tlQuery = await conn.query<any>(`
              SELECT Team_Lead__c FROM Employee__c
              WHERE Id = '${oldLeave.Employee__c}' AND Team_Lead__c != null
              LIMIT 1
            `);
            if (tlQuery.records && tlQuery.records.length > 0 && tlQuery.records[0].Team_Lead__c) {
              await sendInAppNotifications(
                [tlQuery.records[0].Team_Lead__c],
                `${employeeName}'s leave request from ${dayjs(oldLeave.Start_Date__c).format('DD MMM YYYY')} to ${dayjs(oldLeave.End_Date__c).format('DD MMM YYYY')} has been approved by ${approverTitle}.`,
                'Leave',
                false
              );
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

            // Send in-app notification to employee
            const reasonText = reason ? ` Reason: ${reason}` : '';
            await sendInAppNotifications(
              [oldLeave.Employee__c],
              `Your leave request from ${dayjs(oldLeave.Start_Date__c).format('DD MMM YYYY')} to ${dayjs(oldLeave.End_Date__c).format('DD MMM YYYY')} has been rejected by your Team Lead.${reasonText}`,
              'Leave',
              false
            );

            // Send in-app notification to HR
            const hrQuery = await conn.query<any>(`
              SELECT Id FROM Employee__c
              WHERE Role__c = 'HR' AND Active__c = true
              LIMIT 1
            `);
            if (hrQuery.records && hrQuery.records.length > 0) {
              await sendInAppNotifications(
                [hrQuery.records[0].Id],
                `${employeeName}'s leave request from ${dayjs(oldLeave.Start_Date__c).format('DD MMM YYYY')} to ${dayjs(oldLeave.End_Date__c).format('DD MMM YYYY')} has been rejected by Team Lead.${reasonText}`,
                'Leave',
                false
              );
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

            // Send in-app notification to employee
            const approverTitle = isAdmin ? 'Admin' : 'HR';
            const reasonText = reason ? ` Reason: ${reason}` : '';
            await sendInAppNotifications(
              [oldLeave.Employee__c],
              `Your leave request from ${dayjs(oldLeave.Start_Date__c).format('DD MMM YYYY')} to ${dayjs(oldLeave.End_Date__c).format('DD MMM YYYY')} has been rejected by ${approverTitle}.${reasonText}`,
              'Leave',
              false
            );

            // Send in-app notification to Team Lead (for regular employees)
            const tlQuery = await conn.query<any>(`
              SELECT Team_Lead__c FROM Employee__c
              WHERE Id = '${oldLeave.Employee__c}' AND Team_Lead__c != null
              LIMIT 1
            `);
            if (tlQuery.records && tlQuery.records.length > 0 && tlQuery.records[0].Team_Lead__c) {
              await sendInAppNotifications(
                [tlQuery.records[0].Team_Lead__c],
                `${employeeName}'s leave request from ${dayjs(oldLeave.Start_Date__c).format('DD MMM YYYY')} to ${dayjs(oldLeave.End_Date__c).format('DD MMM YYYY')} has been rejected by ${approverTitle}.${reasonText}`,
                'Leave',
                false
              );
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
/**
 * Calculate leave deduction based on leave category, days, and base salary
 */
function calculateLeaveDeduction(
  Leave_Category__c: string,
  Start_Date__c: string,
  Total_Days__c: number,
  Base_Salary__c: number
): number {
  // If no base salary is provided, return 0
  if (!Base_Salary__c || Base_Salary__c <= 0) {
    return 0;
  }

  // Get the month from start date and calculate days in that month
  const startDate = dayjs(Start_Date__c);
  const daysInMonth = startDate.daysInMonth();

  // Calculate daily salary based on actual days in the month
  const dailySalary = Base_Salary__c / daysInMonth;
  const deductionAmount = dailySalary * Total_Days__c;

  if (Leave_Category__c === 'Loss of Pay') {
    // For Loss of Pay, deduct based on total days (negative value represents deduction)
    return -deductionAmount;
  } else if (Leave_Category__c === 'Extra Day Pay') {
    // For Extra Day Pay, add based on total days (positive value represents addition)
    return deductionAmount;
  }

  // Default case: no deduction
  return 0;
}
