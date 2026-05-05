import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import dayjs from "dayjs";
import { verifyToken } from "@/lib/auth-utils";
import { getSalesforceConnection, sendInAppNotifications } from "@/lib/salesforce";
import { sendEmailAsync, getHREmail, hasGoogleWorkspaceIntegration } from "@/lib/email";
import { createLeaveCalendarEventForEmployee, deleteLeaveCalendarEventForEmployee } from "@/lib/google-calendar";
import { calculateLeaveDays, type LeaveDateInput } from "@/lib/leave-policy";
import {
  employeeLeaveRequestToHR,
  teamLeadDecisionToHR,
  hrDecisionToEmployee,
  teamLeadLeaveRequestToHRWithAdminCC,
  hrDecisionToTeamLead,
  adminDecisionToHR,
  hrLeaveRequestToAdmin,
  doubtfulLeaveMarkedToAdmin,
  leaveAutoApproved,
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
  OnePlusTwoRule: boolean;
  SandwichRule: boolean;
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
    const OnePlusTwoRule = configMap.get('One_plus_two_rule')?.toLowerCase() === 'true';
    const SandwichRule = configMap.get('Sandwich_Rule')?.toLowerCase() === 'true';
    const sandwichRuleAppliesTo = (configMap.get('Sandwich_Rule_Applies_to') || '')
      .split(',').map(role => role.trim()).filter(Boolean);
    const penaltyAppliesTo = (configMap.get('One_Two_Applies_to') || '')
      .split(',').map(role => role.trim()).filter(Boolean);
    const minWorkingDayNoticePeriod = parseInt(configMap.get('minimum_working_working_day_notice_perio') || '5');
    const penaltyDaysPerDay = parseFloat(configMap.get('penalty_days_per_day') || '2');

    console.log('[Leave Config] Fetched configurations:', {
      annualLeaveBalance,
      OnePlusTwoRule,
      SandwichRule,
      sandwichRuleAppliesTo,
      penaltyAppliesTo,
      minWorkingDayNoticePeriod,
      penaltyDaysPerDay,
    });

    return {
      annualLeaveBalance,
      OnePlusTwoRule,
      SandwichRule,
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
      OnePlusTwoRule: true,
      SandwichRule: true,
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

function normalizeSessionValue(session?: string): "Session-1" | "Session-2" | undefined {
  if (session === "Session-1" || session === "Session-2") {
    return session;
  }

  return undefined;
}

function getSessionDisplayLabel(startSession?: string, endSession?: string): string | undefined {
  if (!startSession && !endSession) {
    return undefined;
  }

  const startLabel = startSession === "Session-1" ? "Session 1" : startSession === "Session-2" ? "Session 2" : startSession;
  const endLabel = endSession === "Session-1" ? "Session 1" : endSession === "Session-2" ? "Session 2" : endSession;

  if (startSession && endSession) {
    if (startSession === endSession) {
      return startLabel;
    }

    return `${startLabel} → ${endLabel}`;
  }

  return startLabel || endLabel;
}

function isHalfDaySessionRange(
  startSession: string | undefined,
  endSession: string | undefined,
  startDate: dayjs.Dayjs,
  endDate: dayjs.Dayjs
): boolean {
  return startDate.isSame(endDate, "day")
    && startSession === endSession
    && (startSession === "Session-1" || startSession === "Session-2");
}

function getCalendarEventRange(
  startDate: dayjs.Dayjs,
  endDate: dayjs.Dayjs,
  startSession?: string,
  endSession?: string
): { startDate: string; endDate: string } | null {
  if (!startDate.isValid() || !endDate.isValid()) {
    return null;
  }

  const isSameDay = startDate.isSame(endDate, "day");
  const isHalfDay = isHalfDaySessionRange(startSession, endSession, startDate, endDate);
  if (isHalfDay) {
    return null;
  }

  let eventStart = startDate.clone();
  let eventEnd = endDate.clone();

  if (!isSameDay) {
    if (startSession && startSession !== "Session-1") {
      eventStart = eventStart.add(1, "day");
    }

    if (endSession && endSession !== "Session-2") {
      eventEnd = eventEnd.subtract(1, "day");
    }
  }

  if (eventEnd.isBefore(eventStart, "day")) {
    return null;
  }

  return {
    startDate: eventStart.format("YYYY-MM-DD"),
    endDate: eventEnd.format("YYYY-MM-DD"),
  };
}

function logLeaveEmailDispatch(stage: string, to: string, cc?: string | string[], subject?: string): void {
  const ccList = Array.isArray(cc) ? cc.filter(Boolean) : cc ? [cc] : [];
  console.log('📧 [Leave Email Debug]', {
    stage,
    to,
    cc: ccList,
    subject,
  });
}

function createRuleCalculationDetails(
  startDate: dayjs.Dayjs,
  endDate: dayjs.Dayjs,
  role: string | undefined,
  leaveType: string | undefined,
  leaveCategory: string,
  sessionStartValue: string | undefined,
  sessionEndValue: string | undefined,
  leaveConfig: LeaveConfig,
  holidaySet: Set<string>,
  createdReferenceDate: dayjs.Dayjs,
  mergeInfo?: RuleCalculationDetails["mergeInfo"],
  ruleSelection?: boolean | { applySandwichRule?: boolean; applyOnePlusTwoRule?: boolean }
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
  const isHalfDay = isHalfDaySessionRange(sessionStartValue, sessionEndValue, startDate, endDate);
  
  // First, calculate working days in range
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
  
  // Check if start day is partial (doesn't start with Session-1) or end day is partial (doesn't end with Session-2)
  const startDayIsPartial = sessionStartValue && sessionStartValue !== "Session-1";
  const endDayIsPartial = sessionEndValue && sessionEndValue !== "Session-2";
  
  // Calculate the number of full working days (excluding partial days at start/end)
  let fullWorkingDaysInRange = workingDaysInRange;
  if (startDayIsPartial && !startDate.isSame(endDate, "day")) fullWorkingDaysInRange--;
  if (endDayIsPartial && !startDate.isSame(endDate, "day")) fullWorkingDaysInRange--;
  
  const applyPolicyRules = typeof ruleSelection === "boolean" ? ruleSelection : true;
  const selectedSandwichRule =
    typeof ruleSelection === "object" && ruleSelection !== null
      ? ruleSelection.applySandwichRule === true
      : true;
  const selectedOnePlusTwoRule =
    typeof ruleSelection === "object" && ruleSelection !== null
      ? ruleSelection.applyOnePlusTwoRule === true
      : true;

  const applyRules =
    applyPolicyRules &&
    effectiveLeaveCategory === "Loss of Pay" &&
    (leaveType || "") === "Planned Leave";
  const sandwichRuleAppliesToUser = leaveConfig.sandwichRuleAppliesTo.includes(role || "");
  const penaltyAppliesToUser = leaveConfig.penaltyAppliesTo.includes(role || "");
  const applySandwichRule =
    applyRules &&
    selectedSandwichRule &&
    !isHalfDay &&
    fullWorkingDaysInRange > 0 &&
    leaveConfig.SandwichRule &&
    sandwichRuleAppliesToUser;

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
  
  // Account for partial session days in multi-day leaves
  // Subtract 0.5 for each partial day at start and end
  if (!startDate.isSame(endDate, "day")) {
    if (startDayIsPartial) rangeLeaveDays -= 0.5;
    if (endDayIsPartial) rangeLeaveDays -= 0.5;
  }

  const sandwichExtra = sandwichApplied ? sandwichDates.length : 0;

  let onePlusTwoExtra = 0;
  if (applyRules && selectedOnePlusTwoRule && !isHalfDay && fullWorkingDaysInRange > 0 && leaveConfig.OnePlusTwoRule && penaltyAppliesToUser) {
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
    
    // Only apply penalty to full working days, not to partial days
    let penaltyStartDate = startDate.clone();
    let penaltyEndDate = endDate.clone();
    
    // Skip the first day if it's a partial day (doesn't start with Session-1)
    if (startDayIsPartial && !startDate.isSame(endDate, "day")) {
      penaltyStartDate = penaltyStartDate.add(1, "day");
    }
    
    // If last day is partial (doesn't end with Session-2), don't apply penalty to it
    if (endDayIsPartial && !startDate.isSame(endDate, "day")) {
      penaltyEndDate = penaltyEndDate.subtract(1, "day");
    }
    
    // Apply penalty only to full working days
    let cursorPenalty = penaltyStartDate.startOf("day");
    const endPenalty = penaltyEndDate.startOf("day");

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
          Employee__r.Employee_Id__c,
          Employee__r.Employee_Name__c,
          Employee__r.Team_Lead__r.Employee_Name__c,
          Employee__r.Role__c,
          Leave_Type__c,
          Leave_Category__c,
          Start_Date__c,
          End_Date__c,
          Session_Start__c,
          Session_End__c,
          Total_Days__c,
          Status__c,
          Approved_Date__c,
          TL_Approval__c,
          HR_Approval__c,
          Sandwich_Rule__c,
          OnePlusTwo_Rule__c,
          Doubtfull_Case__c,
          Reason__c,
          Rule_Calculation_Details__c
        FROM Leave__c
        WHERE Status__c IN ('Applied', 'Withdrawal Pending')
        ORDER BY Start_Date__c ASC
      `);

      console.log("Fetched pending HR approvals for Admin:", pendingLeaveRecords);

      pendingApprovals = pendingLeaveRecords.records.map((record: any) => {
        const parsedDetails = parseRuleCalculationDetails(record.Rule_Calculation_Details__c);
        const partialRequest = (parsedDetails as any)?.partialWithdrawalRequest;
        const sandwichRuleApplicable = record.Sandwich_Rule__c === true;
        const onePlusTwoRuleApplicable = record.OnePlusTwo_Rule__c === true;

        return {
          id: record.Id,
          employeeId: record.Employee__r.Employee_Id__c,
          employeeName: record.Employee__r?.Employee_Name__c || "Unknown",
          teamLeadName: record.Employee__r?.Team_Lead__r?.Employee_Name__c || "No Team Lead",
          leaveType: record.Leave_Category__c === 'Extra Day Pay' ? 'Extra Day Pay' : (record.Leave_Type__c || ""),
          leaveCategory: record.Leave_Category__c,
          startDate: record.Start_Date__c || "",
          endDate: record.End_Date__c || "",
          sessionStart: normalizeSessionValue(record.Session_Start__c),
          sessionEnd: normalizeSessionValue(record.Session_End__c),
          session: getSessionDisplayLabel(record.Session_Start__c, record.Session_End__c),
          duration: record.Total_Days__c || 0,
          status: record.Status__c?.toLowerCase() || "pending",
          isWithdrawalRequest: record.Status__c === 'Withdrawal Pending',
          approvedBy: record.Approved_By__c,
          approvalDate: record.Approved_Date__c,
          reason: record.Reason__c || '',
          tlApproved: record.TL_Approval__c,
          hrApproval: record.HR_Approval__c,
          sandwichRuleApplicable,
          onePlusTwoRuleApplicable,
          doubtfullCase: record.Doubtfull_Case__c === true,
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
          Employee__r.Employee_Id__c,
          Employee__r.Employee_Name__c,
          Employee__r.Team_Lead__r.Employee_Name__c,
          Employee__r.Role__c,
          Employee__r.Title__c,
          Leave_Type__c,
          Leave_Category__c,
          Start_Date__c,
          End_Date__c,
          Session_Start__c,
          Session_End__c,
          Total_Days__c,
          Status__c,
          Approved_Date__c,
          TL_Approval__c,
          HR_Approval__c,
          Sandwich_Rule__c,
          OnePlusTwo_Rule__c,
          Doubtfull_Case__c,
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
        const sandwichRuleApplicable = record.Sandwich_Rule__c === true;
        const onePlusTwoRuleApplicable = record.OnePlusTwo_Rule__c === true;

        return {
          id: record.Id,
          employeeId: record.Employee__r.Employee_Id__c,
          employeeName: record.Employee__r?.Employee_Name__c || "Unknown",
          teamLeadName: record.Employee__r?.Team_Lead__r?.Employee_Name__c || "No Team Lead",
          leaveType: record.Leave_Category__c === 'Extra Day Pay' ? 'Extra Day Pay' : (record.Leave_Type__c || ""),
          leaveCategory: record.Leave_Category__c,
          startDate: record.Start_Date__c || "",
          endDate: record.End_Date__c || "",
          sessionStart: normalizeSessionValue(record.Session_Start__c),
          sessionEnd: normalizeSessionValue(record.Session_End__c),
          session: getSessionDisplayLabel(record.Session_Start__c, record.Session_End__c),
          duration: record.Total_Days__c || 0,
          status: record.Status__c?.toLowerCase() || "pending",
          isWithdrawalRequest: record.Status__c === 'Withdrawal Pending',
          approvedBy: record.Approved_By__c,
          approvalDate: record.Approved_Date__c,
          reason: record.Reason__c || '',
          tlApproved: record.TL_Approval__c,
          hrApproval: record.HR_Approval__c,
          sandwichRuleApplicable,
          onePlusTwoRuleApplicable,
          doubtfullCase: record.Doubtfull_Case__c === true,
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
          Session_Start__c,
          Session_End__c,
          Total_Days__c,
          Status__c,
          Approved_Date__c,
          TL_Approval__c,
          HR_Approval__c,
          Sandwich_Rule__c,
          OnePlusTwo_Rule__c,
          Doubtfull_Case__c,
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
        const sandwichRuleApplicable = record.Sandwich_Rule__c === true;
        const onePlusTwoRuleApplicable = record.OnePlusTwo_Rule__c === true;

        return {
          id: record.Id,
          employeeId: record.Employee__c,
          employeeName: record.Employee__r?.Employee_Name__c || "Unknown",
          leaveType: record.Leave_Category__c === 'Extra Day Pay' ? 'Extra Day Pay' : (record.Leave_Type__c || ""),
          leaveCategory: record.Leave_Category__c,
          startDate: record.Start_Date__c || "",
          endDate: record.End_Date__c || "",
          sessionStart: normalizeSessionValue(record.Session_Start__c),
          sessionEnd: normalizeSessionValue(record.Session_End__c),
          session: getSessionDisplayLabel(record.Session_Start__c, record.Session_End__c),
          duration: record.Total_Days__c || 0,
          status: record.Status__c?.toLowerCase() || "pending",
          isWithdrawalRequest: record.Status__c === 'Withdrawal Pending',
          approvedBy: record.Approved_By__c,
          approvalDate: record.Approved_Date__c,
          reason: record.Reason__c || '',
          tlApproved: record.TL_Approval__c,
          hrApproval: record.HR_Approval__c,
          sandwichRuleApplicable,
          onePlusTwoRuleApplicable,
          doubtfullCase: record.Doubtfull_Case__c === true,
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
    const hrEmail = await getHREmail();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify the session token
    const payload = await verifyToken(session);

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
      session: legacySession,
      sessionStart: rawSessionStart,
      sessionEnd: rawSessionEnd,
      reason: rawReason,
      onePlusTwoApplied,
      confirmedRules,
      confirmMerge,
      mergeExistingLeaveId
    } = body;
    const targetEmployeeId = body?.employeeId;
    const isAdminAutoApprove = role === 'Admin';
    const reason = rawReason?.trim() || '';
    const rulesAlreadyConfirmed = confirmedRules === true;
    const confirmMergeWithExisting = confirmMerge === true;
    const requestedStartDateStr = startDate;
    const requestedEndDateStr = endDate;
    const sessionStartValue = normalizeSessionValue(rawSessionStart)
      ?? (legacySession === 'Full Day' ? 'Session-1' : normalizeSessionValue(legacySession));
    const sessionEndValue = normalizeSessionValue(rawSessionEnd)
      ?? (legacySession === 'Full Day' ? 'Session-2' : normalizeSessionValue(legacySession));
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

    const hasGoogleIntegration = await hasGoogleWorkspaceIntegration(employeeId);
    if (!hasGoogleIntegration) {
      return NextResponse.json(
        {
          error: "Please authenticate Google Workspace before applying for leave.",
          code: "GOOGLE_AUTH_REQUIRED",
          redirectTo: "/dashboard?tab=integration",
        },
        { status: 400 }
      );
    }

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
        SELECT Id, Employee_Name__c, Company_Email__c, Salary_CTC__c,
               Team_Lead__c, Team_Lead__r.Employee_Name__c, Team_Lead__r.Company_Email__c
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
        Session_Start__c: 'Session-1',
        Session_End__c: 'Session-2',
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
          targetEmployee.Salary_CTC__c
        ),
        After_Rule_Deduction__c: calculateLeaveDeduction(
          'Loss of Pay',
          parsedStart.format('YYYY-MM-DD'),
          fullDayDuration,
          targetEmployee.Salary_CTC__c
        ),
      };

      const createResult = await conn.sobject('Leave__c').create(approvedLeaveRecord) as any;

      if (!createResult.success) {
        return NextResponse.json({ error: 'Failed to create leave request' }, { status: 500 });
      }

      // Keep leave summary/balance in sync for direct-approved apply-for-others flow
      await updateLeaveBalance(conn, approvedLeaveRecord, 'approve');

      const calendarRange = getCalendarEventRange(
        parsedStart,
        parsedEnd,
        approvedLeaveRecord.Session_Start__c,
        approvedLeaveRecord.Session_End__c
      );

      const createdEventId = calendarRange
        ? await createLeaveCalendarEventForEmployee({
            employeeId: targetEmployeeId,
            employeeName: targetEmployee.Employee_Name__c || 'Employee',
            leaveType,
            leaveCategory: approvedLeaveRecord.Leave_Category__c,
            startDate: calendarRange.startDate,
            endDate: calendarRange.endDate,
            reason: reason || `Applied by ${approverTitle}`,
            approvedBy: approverTitle,
          })
        : null;

      console.log('📅 [Leave] applyForOthers calendar creation result:', {
        leaveId: createResult.id,
        targetEmployeeId,
        createdEventId,
      });

      if (createdEventId) {
        await persistLeaveEventId(conn, createResult.id, createdEventId, 'applyForOthers-approved');
      }

      try {
        const employeeName = targetEmployee.Employee_Name__c || 'Employee';
        const employeeEmail = targetEmployee.Company_Email__c;
        const teamLeadEmail = targetEmployee.Team_Lead__r?.Company_Email__c;
        const adminQuery = await conn.query<any>(`
          SELECT Id, Employee_Name__c, Company_Email__c
          FROM Employee__c
          WHERE Role__c = 'Admin' AND Active__c = true
        `);

        const adminRecipients = (adminQuery.records || [])
          .map((admin: any) => ({
            id: admin.Id,
            name: admin.Employee_Name__c || 'Admin',
            email: admin.Company_Email__c,
          }))
          .filter((admin: { id: string; name: string; email?: string }) => Boolean(admin.email));

        if (employeeEmail) {
          const ccCandidates = isAdmin
            ? [teamLeadEmail, hrEmail]
            : [
                teamLeadEmail,
                ...adminRecipients.map((admin: { id: string; name: string; email: string }) => admin.email),
              ];

          const seenCcEmails = new Set<string>();
          const normalizedEmployeeEmail = employeeEmail.trim().toLowerCase();
          const ccRecipients = ccCandidates.filter((ccEmail): ccEmail is string => {
            if (!ccEmail) {
              return false;
            }

            const normalizedCcEmail = ccEmail.trim().toLowerCase();
            if (!normalizedCcEmail || normalizedCcEmail === normalizedEmployeeEmail || seenCcEmails.has(normalizedCcEmail)) {
              return false;
            }

            seenCcEmails.add(normalizedCcEmail);
            return true;
          });

          const autoApprovedTemplate = await leaveAutoApproved({
            recipientName: employeeName,
            employeeName,
            approverTitle,
            leaveType,
            startDate: parsedStart.format('YYYY-MM-DD'),
            endDate: parsedEnd.format('YYYY-MM-DD'),
            duration: fullDayDuration,
          });

          logLeaveEmailDispatch('apply-for-others-auto-approval-to-employee', employeeEmail, ccRecipients, autoApprovedTemplate.subject);
          sendEmailAsync({
            to: employeeEmail,
            cc: ccRecipients,
            subject: autoApprovedTemplate.subject,
            body: autoApprovedTemplate.html,
            senderEmployeeId: employeeId,
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
    if (!leaveCategory || !startDate || !endDate || !sessionStartValue || !sessionEndValue) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Validate date policy:
    // - Sick/Emergency/Earned: no future dates, current month allowed, previous month only when today <= 7
    // - Planned Loss of Pay: current/future only
    const today = dayjs().startOf("day");
    const leaveStartDate = dayjs(startDate).startOf("day");
    const leaveEndDate = dayjs(endDate).startOf("day");
    const normalizedCategory = (leaveCategory || "").toLowerCase().replace(/\s+/g, "-");
    const normalizedLeaveType = (leaveType || "").toLowerCase().trim();

    const isSickLeave = normalizedLeaveType === "sick leave";
    const isEmergencyLeave = normalizedLeaveType === "emergency leave";
    const isEarnedLeave = normalizedLeaveType === "earned leave" || normalizedCategory === "extra-day-pay";
    const isRestrictedBackdateType = isSickLeave || isEmergencyLeave || isEarnedLeave;

    if (isRestrictedBackdateType) {
      if (leaveStartDate.isAfter(today) || leaveEndDate.isAfter(today)) {
        return NextResponse.json({
          error: "Cannot apply leave for future dates",
          details: {
            message: "Sick, Emergency, and Earned leaves can only be applied for past/current dates based on policy."
          }
        }, { status: 400 });
      }

      const currentMonthStart = today.startOf("month");
      const previousMonthStart = today.subtract(1, "month").startOf("month");
      const canUsePreviousMonth = today.date() <= 7;

      const isWithinAllowedWindow = (dateValue: dayjs.Dayjs) => {
        const inCurrentMonth = !dateValue.isBefore(currentMonthStart, "day");
        const inPreviousMonth = canUsePreviousMonth && !dateValue.isBefore(previousMonthStart, "day") && dateValue.isBefore(currentMonthStart, "day");
        return inCurrentMonth || inPreviousMonth;
      };

      if (!isWithinAllowedWindow(leaveStartDate) || !isWithinAllowedWindow(leaveEndDate)) {
        return NextResponse.json({
          error: "Selected dates are outside allowed backdate window",
          details: {
            message: canUsePreviousMonth
              ? "For Sick, Emergency, and Earned leaves, select dates from current month or previous month only."
              : "For Sick, Emergency, and Earned leaves, select dates from current month only."
          }
        }, { status: 400 });
      }
    } else if (leaveStartDate.isBefore(today)) {
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
    const isRequestHalfDay = isHalfDaySessionRange(sessionStartValue, sessionEndValue, requestStartDate, requestEndDate);

    // Query for leaves that are consecutive (one day before or after the requested dates)
    const consecutiveLeavesQuery = await conn.query<any>(`
      SELECT 
        Id, 
        Start_Date__c,
        End_Date__c,
        Status__c,
        Leave_Type__c,
        Leave_Category__c,
        Session_Start__c,
        Session_End__c
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
        const existingSessionStart = normalizeSessionValue(existingLeave.Session_Start__c);
        const existingSessionEnd = normalizeSessionValue(existingLeave.Session_End__c);
        const existingSession = getSessionDisplayLabel(existingSessionStart, existingSessionEnd);
        const isExistingHalfDay = isHalfDaySessionRange(existingSessionStart, existingSessionEnd, existingStart, existingEnd);
        const isSameLeaveType = (existingLeave.Leave_Type__c || '') === (leaveType || '');

        // Check if applying for the same date with same session (not allowed)
        if (requestStartDate.isSame(existingStart, 'day') && requestEndDate.isSame(existingEnd, 'day')) {
          // Same day - only allow if both are half-day and different sessions
          if (isRequestHalfDay && isExistingHalfDay && (sessionStartValue !== existingSessionStart || sessionEndValue !== existingSessionEnd)) {
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
        if (!isSameLeaveType) {
          continue;
        }

        if (!isRequestHalfDay && !isExistingHalfDay) {
          // Check if the new leave is exactly one day before or after an existing leave
          const isOneDayBefore = requestEndDate.add(1, 'day').isSame(existingStart, 'day');
          const isOneDayAfter = requestStartDate.subtract(1, 'day').isSame(existingEnd, 'day');

          if (isOneDayBefore || isOneDayAfter) {
            const combinedStart = isOneDayBefore ? requestStartDate : existingStart;
            const combinedEnd = isOneDayAfter ? requestEndDate : existingEnd;

            if (!confirmMergeWithExisting || mergeExistingLeaveId !== existingLeave.Id) {
              return NextResponse.json({
                requiresMerge: true,
                details: {
                  message: `We found an existing leave that will be merged with this request and re-submitted for approval.`,
                  existingLeaveId: existingLeave.Id,
                  existingLeave: {
                    startDate: existingLeave.Start_Date__c,
                    endDate: existingLeave.End_Date__c,
                    status: existingLeave.Status__c,
                    leaveCategory: existingLeave.Leave_Category__c,
                    session: existingSession,
                  },
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
              gapDates: [],
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
        const existingSessionStart = normalizeSessionValue(existingLeave.Session_Start__c);
        const existingSessionEnd = normalizeSessionValue(existingLeave.Session_End__c);
        const existingSession = getSessionDisplayLabel(existingSessionStart, existingSessionEnd);
        const isExistingHalfDay = isHalfDaySessionRange(existingSessionStart, existingSessionEnd, existingStart, existingEnd);
        const isSameLeaveType = (existingLeave.Leave_Type__c || '') === (leaveType || '');

        // Skip half-day leaves for sandwich check
        if (!isSameLeaveType) {
          continue;
        }

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

    // --- Shared Rule Calculation Setup ---
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
    const isHalfDay = isHalfDaySessionRange(sessionStartValue, sessionEndValue, start, end);
    const applyRules = leaveCategory === 'loss-of-pay' && leaveType === 'Planned Leave';

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
    const mergeInfoForRules: RuleCalculationDetails["mergeInfo"] | undefined = mergeContext
      ? {
          merged: true,
          existingLeaveId: mergeContext.existingLeaveId,
          previousStartDate: mergeContext.previousStartDate,
          previousEndDate: mergeContext.previousEndDate,
          newRequestStartDate: requestedStartDateStr,
          newRequestEndDate: requestedEndDateStr,
          mergedAt: new Date().toISOString(),
          mergedBy: email || employeeId || name,
          gapDates: mergeContext.gapDates,
        }
      : { merged: false };

    const recalculatedMetrics = createRuleCalculationDetails(
      start,
      end,
      role,
      leaveType,
      leaveCategory,
      sessionStartValue,
      sessionEndValue,
      leaveConfig,
      holidaySet,
      today,
      mergeInfoForRules
    );

    const rangeLeaveDays = recalculatedMetrics.totalDays;
    const finalTotalAfterRules = recalculatedMetrics.totalDaysAfterRule;
    const sandwichApplied = recalculatedMetrics.sandwichApplied;
    const anySandwichApplied = sandwichApplied;
    const onePlusTwoRuleApplied = recalculatedMetrics.onePlusTwoRuleApplied;

    const ruleCalculationDetails: RuleCalculationDetails = recalculatedMetrics.details;
    const sandwichExtra = ruleCalculationDetails.sameRequestSandwich?.totalDays || 0;
    const totalSandwichDays = ruleCalculationDetails.totalSandwichDays || 0;
    const onePlusTwoExtra = ruleCalculationDetails.onePlusTwoRule?.extraDays || 0;
    const totalSandwichDeduction = rangeLeaveDays + totalSandwichDays;
    const effectiveStartDate = ruleCalculationDetails.effectiveStartDate || finalStartDateStr;
    const effectiveEndDate = ruleCalculationDetails.effectiveEndDate || finalEndDateStr;
    const sameRequestSandwichDatesList = ruleCalculationDetails.sameRequestSandwich?.countedLeaveDates || [];

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
            sameRequestSandwichDatesList,
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

    // Prepare leave record based on category
    const saveStartDate = start.format('YYYY-MM-DD');
    const saveEndDate = end.format('YYYY-MM-DD');
    let requesterBaseSalary = 0;
    if (isAdminAutoApprove) {
      const requesterSalaryQuery = await conn.query<any>(`
        SELECT Id, Salary_CTC__c
        FROM Employee__c
        WHERE Id = '${employeeId}'
        LIMIT 1
      `);
      requesterBaseSalary = requesterSalaryQuery.records?.[0]?.Salary_CTC__c || 0;
    }

    const leaveRecord: any = {
      Employee__c: employeeId,
      Start_Date__c: saveStartDate,
      End_Date__c: saveEndDate,
      Total_Days__c: rangeLeaveDays,
      Total_Days_After_Rule__c: finalTotalAfterRules,
      Session_Start__c: sessionStartValue,
      Session_End__c: sessionEndValue,
      Status__c: isAdminAutoApprove ? 'Approved' : 'Applied',
      OnePlusTwo_Rule__c: onePlusTwoRuleApplied,
      Sandwich_Rule__c: anySandwichApplied,
      Rule_Calculation_Details__c: JSON.stringify(ruleCalculationDetails),
    };

    if (isAdminAutoApprove) {
      leaveRecord.HR_Approval__c = 'Approved';
      leaveRecord.TL_Approval__c = 'Approved';
      leaveRecord.Approved_Date__c = new Date().toISOString();
      leaveRecord.Actual_Deduction__c = calculateLeaveDeduction(
        leaveCategory === 'loss-of-pay' ? 'Loss of Pay' : 'Extra Day Pay',
        saveStartDate,
        rangeLeaveDays,
        requesterBaseSalary
      );
      leaveRecord.After_Rule_Deduction__c = calculateLeaveDeduction(
        leaveCategory === 'loss-of-pay' ? 'Loss of Pay' : 'Extra Day Pay',
        saveStartDate,
        finalTotalAfterRules,
        requesterBaseSalary
      );
    }

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
    let mergedExistingLeavePreviousStatus: string | null = null;
    let mergedExistingLeavePreviousEventId: string | null = null;
    let mergedExistingLeavePreviousTotals: { totalDays: number; totalDaysAfterRule: number } | null = null;

    if (mergeContext) {
      const existingMergeLeaveQuery = await conn.query<any>(`
        SELECT Id, Status__c, Event_ID__c, Total_Days__c, Total_Days_After_Rule__c
        FROM Leave__c
        WHERE Id = '${mergeContext.existingLeaveId}'
        LIMIT 1
      `);

      if (existingMergeLeaveQuery.records?.length > 0) {
        const existingMergeLeave = existingMergeLeaveQuery.records[0];
        mergedExistingLeavePreviousStatus = existingMergeLeave.Status__c || null;
        mergedExistingLeavePreviousEventId = existingMergeLeave.Event_ID__c || null;
        mergedExistingLeavePreviousTotals = {
          totalDays: existingMergeLeave.Total_Days__c || 0,
          totalDaysAfterRule: existingMergeLeave.Total_Days_After_Rule__c || 0,
        };
      }

      const updatePayload = {
        ...leaveRecord,
        Id: mergeContext.existingLeaveId,
        Status__c: isAdminAutoApprove ? 'Approved' : 'Applied',
        TL_Approval__c: isAdminAutoApprove ? 'Approved' : null,
        HR_Approval__c: isAdminAutoApprove ? 'Approved' : null,
        Approved_Date__c: isAdminAutoApprove ? new Date().toISOString() : null,
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

    const savedLeaveId = mergeContext ? mergeContext.existingLeaveId : result.id;

    if (isAdminAutoApprove) {
      if (mergedExistingLeave && mergedExistingLeavePreviousStatus === 'Approved' && mergedExistingLeavePreviousTotals) {
        await updateLeaveBalance(conn, {
          Employee__c: employeeId,
          Leave_Category__c: leaveRecord.Leave_Category__c,
          Leave_Type__c: leaveRecord.Leave_Type__c,
          Total_Days__c: mergedExistingLeavePreviousTotals.totalDays,
          Total_Days_After_Rule__c: mergedExistingLeavePreviousTotals.totalDaysAfterRule,
        }, 'revert');
      }

      await updateLeaveBalance(conn, leaveRecord, 'approve');

      if (mergedExistingLeavePreviousEventId) {
        await deleteLeaveCalendarEventForEmployee({
          employeeId,
          eventId: mergedExistingLeavePreviousEventId,
        });
      }

      const calendarRange = getCalendarEventRange(
        start,
        end,
        sessionStartValue,
        sessionEndValue
      );

      const createdEventId = calendarRange
        ? await createLeaveCalendarEventForEmployee({
            employeeId,
            leaveType: leaveRecord.Leave_Type__c || leaveRecord.Leave_Category__c || 'Leave',
            leaveCategory: leaveRecord.Leave_Category__c,
            startDate: calendarRange.startDate,
            endDate: calendarRange.endDate,
            reason: leaveRecord.Reason__c,
            approvedBy: 'Admin',
          })
        : null;

      await persistLeaveEventId(conn, savedLeaveId, createdEventId || null, 'admin-auto-approval');
    }

    // After Insert: Send email notification based on employee role/title
    try {
      const empData = await conn.query<any>(`
        SELECT Id, Employee_Name__c, Role__c, Title__c, Team_Lead__c, 
               Team_Lead__r.Employee_Name__c, Team_Lead__r.Company_Email__c
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

        if (isAdminAutoApprove) {
          await sendInAppNotifications(
            [employeeId],
            `Your leave request from ${start.format('DD MMM YYYY')} to ${end.format('DD MMM YYYY')} has been auto-approved by Admin.`,
            'Leave',
            false
          );
        }
        // Case 1: If employee is HR, send notification to Admin
        else if (employeeRole === 'HR') {
          // Find Admin employee
          const adminQuery = await conn.query<any>(`
            SELECT Id, Employee_Name__c, Company_Email__c
            FROM Employee__c
            WHERE Role__c = 'Admin'
            LIMIT 1
          `);

          if (adminQuery.records && adminQuery.records.length > 0) {
            const admin = adminQuery.records[0];
            const adminEmail = admin.Company_Email__c;
            const adminName = admin.Employee_Name__c;

            // Add admin to in-app notification recipients
            notificationRecipients.push(admin.Id);

            if (adminEmail) {
              const emailTemplate = await hrLeaveRequestToAdmin({
                recipientName: adminName,
                employeeName,
                leaveType: leaveType || 'N/A',
                startDate: start.format('YYYY-MM-DD'),
                endDate: end.format('YYYY-MM-DD'),
                duration: duration
              });
              logLeaveEmailDispatch('hr-leave-request-to-admin', adminEmail, undefined, emailTemplate.subject);
              sendEmailAsync({
                to: adminEmail,
                subject: emailTemplate.subject,
                body: emailTemplate.html,
                senderEmployeeId: employeeId,
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
            SELECT Id, Employee_Name__c, Company_Email__c
            FROM Employee__c
            WHERE Role__c = 'HR' AND Active__c = true
            LIMIT 1
          `);

          if (hrQuery.records && hrQuery.records.length > 0) {
            const hr = hrQuery.records[0];
            notificationRecipients.push(hr.Id);
          }

          const adminQuery = await conn.query<any>(`
            SELECT Company_Email__c
            FROM Employee__c
            WHERE Role__c = 'Admin'
            LIMIT 1
          `);
          const adminEmail = adminQuery.records?.[0]?.Company_Email__c;

          const emailTemplate = await teamLeadLeaveRequestToHRWithAdminCC({
            recipientName: 'HR Team',
            employeeName,
            leaveType: leaveType || 'N/A',
            startDate: start.format('YYYY-MM-DD'),
            endDate: end.format('YYYY-MM-DD'),
            duration: duration
          });
          logLeaveEmailDispatch('team-lead-leave-request-to-hr', hrEmail, adminEmail, emailTemplate.subject);
          sendEmailAsync({
            to: hrEmail,
            cc: adminEmail,
            subject: emailTemplate.subject,
            body: emailTemplate.html,
            senderEmployeeId: employeeId,
          });
          console.log("Email sent to HR for Team Lead leave:", hrEmail);
        }
        // Case 3: Regular employee - send to their Team Lead and HR
        else {
          const teamLeadEmail = emp.Team_Lead__r?.Company_Email__c;
          const teamLeadName = emp.Team_Lead__r?.Employee_Name__c;
          const teamLeadId = emp.Team_Lead__c;

          // Add TL to notification recipients
          if (teamLeadId) {
            notificationRecipients.push(teamLeadId);
          }

          // Add HR to notification recipients
          const hrQuery = await conn.query<any>(`
            SELECT Id, Employee_Name__c, Company_Email__c
            FROM Employee__c
            WHERE Role__c = 'HR' AND Active__c = true
            LIMIT 1
          `);

          if (hrQuery.records && hrQuery.records.length > 0) {
            const hr = hrQuery.records[0];
            notificationRecipients.push(hr.Id);
          }

          if (!leaveRecord.TL_Approval__c) {
            const adminQuery = await conn.query<any>(`
              SELECT Company_Email__c
              FROM Employee__c
              WHERE Role__c = 'Admin'
              LIMIT 1
            `);
            const adminEmail = adminQuery.records?.[0]?.Company_Email__c;

            const emailTemplate = await employeeLeaveRequestToHR({
              recipientName: 'HR Team',
              employeeName,
              leaveType: leaveType || 'N/A',
              startDate: start.format('YYYY-MM-DD'),
              endDate: end.format('YYYY-MM-DD'),
              duration: duration,
              reason: reason || 'N/A'
            });

            const ccRecipients = [teamLeadEmail, adminEmail].filter(Boolean) as string[];
            logLeaveEmailDispatch('employee-leave-request-to-hr', hrEmail, ccRecipients, emailTemplate.subject);
            sendEmailAsync({
              to: hrEmail,
              cc: ccRecipients,
              subject: emailTemplate.subject,
              body: emailTemplate.html,
              senderEmployeeId: employeeId,
            });
            console.log("Email sent to HR with CC Team Lead/Admin:", hrEmail);
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

    return NextResponse.json({
      success: true,
      message: isAdminAutoApprove
        ? (mergeContext ? "Leave merged and auto-approved successfully" : "Leave request auto-approved successfully")
        : (mergeContext ? "Leave merged and resubmitted for approval" : "Leave request submitted successfully"),
      leaveId: savedLeaveId,
      mergedExistingLeave,
      mergeStatus: mergedExistingLeave ? "merged" : "created",
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
    const hrEmail = await getHREmail();

    if (!leaveId || !action) {
      return NextResponse.json({ error: "Missing leaveId or action" }, { status: 400 });
    }

    const conn = await getSalesforceConnection();

    // Handle withdraw action
    // In the PATCH function, replace the "withdraw" action block and add new actions

    // Handle withdraw action - REQUEST withdrawal approval from HR
    if (action === "withdraw") {
      const { withdrawalStartDate, withdrawalEndDate } = body;

      // Verify the leave belongs to the current user
      const leaveRecordQuery = await conn.query<any>(`
        SELECT Id, Employee__c, Status__c, Leave_Category__c, Leave_Type__c, Total_Days__c, Total_Days_After_Rule__c, 
               Start_Date__c, End_Date__c, Session_Start__c, Session_End__c, Sandwich_Rule__c, Rule_Calculation_Details__c
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
      const isHalfDayLeave = isHalfDaySessionRange(leave.Session_Start__c, leave.Session_End__c, leaveStart, leaveEnd);
      const today = dayjs().startOf("day");

      if (today.isAfter(leaveEnd, "day")) {
        return NextResponse.json({ error: "Withdrawal is allowed only on or before the leave end date" }, { status: 400 });
      }

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
           SELECT Id, Name,, Company_Email__c, Employee_Name__c, Role__c, Title__c,
             Team_Lead__c, Team_Lead__r.Employee_Name__c, Team_Lead__r.Company_Email__c
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
              SELECT Id, Company_Email__c
              FROM Employee__c
              WHERE Role__c = 'HR' AND Active__c = true AND Title__c = 'Senior'
              LIMIT 1
            `);
            if (hrQuery.records && hrQuery.records.length > 0) {
              const hr = hrQuery.records[0];
              notificationRecipients.push(hr.Id);

              // Send email to HR
              if (hr.Company_Email__c) {
                const emailData = await withdrawalRequestToHR({
                  recipientName: 'HR Team',
                  employeeName: employeeName,
                  leaveType: leave.Leave_Type__c || leave.Leave_Category__c,
                  startDate: dayjs(leave.Start_Date__c).format('DD MMM YYYY'),
                  endDate: dayjs(leave.End_Date__c).format('DD MMM YYYY'),
                  duration: leave.Total_Days__c
                });
                sendEmailAsync({
                  to: hr.Company_Email__c,
                  subject: emailData.subject,
                  body: emailData.html,
                  senderEmployeeId: employeeId,
                });
              }
            }
          }

          // Send notification to Admin if employee is HR
          if (employeeRole === 'HR') {
            const adminQuery = await conn.query<any>(`
              SELECT Id, Company_Email__c
              FROM Employee__c
              WHERE Role__c = 'Admin'
              LIMIT 1
            `);
            if (adminQuery.records && adminQuery.records.length > 0) {
              const admin = adminQuery.records[0];
              notificationRecipients.push(admin.Id);

              // Send email to Admin
              if (admin.Company_Email__c) {
                const emailData = await withdrawalRequestToHR({
                  recipientName: 'Admin',
                  employeeName: employeeName,
                  leaveType: leave.Leave_Type__c || leave.Leave_Category__c,
                  startDate: dayjs(leave.Start_Date__c).format('DD MMM YYYY'),
                  endDate: dayjs(leave.End_Date__c).format('DD MMM YYYY'),
                  duration: leave.Total_Days__c
                });
                sendEmailAsync({
                  to: admin.Company_Email__c,
                  subject: emailData.subject,
                  body: emailData.html,
                  senderEmployeeId: employeeId,
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
          if (emp.Company_Email__c) {
            const emailData = await withdrawalRequestSubmitted({
              recipientName: employeeName,
              leaveType: leave.Leave_Type__c || leave.Leave_Category__c,
              startDate: dayjs(leave.Start_Date__c).format('DD MMM YYYY'),
              endDate: dayjs(leave.End_Date__c).format('DD MMM YYYY'),
              duration: leave.Total_Days__c
            });
            sendEmailAsync({
              to: emp.Company_Email__c,
              subject: emailData.subject,
              body: emailData.html,
              senderEmployeeId: employeeId,
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
           Start_Date__c, End_Date__c, Session_Start__c, Session_End__c, Reason__c, CreatedDate, Employee__r.Role__c,
           Sandwich_Rule__c, Rule_Calculation_Details__c, Event_ID__c
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
      const leavesToRecreateEvents: Array<{
        leaveId: string;
        startDate: string;
        endDate: string;
      }> = [];

      await deleteLeaveCalendarEventForEmployee({
        employeeId: leave.Employee__c,
        eventId: leave.Event_ID__c,
      });

      if (isFullWithdrawal) {
        await conn.sobject('Leave__c').update({
          Id: leaveId,
          Status__c: 'Withdrawn',
          Event_ID__c: null,
          Withdrawal_Result_Date__c: new Date().toISOString(),
          Rule_Calculation_Details__c: leave.Rule_Calculation_Details__c,
        });
      } else {
        const canonicalCategory = getCanonicalLeaveCategory(leave.Leave_Category__c || "");
        const sfLeaveCategory = canonicalCategory === "loss-of-pay" ? "Loss of Pay" : "Extra Day Pay";
        const isHalfDayLeave = isHalfDaySessionRange(leave.Session_Start__c, leave.Session_End__c, leaveStart, leaveEnd);

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
            leave.Session_Start__c,
            leave.Session_End__c,
            leaveConfig,
            holidaySet,
            createdReferenceDate
          );

          await conn.sobject('Leave__c').update({
            Id: leaveId,
            Status__c: 'Approved',
            Start_Date__c: retainedStart.format("YYYY-MM-DD"),
            End_Date__c: retainedEnd.format("YYYY-MM-DD"),
            Event_ID__c: null,
            Total_Days__c: recalculated.totalDays,
            Total_Days_After_Rule__c: recalculated.totalDaysAfterRule,
            OnePlusTwo_Rule__c: recalculated.onePlusTwoRuleApplied,
            Sandwich_Rule__c: recalculated.sandwichApplied,
            Rule_Calculation_Details__c: buildUpdatedRuleDetails(recalculated),
            Withdrawal_Result_Date__c: new Date().toISOString(),
          });

          leavesToRecreateEvents.push({
            leaveId,
            startDate: retainedStart.format("YYYY-MM-DD"),
            endDate: retainedEnd.format("YYYY-MM-DD"),
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
            leave.Session_Start__c,
            leave.Session_End__c,
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
            leave.Session_Start__c,
            leave.Session_End__c,
            leaveConfig,
            holidaySet,
            createdReferenceDate
          );

          await conn.sobject('Leave__c').update({
            Id: leaveId,
            Status__c: 'Approved',
            Start_Date__c: leftStart.format("YYYY-MM-DD"),
            End_Date__c: leftEnd.format("YYYY-MM-DD"),
            Event_ID__c: null,
            Total_Days__c: leftRecalculated.totalDays,
            Total_Days_After_Rule__c: leftRecalculated.totalDaysAfterRule,
            OnePlusTwo_Rule__c: leftRecalculated.onePlusTwoRuleApplied,
            Sandwich_Rule__c: leftRecalculated.sandwichApplied,
            Rule_Calculation_Details__c: buildUpdatedRuleDetails(leftRecalculated),
            Withdrawal_Result_Date__c: new Date().toISOString(),
          });

          leavesToRecreateEvents.push({
            leaveId,
            startDate: leftStart.format("YYYY-MM-DD"),
            endDate: leftEnd.format("YYYY-MM-DD"),
          });

          const rightLeaveCreateResult = await conn.sobject('Leave__c').create({
            Employee__c: leave.Employee__c,
            Leave_Type__c: leave.Leave_Type__c,
            Leave_Category__c: leave.Leave_Category__c,
            Start_Date__c: rightStart.format("YYYY-MM-DD"),
            End_Date__c: rightEnd.format("YYYY-MM-DD"),
            Session_Start__c: leave.Session_Start__c,
            Session_End__c: leave.Session_End__c,
            Reason__c: leave.Reason__c || '',
            Status__c: 'Approved',
            Total_Days__c: rightRecalculated.totalDays,
            Total_Days_After_Rule__c: rightRecalculated.totalDaysAfterRule,
            OnePlusTwo_Rule__c: rightRecalculated.onePlusTwoRuleApplied,
            Sandwich_Rule__c: rightRecalculated.sandwichApplied,
            Rule_Calculation_Details__c: buildUpdatedRuleDetails(rightRecalculated),
            HR_Approval__c: 'Approved',
            Approved_Date__c: new Date().toISOString(),
          }) as any;

          if (rightLeaveCreateResult?.success && rightLeaveCreateResult?.id) {
            leavesToRecreateEvents.push({
              leaveId: rightLeaveCreateResult.id,
              startDate: rightStart.format("YYYY-MM-DD"),
              endDate: rightEnd.format("YYYY-MM-DD"),
            });
          }

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

      if (leavesToRecreateEvents.length > 0) {
        for (const leaveSlice of leavesToRecreateEvents) {
          const calendarRange = getCalendarEventRange(
            dayjs(leaveSlice.startDate),
            dayjs(leaveSlice.endDate),
            leave.Session_Start__c,
            leave.Session_End__c
          );

          const recreatedEventId = calendarRange
            ? await createLeaveCalendarEventForEmployee({
                employeeId: leave.Employee__c,
                leaveType: leave.Leave_Type__c || leave.Leave_Category__c || 'Leave',
                leaveCategory: leave.Leave_Category__c,
                startDate: calendarRange.startDate,
                endDate: calendarRange.endDate,
                reason: leave.Reason__c,
                approvedBy: isAdmin ? 'Admin' : 'HR',
              })
            : null;

          console.log('📅 [Leave] withdrawal calendar recreation result:', {
            leaveId: leaveSlice.leaveId,
            employeeId: leave.Employee__c,
            recreatedEventId,
            startDate: leaveSlice.startDate,
            endDate: leaveSlice.endDate,
          });

          await persistLeaveEventId(conn, leaveSlice.leaveId, recreatedEventId || null, 'withdrawal-recreate');
        }
      }

      // Send notification emails
      try {
        const empData = await conn.query<any>(`
           SELECT Id, Name, Employee_Id__c, Company_Email__c, Employee_Name__c, Role__c, Title__c,
             Team_Lead__c, Team_Lead__r.Employee_Name__c, Team_Lead__r.Company_Email__c
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
          if (emp.Company_Email__c) {
            const approverTitle = isAdmin ? 'Admin' : 'HR';
            const emailLeaveType = getDisplayLeaveType(leave.Leave_Type__c, leave.Leave_Category__c || "");
            const emailData = await withdrawalApproved({
              recipientName: employeeName,
              leaveType: emailLeaveType,
              startDate: dayjs(leave.Start_Date__c).format('DD MMM YYYY'),
              endDate: dayjs(leave.End_Date__c).format('DD MMM YYYY'),
              duration: leave.Total_Days__c,
              approverTitle: approverTitle
            });
            sendEmailAsync({
              to: emp.Company_Email__c,
              subject: emailData.subject,
              body: emailData.html,
              senderEmployeeId: employeeId,
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

              if (emp.Team_Lead__r?.Company_Email__c) {
                const emailData = await withdrawalApproved({
                  recipientName: emp.Team_Lead__r.Employee_Name__c,
                  employeeName: employeeName,
                  leaveType: getDisplayLeaveType(leave.Leave_Type__c, leave.Leave_Category__c || ""),
                  startDate: dayjs(leave.Start_Date__c).format('DD MMM YYYY'),
                  endDate: dayjs(leave.End_Date__c).format('DD MMM YYYY'),
                  duration: leave.Total_Days__c,
                  approverTitle: 'HR'
                });
                sendEmailAsync({
                  to: emp.Team_Lead__r.Company_Email__c,
                  subject: `Withdrawal Approved: ${employeeName} - Leave from ${dayjs(leave.Start_Date__c).format('DD MMM YYYY')} to ${dayjs(leave.End_Date__c).format('DD MMM YYYY')}`,
                  body: emailData.html,
                  senderEmployeeId: employeeId,
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
          SELECT Id, Name, Employee_Id__c, Company_Email__c, Employee_Name__c, Role__c, Title__c,
                 Team_Lead__c, Team_Lead__r.Employee_Name__c
          FROM Employee__c
          WHERE Id = '${leave.Employee__c}'
          LIMIT 1
        `);

        if (empData.records && empData.records.length > 0) {
          const emp = empData.records[0];
          const employeeName = emp.Employee_Name__c || emp.Name || 'Employee';

          // Send email to employee
          if (emp.Company_Email__c) {
            const approverTitle = isAdmin ? 'Admin' : 'HR';
            const emailData = await withdrawalRejected({
              recipientName: employeeName,
              leaveType: leave.Leave_Type__c || leave.Leave_Category__c,
              startDate: dayjs(leave.Start_Date__c).format('DD MMM YYYY'),
              endDate: dayjs(leave.End_Date__c).format('DD MMM YYYY'),
              duration: leave.Total_Days__c,
              approverTitle: approverTitle,
              reason: reason || 'No reason provided'
            });
            sendEmailAsync({
              to: emp.Company_Email__c,
              subject: emailData.subject,
              body: emailData.html,
              senderEmployeeId: employeeId,
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

    // Handle mark doubtful case action (HR or Admin)
    if (action === "mark_doubtful_case") {
      const { role } = payload;
      const isHR = role === 'HR';
      const isAdmin = role === 'Admin';

      if (!isHR && !isAdmin) {
        return NextResponse.json({ error: "Only HR or Admin can mark doubtful cases" }, { status: 403 });
      }

      const updateResult = await conn.sobject('Leave__c').update({
        Id: leaveId,
        Doubtfull_Case__c: true,
      });

      const resultList = Array.isArray(updateResult) ? updateResult : [updateResult];
      const firstResult = resultList[0];

      if (!firstResult?.success) {
        const firstError = firstResult?.errors?.[0];
        if (firstError?.statusCode === 'NOT_FOUND') {
          return NextResponse.json({ error: "Leave not found" }, { status: 404 });
        }

        return NextResponse.json({
          error: firstError?.message || "Failed to mark leave as doubtful case",
        }, { status: 400 });
      }

      try {
        const leaveDataQuery = await conn.query<any>(`
          SELECT Id, Employee__c, Employee__r.Employee_Name__c, Leave_Type__c, Leave_Category__c,
                 Start_Date__c, End_Date__c, Total_Days__c, Reason__c
          FROM Leave__c
          WHERE Id = '${leaveId}'
          LIMIT 1
        `);

        const leaveRecord = leaveDataQuery.records?.[0];

        if (leaveRecord) {
          const adminQuery = await conn.query<any>(`
            SELECT Id, Employee_Name__c, Company_Email__c
            FROM Employee__c
            WHERE Role__c = 'Admin' AND Active__c = true
          `);

          const admins = adminQuery.records || [];
          const adminIds = admins.map((admin: any) => admin.Id).filter(Boolean);

          if (adminIds.length > 0) {
            const leaveTypeDisplay = getDisplayLeaveType(leaveRecord.Leave_Type__c, leaveRecord.Leave_Category__c || '');
            const employeeName = leaveRecord.Employee__r?.Employee_Name__c || 'Employee';
            const markedBy = payload?.name || payload?.email || (isAdmin ? 'Admin Team' : 'HR Team');

            await sendInAppNotifications(
              adminIds,
              `${markedBy} has marked ${employeeName}'s leave (${leaveTypeDisplay}) from ${dayjs(leaveRecord.Start_Date__c).format('DD MMM YYYY')} to ${dayjs(leaveRecord.End_Date__c).format('DD MMM YYYY')} as doubtful. Please review.`,
              'Leave',
              true
            );

            for (const admin of admins) {
              if (!admin.Company_Email__c) continue;

              const emailTemplate = await doubtfulLeaveMarkedToAdmin({
                recipientName: admin.Employee_Name__c || 'Admin',
                employeeName,
                leaveType: leaveTypeDisplay,
                startDate: dayjs(leaveRecord.Start_Date__c).format('YYYY-MM-DD'),
                endDate: dayjs(leaveRecord.End_Date__c).format('YYYY-MM-DD'),
                duration: leaveRecord.Total_Days__c || 0,
                reason: leaveRecord.Reason__c || undefined,
                approverName: markedBy,
                approverTitle: isAdmin ? 'Admin' : 'HR',
              });

              logLeaveEmailDispatch('doubtful-leave-to-admin', admin.Company_Email__c, undefined, emailTemplate.subject);
              sendEmailAsync({
                to: admin.Company_Email__c,
                subject: emailTemplate.subject,
                body: emailTemplate.html,
                senderEmployeeId: employeeId,
              });
            }
          }
        }
      } catch (notificationError) {
        console.error('Error sending doubtful-case notifications to admins:', notificationError);
      }

      return NextResponse.json({
        success: true,
        message: "Leave marked as doubtful case",
      });
    }

    // Handle approve action (HR, Team Lead, or Admin)
    if (action === "approve") {
      const { role, title, name: approverName } = payload;
      const applyLeaveRules = body?.applyLeaveRules === true;
      const applySandwichRule =
        typeof body?.applySandwichRule === 'boolean'
          ? body.applySandwichRule
          : applyLeaveRules;
      const applyOnePlusTwoRule =
        typeof body?.applyOnePlusTwoRule === 'boolean'
          ? body.applyOnePlusTwoRule
          : applyLeaveRules;

      // Check if user can approve leaves
      const isHR = role === 'HR';
      const isTeamLead = role === 'Developer' && title === 'Team Lead';
      const isAdmin = role === 'Admin';

      console.log("Approval attempt by:", role, title, "isHR:", isHR, "isTeamLead:", isTeamLead, "isAdmin:", isAdmin);

      if (!isHR && !isTeamLead && !isAdmin) {
        return NextResponse.json({ error: "Only HR, Team Lead, or Admin can approve leaves" }, { status: 403 });
      }

      const leaveRecordQuery = await conn.query<any>(`
        SELECT Id, Status__c, Employee__c, Employee__r.Role__c,Employee__r.Salary_CTC__c, Leave_Category__c, Leave_Type__c, Total_Days__c, Total_Days_After_Rule__c, HR_Approval__c, TL_Approval__c, Start_Date__c, End_Date__c, Session_Start__c, Session_End__c, CreatedDate, Rule_Calculation_Details__c, Actual_Deduction__c, After_Rule_Deduction__c, Event_ID__c
        FROM Leave__c
        WHERE Id = '${leaveId}'
        LIMIT 1
      `);

      if (leaveRecordQuery.records.length === 0) {
        return NextResponse.json({ error: "Leave not found" }, { status: 404 });
      }

      const oldLeave = leaveRecordQuery.records[0];
      const employeeRole = oldLeave.Employee__r?.Role__c;

      // Update approval based on role
      const updateData: any = {
        Id: leaveId,
      };

      if (isHR || isAdmin) {
        const leaveConfig = await fetchLeaveConfigurations(conn);
        const holidaySet = await getHolidaySet(conn);
        const recalculated = createRuleCalculationDetails(
          dayjs(oldLeave.Start_Date__c).startOf("day"),
          dayjs(oldLeave.End_Date__c).startOf("day"),
          employeeRole,
          oldLeave.Leave_Type__c,
          oldLeave.Leave_Category__c,
          oldLeave.Session_Start__c,
          oldLeave.Session_End__c,
          leaveConfig,
          holidaySet,
          dayjs(oldLeave.CreatedDate || new Date().toISOString()).startOf("day"),
          undefined,
          {
            applySandwichRule,
            applyOnePlusTwoRule,
          }
        );

        updateData.HR_Approval__c = 'Approved';
        updateData.Approved_Date__c = new Date().toISOString();
        // beforeUpdate: Sync Status__c with HR_Approval__c
        updateData.Status__c = 'Approved';
        updateData.Total_Days__c = recalculated.totalDays;
        updateData.Total_Days_After_Rule__c = recalculated.totalDaysAfterRule;
        updateData.OnePlusTwo_Rule__c = recalculated.onePlusTwoRuleApplied;
        updateData.Sandwich_Rule__c = recalculated.sandwichApplied;
        updateData.Rule_Calculation_Details__c = JSON.stringify(recalculated.details);
        updateData.Actual_Deduction__c = calculateLeaveDeduction(
          oldLeave.Leave_Category__c,
          oldLeave.Start_Date__c,
          recalculated.totalDays,
          oldLeave.Employee__r?.Salary_CTC__c
        );
        updateData.After_Rule_Deduction__c = calculateLeaveDeduction(
          oldLeave.Leave_Category__c,
          oldLeave.Start_Date__c,
          recalculated.totalDaysAfterRule,
          oldLeave.Employee__r?.Salary_CTC__c
        );

      } else if (isTeamLead) {
        updateData.TL_Approval__c = 'Approved';
      }

      await conn.sobject('Leave__c').update(updateData);

      // afterUpdate: Send email notifications based on approval type
      try {
        const empData = await conn.query<any>(`
          SELECT Id, Employee_Name__c, Company_Email__c, Role__c, Title__c, Team_Lead__r.Employee_Name__c, Team_Lead__r.Company_Email__c
          FROM Employee__c
          WHERE Id = '${oldLeave.Employee__c}'
          LIMIT 1
        `);

        if (empData.records && empData.records.length > 0) {
          const emp = empData.records[0];
          const employeeEmail = emp.Company_Email__c;
          const employeeName = emp.Employee_Name__c;
          const employeeRole = emp.Role__c;
          const employeeTitle = emp.Title__c;
          const teamLeadName = emp.Team_Lead__r?.Employee_Name__c;
          const teamLeadEmail = emp.Team_Lead__r?.Company_Email__c;

          const adminQuery = await conn.query<any>(`
            SELECT Company_Email__c
            FROM Employee__c
            WHERE Role__c = 'Admin'
            LIMIT 1
          `);
          const adminEmail = adminQuery.records?.[0]?.Company_Email__c;

          if (isTeamLead && !oldLeave.TL_Approval__c) {
            // Send in-app notification to employee
            await sendInAppNotifications(
              [oldLeave.Employee__c],
              `Your leave request from ${dayjs(oldLeave.Start_Date__c).format('DD MMM YYYY')} to ${dayjs(oldLeave.End_Date__c).format('DD MMM YYYY')} has been approved by your Team Lead. Awaiting HR approval.`,
              'Leave',
              false
            );

            // TL decision email to HR with CC Employee and Admin
            const emailTemplateHR = await teamLeadDecisionToHR({
              recipientName: 'HR Team',
              employeeName,
              teamLeadName,
              decisionStatus: 'Approved',
              leaveType: oldLeave.Leave_Type__c || 'N/A',
              startDate: oldLeave.Start_Date__c || 'N/A',
              endDate: oldLeave.End_Date__c || 'N/A',
              duration: oldLeave.Total_Days__c || 0
            });
            const ccRecipients = [employeeEmail, adminEmail].filter(Boolean) as string[];
            logLeaveEmailDispatch('team-lead-decision-to-hr-approved', hrEmail, ccRecipients, emailTemplateHR.subject);
            sendEmailAsync({
              to: hrEmail,
              cc: ccRecipients,
              subject: emailTemplateHR.subject,
              body: emailTemplateHR.html,
              senderEmployeeId: employeeId,
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
            const approverTitle = isAdmin ? 'Admin' : 'HR';

            const calendarRange = getCalendarEventRange(
              dayjs(oldLeave.Start_Date__c),
              dayjs(oldLeave.End_Date__c),
              oldLeave.Session_Start__c,
              oldLeave.Session_End__c
            );

            const createdEventId = calendarRange
              ? await createLeaveCalendarEventForEmployee({
                  employeeId: oldLeave.Employee__c,
                  employeeName,
                  leaveType: oldLeave.Leave_Type__c || oldLeave.Leave_Category__c || 'Leave',
                  leaveCategory: oldLeave.Leave_Category__c,
                  startDate: calendarRange.startDate,
                  endDate: calendarRange.endDate,
                  approvedBy: approverTitle,
                })
              : null;

            console.log('📅 [Leave] final approval calendar creation result:', {
              leaveId: oldLeave.Id,
              employeeId: oldLeave.Employee__c,
              createdEventId,
            });

            await persistLeaveEventId(conn, oldLeave.Id, createdEventId || null, 'final-approval');

            if (employeeEmail) {
              if (isAdmin && employeeRole === 'HR') {
                const emailTemplate = await adminDecisionToHR({
                  recipientName: employeeName,
                  decisionStatus: 'Approved',
                  leaveType: oldLeave.Leave_Type__c || 'N/A',
                  startDate: oldLeave.Start_Date__c || 'N/A',
                  endDate: oldLeave.End_Date__c || 'N/A',
                  duration: oldLeave.Total_Days__c || 0
                });
                logLeaveEmailDispatch('admin-decision-to-hr-approved', employeeEmail, undefined, emailTemplate.subject);
                sendEmailAsync({
                  to: employeeEmail,
                  subject: emailTemplate.subject,
                  body: emailTemplate.html,
                  senderEmployeeId: employeeId,
                });
              } else if (isHR && employeeRole === 'Developer' && employeeTitle === 'Team Lead') {
                const emailTemplate = await hrDecisionToTeamLead({
                  recipientName: employeeName,
                  decisionStatus: 'Approved',
                  leaveType: oldLeave.Leave_Type__c || 'N/A',
                  startDate: oldLeave.Start_Date__c || 'N/A',
                  endDate: oldLeave.End_Date__c || 'N/A',
                  duration: oldLeave.Total_Days__c || 0
                });
                logLeaveEmailDispatch('hr-decision-to-team-lead-approved', employeeEmail, adminEmail, emailTemplate.subject);
                sendEmailAsync({
                  to: employeeEmail,
                  cc: adminEmail,
                  subject: emailTemplate.subject,
                  body: emailTemplate.html,
                  senderEmployeeId: employeeId,
                });
              } else {
                const emailTemplate = await hrDecisionToEmployee({
                  recipientName: employeeName,
                  decisionStatus: 'Approved',
                  leaveType: oldLeave.Leave_Type__c || 'N/A',
                  startDate: oldLeave.Start_Date__c || 'N/A',
                  endDate: oldLeave.End_Date__c || 'N/A',
                  duration: oldLeave.Total_Days__c || 0
                });
                const ccRecipients = [teamLeadEmail, adminEmail].filter(Boolean) as string[];
                logLeaveEmailDispatch('hr-decision-to-employee-approved', employeeEmail, ccRecipients, emailTemplate.subject);
                sendEmailAsync({
                  to: employeeEmail,
                  cc: ccRecipients,
                  subject: emailTemplate.subject,
                  body: emailTemplate.html,
                  senderEmployeeId: employeeId,
                });
              }
            }

            // Send in-app notification to employee
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
            await updateLeaveBalance(conn, {
              ...oldLeave,
              Total_Days__c: updateData.Total_Days__c ?? oldLeave.Total_Days__c,
              Total_Days_After_Rule__c: updateData.Total_Days_After_Rule__c ?? oldLeave.Total_Days_After_Rule__c,
            }, 'approve');
          }
        }
      } catch (emailError) {
        console.error('Error sending approval notification:', emailError);
      }

      return NextResponse.json({
        success: true,
        message: "Leave approved successfully",
        ruleSettings: {
          applyLeaveRules: isHR || isAdmin ? (applySandwichRule || applyOnePlusTwoRule) : null,
          applySandwichRule: isHR || isAdmin ? applySandwichRule : null,
          applyOnePlusTwoRule: isHR || isAdmin ? applyOnePlusTwoRule : null,
        },
      });
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

      // Update rejection based on role
      const updateData: any = {
        Id: leaveId,
      };

      if (isHR || isAdmin) {
        updateData.HR_Approval__c = 'Rejected';
        updateData.Status__c = 'Rejected';
        updateData.Cancellation_Reason_HR__c = reason || '';
      } else if (isTeamLead) {
        updateData.TL_Approval__c = 'Rejected';
        updateData.Cancellation_Reason_TL__c = reason || '';
      }

      await conn.sobject('Leave__c').update(updateData);

      // afterUpdate: Send email notifications
      try {
        const empData = await conn.query<any>(`
          SELECT Id, Employee_Name__c, Company_Email__c, Role__c, Title__c, Team_Lead__r.Company_Email__c
          FROM Employee__c
          WHERE Id = '${oldLeave.Employee__c}'
          LIMIT 1
        `);

        if (empData.records && empData.records.length > 0) {
          const emp = empData.records[0];
          const employeeEmail = emp.Company_Email__c;
          const employeeName = emp.Employee_Name__c;
          const employeeRole = emp.Role__c;
          const employeeTitle = emp.Title__c;
          const teamLeadEmail = emp.Team_Lead__r?.Company_Email__c;

          const adminQuery = await conn.query<any>(`
            SELECT Company_Email__c
            FROM Employee__c
            WHERE Role__c = 'Admin'
            LIMIT 1
          `);
          const adminEmail = adminQuery.records?.[0]?.Company_Email__c;

          if (isTeamLead && !oldLeave.TL_Approval__c) {
            // TL just rejected
            const emailTemplate = await teamLeadDecisionToHR({
                recipientName: 'HR Team',
                employeeName,
              teamLeadName: 'Team Lead',
                decisionStatus: 'Rejected',
                leaveType: oldLeave.Leave_Type__c || 'N/A',
                startDate: oldLeave.Start_Date__c || 'N/A',
                endDate: oldLeave.End_Date__c || 'N/A',
                duration: oldLeave.Total_Days__c || 0,
                reason
              });
            const ccRecipients = [employeeEmail, adminEmail].filter(Boolean) as string[];
            logLeaveEmailDispatch('team-lead-decision-to-hr-rejected', hrEmail, ccRecipients, emailTemplate.subject);
            sendEmailAsync({
              to: hrEmail,
              cc: ccRecipients,
              subject: emailTemplate.subject,
              body: emailTemplate.html,
              senderEmployeeId: employeeId,
            });

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
              if (isAdmin && employeeRole === 'HR') {
                const emailTemplate = await adminDecisionToHR({
                  recipientName: employeeName,
                  decisionStatus: 'Rejected',
                  leaveType: oldLeave.Leave_Type__c || 'N/A',
                  startDate: oldLeave.Start_Date__c || 'N/A',
                  endDate: oldLeave.End_Date__c || 'N/A',
                  duration: oldLeave.Total_Days__c || 0,
                  reason
                });
                logLeaveEmailDispatch('admin-decision-to-hr-rejected', employeeEmail, undefined, emailTemplate.subject);
                sendEmailAsync({
                  to: employeeEmail,
                  subject: emailTemplate.subject,
                  body: emailTemplate.html,
                  senderEmployeeId: employeeId,
                });
              } else if (isHR && employeeRole === 'Developer' && employeeTitle === 'Team Lead') {
                const emailTemplate = await hrDecisionToTeamLead({
                  recipientName: employeeName,
                  decisionStatus: 'Rejected',
                  leaveType: oldLeave.Leave_Type__c || 'N/A',
                  startDate: oldLeave.Start_Date__c || 'N/A',
                  endDate: oldLeave.End_Date__c || 'N/A',
                  duration: oldLeave.Total_Days__c || 0,
                  reason
                });
                logLeaveEmailDispatch('hr-decision-to-team-lead-rejected', employeeEmail, adminEmail, emailTemplate.subject);
                sendEmailAsync({
                  to: employeeEmail,
                  cc: adminEmail,
                  subject: emailTemplate.subject,
                  body: emailTemplate.html,
                  senderEmployeeId: employeeId,
                });
              } else {
                const emailTemplate = await hrDecisionToEmployee({
                  recipientName: employeeName,
                  decisionStatus: 'Rejected',
                  leaveType: oldLeave.Leave_Type__c || 'N/A',
                  startDate: oldLeave.Start_Date__c || 'N/A',
                  endDate: oldLeave.End_Date__c || 'N/A',
                  duration: oldLeave.Total_Days__c || 0,
                  reason
                });
                const ccRecipients = [teamLeadEmail, adminEmail].filter(Boolean) as string[];
                logLeaveEmailDispatch('hr-decision-to-employee-rejected', employeeEmail, ccRecipients, emailTemplate.subject);
                sendEmailAsync({
                  to: employeeEmail,
                  cc: ccRecipients,
                  subject: emailTemplate.subject,
                  body: emailTemplate.html,
                  senderEmployeeId: employeeId,
                });
              }
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

async function persistLeaveEventId(
  conn: any,
  leaveId: string,
  eventId: string | null,
  context: string
): Promise<boolean> {
  try {
    console.log('📅 [Leave] Persisting Event_ID__c...', {
      context,
      leaveId,
      eventId,
    });

    const updateResult = await conn.sobject('Leave__c').update({
      Id: leaveId,
      Event_ID__c: eventId,
    });

    const resultList = Array.isArray(updateResult) ? updateResult : [updateResult];
    const hasFailure = resultList.some((item: any) => item?.success !== true);

    if (hasFailure) {
      console.error('❌ [Leave] Failed to persist Event_ID__c', {
        context,
        leaveId,
        eventId,
        updateResult: resultList,
      });
      return false;
    }

    console.log('✅ [Leave] Event_ID__c persisted', {
      context,
      leaveId,
      eventId,
    });
    return true;
  } catch (error) {
    console.error('❌ [Leave] Exception while persisting Event_ID__c', {
      context,
      leaveId,
      eventId,
      error,
    });
    return false;
  }
}
/**
 * Calculate leave deduction based on leave category, days, and base salary
 */
function calculateLeaveDeduction(
  Leave_Category__c: string,
  Start_Date__c: string,
  Total_Days__c: number,
  Salary_CTC__c: number
): number {
  // If no salary is provided, return 0
  if (!Salary_CTC__c || Salary_CTC__c <= 0) {
    return 0;
  }

  // Get the month from start date and calculate days in that month
  const startDate = dayjs(Start_Date__c);
  const daysInMonth = startDate.daysInMonth();

  // Calculate daily salary based on actual days in the month
  const dailySalary = Salary_CTC__c / daysInMonth;
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
