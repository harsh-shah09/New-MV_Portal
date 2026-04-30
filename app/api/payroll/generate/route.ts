import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifyToken } from "@/lib/auth-utils"
import { getSalesforceConnection } from "@/lib/salesforce"
import { calculateLeaveDays, type LeaveDateInput } from "@/lib/leave-policy"
import dayjs from "dayjs"

/**
 * Leave Configuration Interface
 */
interface LeaveConfig {
  annualLeaveBalance: number
  OnePlusTwoRule: boolean
  SandwichRule: boolean
  sandwichRuleAppliesTo: string[]
  penaltyAppliesTo: string[]
  minWorkingDayNoticePeriod: number
  penaltyDaysPerDay: number
}

/**
 * Payroll Configuration Interface
 */
/**
 * Fetch Leave Configurations from Salesforce Custom Metadata
 */
async function fetchLeaveConfigurations(conn: any): Promise<LeaveConfig> {
  try {
    const configQuery = await conn.query(
      "SELECT DeveloperName, Value__c FROM Leave_Configurations__mdt"
    )

    const configs = configQuery.records || []
    const configMap = new Map<string, string>()

    configs.forEach((config: any) => {
      configMap.set(config.DeveloperName, config.Value__c)
    })

    // Parse configurations with defaults
    const annualLeaveBalance = parseFloat(configMap.get('Annual_Leave_Balance') || '18')
    const OnePlusTwoRule = configMap.get('One_plus_two_rule')?.toLowerCase() === 'true'
    const SandwichRule = configMap.get('Sandwich_Rule')?.toLowerCase() === 'true'
    const sandwichRuleAppliesTo = (configMap.get('Sandwich_Rule_Applies_to') || '')
      .split(',').map(role => role.trim()).filter(Boolean)
    const penaltyAppliesTo = (configMap.get('One_Two_Applies_to') || '')
      .split(',').map(role => role.trim()).filter(Boolean)
    const minWorkingDayNoticePeriod = parseInt(configMap.get('minimum_working_working_day_notice_perio') || '5')
    const penaltyDaysPerDay = parseFloat(configMap.get('penalty_days_per_day') || '2')

    return {
      annualLeaveBalance,
      OnePlusTwoRule,
      SandwichRule,
      sandwichRuleAppliesTo,
      penaltyAppliesTo,
      minWorkingDayNoticePeriod,
      penaltyDaysPerDay,
    }
  } catch (error) {
    console.error('Error fetching leave configurations:', error)
    return {
      annualLeaveBalance: 18,
      OnePlusTwoRule: true,
      SandwichRule: true,
      sandwichRuleAppliesTo: ['Developer'],
      penaltyAppliesTo: ['Developer'],
      minWorkingDayNoticePeriod: 5,
      penaltyDaysPerDay: 2,
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get session from cookies
    const cookieStore = await cookies()
    const session = cookieStore.get("session")?.value

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify the session token
    const payload = await verifyToken(session)

    if (!payload) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 })
    }

    const { role } = payload

    // Only HR and Admin can generate payroll
    if (role !== "HR" && role !== "Admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Get month and year from request body
    const { month, year } = await request.json()

    if (!month || !year) {
      return NextResponse.json({ error: "Month and year are required" }, { status: 400 })
    }

    const monthIndex = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ].indexOf(month)

    if (monthIndex < 0) {
      return NextResponse.json({ error: "Invalid month" }, { status: 400 })
    }

    const parsedYear = Number(year)
    if (!Number.isFinite(parsedYear)) {
      return NextResponse.json({ error: "Invalid year" }, { status: 400 })
    }

    const selectedPeriod = new Date(parsedYear, monthIndex, 1)
    const currentDate = new Date()
    const currentPeriod = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)

    if (selectedPeriod > currentPeriod) {
      return NextResponse.json(
        { error: "Payroll cannot be generated for a future month" },
        { status: 400 }
      )
    }

    console.log('\n==========================================')
    console.log('🚀 PAYROLL GENERATION STARTED')
    console.log('==========================================')
    console.log(`📅 Period: ${month} ${year}`)
    console.log(`👤 Requested by: ${payload.email} (${role})`)
    console.log('------------------------------------------\n')

    const conn = await getSalesforceConnection()

    const existingSummaryQuery = await conn.query<any>(`
      SELECT Id, Name, Status__c
      FROM Payroll_Summary__c
      WHERE Payroll_Month__c = '${month}'
      AND Payroll_Year__c = ${parsedYear}
      LIMIT 1
    `)

    if ((existingSummaryQuery.records || []).length > 0) {
      return NextResponse.json(
        {
          error: `Payroll already exists for ${month} ${parsedYear}`,
          payrollSummaryId: existingSummaryQuery.records[0].Id,
          status: existingSummaryQuery.records[0].Status__c || "Draft",
        },
        { status: 409 }
      )
    }

    // Fetch leave configurations
    const leaveConfig = await fetchLeaveConfigurations(conn)
    
    console.log('⚙️  LEAVE CONFIGURATIONS:')
    console.log('  • Sandwich Rule Enabled:', leaveConfig.SandwichRule)
    console.log('  • Sandwich Applies To:', leaveConfig.sandwichRuleAppliesTo.join(', '))
    console.log('  • 1+2 Rule Enabled:', leaveConfig.OnePlusTwoRule)
    console.log('  • 1+2 Applies To:', leaveConfig.penaltyAppliesTo.join(', '))
    console.log('  • Min Notice Period:', leaveConfig.minWorkingDayNoticePeriod, 'working days')
    console.log('  • Penalty Per Day:', leaveConfig.penaltyDaysPerDay, 'days')
    console.log('------------------------------------------\n')

    // Get all active employees with their salary details
    const employeeRecords = await conn.query<any>(`
      SELECT 
        Id,
        Name,
        Employee_Id__c,
        Employee_Name__c,
        Employee_Email__c,
        Salary_CTC__c,
        Basic_Console__c,
        HRA__c,
        CONV__c,
        S_All__c,
        PF_Basic__c,
        PF__c,
        PT__c,
        ESI__c,
        PF_Number__c,
        ESI_Number__c,
        UAN_Number__c,
        Joining_Date__c,
        Department__c,
        Role__c,
        Status__c,
        Active__c
      FROM Employee__c
      WHERE Active__c = true
      ORDER BY Employee_Name__c
    `)

    console.log('📊 DATA FETCHING:')
    console.log(`  ✓ Fetched ${employeeRecords.totalSize} active employees`)

    const employeeIds = (employeeRecords.records || []).map((employee: any) => employee.Id).filter(Boolean)
    const bankByEmployeeId = new Map<string, { bankName: string; accountNumber: string }>()

    if (employeeIds.length > 0) {
      const escapedEmployeeIds = employeeIds.map((id: string) => `'${String(id).replace(/'/g, "\\'")}'`).join(',')
      const bankRecords = await conn.query<any>(`
        SELECT Employee__c, Name, Bank_Account_Number__c, Primary_Account__c
        FROM Bank_Detail__c
        WHERE Employee__c IN (${escapedEmployeeIds})
        ORDER BY Primary_Account__c DESC, CreatedDate DESC
      `)

      for (const bank of bankRecords.records || []) {
        const employeeId = bank.Employee__c
        if (!employeeId || bankByEmployeeId.has(employeeId)) {
          continue
        }

        bankByEmployeeId.set(employeeId, {
          bankName: bank.Name || '',
          accountNumber: bank.Bank_Account_Number__c || '',
        })
      }
    }

    // Calculate the date range for the selected month
    const startDate = new Date(parsedYear, monthIndex, 1)
    const endDate = new Date(parsedYear, monthIndex + 1, 0)

    // Format dates as YYYY-MM-DD without timezone conversion
    const formatDate = (date: Date) => {
      const y = date.getFullYear()
      const m = String(date.getMonth() + 1).padStart(2, '0')
      const d = String(date.getDate()).padStart(2, '0')
      return `${y}-${m}-${d}`
    }

    const round2 = (value: number) => Math.round((Number(value) || 0) * 100) / 100
    const toNumber = (value: any) => Number.isFinite(Number(value)) ? Number(value) : 0

    const startDateStr = formatDate(startDate)
    const endDateStr = formatDate(endDate)

    console.log(`  📆 Date Range: ${startDateStr} to ${endDateStr}`)
    console.log(`  📆 End Date Details: Month=${monthIndex}, Year=${year}, Last Day=${endDate.getDate()}`)

    // Get all leaves for the selected month for all employees
    // Also fetch holidays and employee roles for rule calculations
    const leaveQuery = `
        SELECT 
          Id,
          Employee__c,
          Employee__r.Employee_Name__c,
          Employee__r.Role__c,
          Leave_Type__c,
          Leave_Category__c,
          Start_Date__c,
          End_Date__c,
          Session_Start__c,
          Session_End__c,
          Status__c,
          Sandwich_Rule__c,
          OnePlusTwo_Rule__c,
          CreatedDate
        FROM Leave__c
        WHERE 
          Start_Date__c <= ${endDateStr}
          AND End_Date__c >= ${startDateStr}
          AND Status__c IN ('Approved')
        ORDER BY Employee__c, Start_Date__c
      `
    
    console.log('📋 LEAVE QUERY:')
    console.log(leaveQuery)
    console.log('------------------------------------------\n')
    
    const [leaveRecords, holidayRecords] = await Promise.all([
      conn.query<any>(leaveQuery),
      conn.query<any>(`
        SELECT Date__c, Day__c 
        FROM Holidays_List__c
      `)
    ])

    console.log('Leave Records : ', leaveRecords);
    console.log('Holiday Records : ', holidayRecords);

    console.log(`Fetched ${leaveRecords.totalSize} leaves for the selected month`)

    // Helper: Check if date is weekend
    const isWeekend = (d: dayjs.Dayjs): boolean => {
      const day = d.day()
      return day === 0 || day === 6 // Sunday or Saturday
    }

    // Helper: Create holiday set
    const holidayDates = (holidayRecords.records || [])
      .map((h: any) => h?.Date__c)
      .filter(Boolean)
      .map((d: string) => dayjs(d).format("YYYY-MM-DD"))
    const holidaySet = new Set(holidayDates)

    // Helper: Check if date is holiday
    const isHoliday = (d: dayjs.Dayjs): boolean => {
      return holidaySet.has(d.format("YYYY-MM-DD"))
    }

    // Helper: Check if date is non-working day
    const isNonWorking = (d: dayjs.Dayjs): boolean => {
      return isWeekend(d) || isHoliday(d)
    }

    // Helper function to calculate deduction based on base salary and days
    const calculateDeduction = (baseSalary: number, leaveDays: number, monthYear: Date): number => {
      if (baseSalary <= 0 || leaveDays <= 0) {
        return 0
      }
      
      // Get the number of days in the current payroll month
      const daysInMonth = new Date(monthYear.getFullYear(), monthYear.getMonth() + 1, 0).getDate()
      
      // Calculate daily salary
      const dailySalary = baseSalary / daysInMonth
      
      // Calculate total deduction
      const deduction = dailySalary * leaveDays
      
      return Math.round(deduction * 100) / 100 // Round to 2 decimal places
    }

    // Group leaves by employee and calculate deductions with fresh rule calculations
    const leavesByEmployee = new Map<string, any[]>()
    
    console.log('🔄 PROCESSING LEAVES:')
    console.log('------------------------------------------')
    
    leaveRecords.records.forEach((leave: any) => {
      const empId = leave.Employee__c
      if (!leavesByEmployee.has(empId)) {
        leavesByEmployee.set(empId, [])
      }
      
      const employeeRole = leave.Employee__r?.Role__c || ""
      const leaveType = leave.Leave_Type__c
      const leaveCategory = leave.Leave_Category__c
      const sessionStartValue = leave.Session_Start__c
      const sessionEndValue = leave.Session_End__c
      const normalizedCategory = leaveCategory?.toLowerCase().replace(/\s+/g, '-') || ''
      const normalizedType = leaveType?.toLowerCase() || ''
      const createdDate = dayjs(leave.CreatedDate)
      
      // Parse leave dates
      const start = dayjs(leave.Start_Date__c)
      const end = dayjs(leave.End_Date__c)
      
      // Check if half-day leave
      const isHalfDay = start.isSame(end, "day")
        && sessionStartValue === sessionEndValue
        && (sessionStartValue === "Session-1" || sessionStartValue === "Session-2")
      const startDayIsPartial = sessionStartValue && sessionStartValue !== "Session-1"
      const endDayIsPartial = sessionEndValue && sessionEndValue !== "Session-2"
      
      console.log(`\n📝 Leave ID: ${leave.Id.substring(0, 8)}...`)
      console.log(`   Employee: ${leave.Employee__r?.Employee_Name__c} (${employeeRole})`)
      console.log(`   Period: ${leave.Start_Date__c} → ${leave.End_Date__c}`)
      console.log(`   Type: ${leaveType} | Category: ${leaveCategory}`)
      console.log(`   Session: ${sessionStartValue || '-'} → ${sessionEndValue || '-'} | Half Day: ${isHalfDay}`)
      console.log(`   Created: ${createdDate.format('YYYY-MM-DD')}`)
      
      // Calculate base calendar days for the FULL leave period
      const baseCalendarDays = end.diff(start, "day") + 1
      let nonWorkingDaysInRange = 0
      let nonWorkingCursor = start.clone()
      while (nonWorkingCursor.isSame(end) || nonWorkingCursor.isBefore(end)) {
        if (isNonWorking(nonWorkingCursor)) {
          nonWorkingDaysInRange += 1
        }
        nonWorkingCursor = nonWorkingCursor.add(1, "day")
      }
      const workingDaysInRange = baseCalendarDays - nonWorkingDaysInRange
      const startPartialWorkingAdjustment =
        startDayIsPartial && !start.isSame(end, "day") && !isNonWorking(start) ? 1 : 0
      const endPartialWorkingAdjustment =
        endDayIsPartial && !start.isSame(end, "day") && !isNonWorking(end) ? 1 : 0
      const fullWorkingDaysInRange = Math.max(
        0,
        workingDaysInRange - startPartialWorkingAdjustment - endPartialWorkingAdjustment
      )
      
      // Calculate in-month overlap and base leave days for payroll month
      const monthStartDay = dayjs(startDate)
      const monthEndDay = dayjs(endDate)
      const overlapStart = start.isAfter(monthStartDay) ? start : monthStartDay
      const overlapEnd = end.isBefore(monthEndDay) ? end : monthEndDay

      if (overlapStart.isAfter(overlapEnd)) {
        console.log(`   ⚠️  SKIPPED: No overlap with selected month`)
        return
      }

      const overlapCalendarDays = overlapEnd.diff(overlapStart, "day") + 1
      let overlapWorkingDays = 0
      let overlapCursor = overlapStart.clone()
      while (overlapCursor.isSame(overlapEnd) || overlapCursor.isBefore(overlapEnd)) {
        if (!isNonWorking(overlapCursor)) {
          overlapWorkingDays += 1
        }
        overlapCursor = overlapCursor.add(1, "day")
      }

      let daysInSelectedMonth = overlapCalendarDays
      if (!isHalfDay && normalizedCategory === 'loss-of-pay') {
        daysInSelectedMonth = overlapWorkingDays
      }
      if (isHalfDay) {
        daysInSelectedMonth = daysInSelectedMonth * 0.5
      }
      if (!isHalfDay && normalizedCategory === 'loss-of-pay') {
        const includesStartInMonth =
          (start.isSame(monthStartDay, 'day') || start.isAfter(monthStartDay, 'day')) &&
          (start.isSame(monthEndDay, 'day') || start.isBefore(monthEndDay, 'day'))
        const includesEndInMonth =
          (end.isSame(monthStartDay, 'day') || end.isAfter(monthStartDay, 'day')) &&
          (end.isSame(monthEndDay, 'day') || end.isBefore(monthEndDay, 'day'))

        if (startDayIsPartial && includesStartInMonth && !isNonWorking(start)) {
          daysInSelectedMonth -= 0.5
        }
        if (endDayIsPartial && includesEndInMonth && !isNonWorking(end)) {
          daysInSelectedMonth -= 0.5
        }
        daysInSelectedMonth = Math.max(0, daysInSelectedMonth)
      }
      
      console.log(`   Base Days: ${baseCalendarDays} | Days in Month: ${daysInSelectedMonth}${isHalfDay ? ' (Half Day)' : ''}`)
      
      if (daysInSelectedMonth === 0) {
        console.log(`   ⚠️  SKIPPED: No overlap with selected month`)
        return // Skip if no overlap with this month
      }
      
      // Determine if rules apply
      // Handle both 'Loss of Pay' and 'loss-of-pay' formats (case-insensitive)
      const applyRules = normalizedCategory === 'loss-of-pay' && normalizedType === 'planned leave'
      const sandwichRuleApprovedOnLeave = leave.Sandwich_Rule__c === true
      const onePlusTwoRuleApprovedOnLeave = leave.OnePlusTwo_Rule__c === true
      
      const applySandwichRule = applyRules && !isHalfDay && fullWorkingDaysInRange > 0 && sandwichRuleApprovedOnLeave
      const applyOnePlusTwoRule = applyRules && !isHalfDay && fullWorkingDaysInRange > 0 && onePlusTwoRuleApprovedOnLeave
      
      console.log(`   Rules Evaluation:`)
      console.log(`     • applyRules: ${applyRules} (category: '${leaveCategory}' → '${normalizedCategory}', type: '${leaveType}' → '${normalizedType}')`)
      console.log(`     • isHalfDay: ${isHalfDay}`)
      console.log(`     • Sandwich approved on leave: ${sandwichRuleApprovedOnLeave}`)
      console.log(`     • One+Two approved on leave: ${onePlusTwoRuleApprovedOnLeave}`)
      console.log(`     • Sandwich Rule: ${applySandwichRule ? '✓ APPLIES' : '✗ Not Applicable'}`)
      console.log(`     • 1+2 Rule: ${applyOnePlusTwoRule ? '✓ APPLIES' : '✗ Not Applicable'}`)
      
      // --- SANDWICH RULE CALCULATION ---
      let hasNonWorkingInside = false
      let preSandwich = 0
      let postSandwich = 0
      let sandwichDates: string[] = []

      if (applySandwichRule) {
        const sandwichDateList: LeaveDateInput[] = []
        let sandwichCursor = start.clone()
        const sandwichWindowEnd = end.add(3, "day")

        while (sandwichCursor.isSame(sandwichWindowEnd) || sandwichCursor.isBefore(sandwichWindowEnd)) {
          const dateKey = sandwichCursor.format("YYYY-MM-DD")
          const isLeaveDay =
            (sandwichCursor.isSame(start) || sandwichCursor.isAfter(start)) &&
            (sandwichCursor.isSame(end) || sandwichCursor.isBefore(end)) &&
            !isNonWorking(sandwichCursor)

          sandwichDateList.push({
            date: dateKey,
            isLeaveDay,
            isHalfDay,
            leaveType,
            leaveCategory,
            isPublicHoliday: holidaySet.has(dateKey),
            isWeekend: isWeekend(sandwichCursor),
          })

          sandwichCursor = sandwichCursor.add(1, "day")
        }

        const sandwichPolicy = calculateLeaveDays(sandwichDateList, {
          allowedLeaveTypes: ["Planned Leave"],
          allowedLeaveCategories: ["loss-of-pay", "loss of pay"],
        })

        sandwichDates = sandwichPolicy.sandwichDates
        preSandwich = sandwichDates.filter((dateValue) => dayjs(dateValue).isBefore(start, "day")).length
        postSandwich = sandwichDates.filter((dateValue) => dayjs(dateValue).isAfter(end, "day")).length
        hasNonWorkingInside = sandwichDates.some(
          (dateValue) =>
            !dayjs(dateValue).isBefore(start, "day") &&
            !dayjs(dateValue).isAfter(end, "day")
        )
      }

      const sandwichApplied = applySandwichRule && sandwichDates.length > 0
      
      if (applySandwichRule) {
        console.log(`   🥪 Sandwich Calculation:`)
        console.log(`     • Non-working inside: ${hasNonWorkingInside ? 'Yes' : 'No'}`)
        console.log(`     • Pre-sandwich days: ${preSandwich}`)
        console.log(`     • Post-sandwich days: ${postSandwich}`)
        console.log(`     • Sandwich Applied: ${sandwichApplied ? 'YES' : 'NO'}`)
      }
      
      // Calculate days with sandwich rule
      let rangeLeaveDays = isHalfDay ? baseCalendarDays * 0.5 : baseCalendarDays
      if (!isHalfDay && normalizedCategory === 'loss-of-pay') {
        rangeLeaveDays = baseCalendarDays - nonWorkingDaysInRange
        if (startDayIsPartial && !start.isSame(end, 'day') && !isNonWorking(start)) {
          rangeLeaveDays -= 0.5
        }
        if (endDayIsPartial && !start.isSame(end, 'day') && !isNonWorking(end)) {
          rangeLeaveDays -= 0.5
        }
        rangeLeaveDays = Math.max(0, rangeLeaveDays)
      }
      const sandwichExtra = sandwichApplied ? sandwichDates.length : 0
      const totalSandwichDeduction = rangeLeaveDays + sandwichExtra
      
      // --- ONE+TWO RULE CALCULATION ---
      let onePlusTwoExtra = 0
      let onePlusTwoExtraInMonth = 0
      
      if (applyOnePlusTwoRule) {
        console.log(`   🔍 1+2 Rule Debug:`)
        console.log(`     • Created Date: ${createdDate.format('YYYY-MM-DD')}`)
        console.log(`     • Leave Start: ${start.format('YYYY-MM-DD')}`)
        console.log(`     • Min Notice Required: ${leaveConfig.minWorkingDayNoticePeriod} working days`)
        
        // Helper to count working days between two dates
        const countWorkingDaysBetween = (fromDate: dayjs.Dayjs, toDate: dayjs.Dayjs): number => {
          let workingDays = 0
          let current = fromDate.clone()
          
          while (current.isBefore(toDate)) {
            if (!isNonWorking(current)) {
              workingDays++
            }
            current = current.add(1, "day")
          }
          
          return workingDays
        }
        
        const penaltyMultiplier = leaveConfig.penaltyDaysPerDay
        
        let penaltyStart = start.clone()
        let penaltyEnd = end.clone()

        if (startDayIsPartial && !start.isSame(end, 'day')) {
          penaltyStart = penaltyStart.add(1, 'day')
        }
        if (endDayIsPartial && !start.isSame(end, 'day')) {
          penaltyEnd = penaltyEnd.subtract(1, 'day')
        }

        let cursorPenalty = penaltyStart.startOf("day")
        const endPenalty = penaltyEnd.startOf("day")
        
        while (cursorPenalty.isSame(endPenalty) || cursorPenalty.isBefore(endPenalty)) {
          if (!isNonWorking(cursorPenalty)) {
            const workingDaysInAdvance = countWorkingDaysBetween(createdDate, cursorPenalty)
            console.log(`     • Leave Day ${cursorPenalty.format('YYYY-MM-DD')}: ${workingDaysInAdvance} working days notice`)
            if (workingDaysInAdvance < leaveConfig.minWorkingDayNoticePeriod) {
              console.log(`       → Penalty Applied! (${workingDaysInAdvance} < ${leaveConfig.minWorkingDayNoticePeriod})`)
              onePlusTwoExtra += penaltyMultiplier
              if (
                (cursorPenalty.isSame(monthStartDay, 'day') || cursorPenalty.isAfter(monthStartDay, 'day')) &&
                (cursorPenalty.isSame(monthEndDay, 'day') || cursorPenalty.isBefore(monthEndDay, 'day'))
              ) {
                onePlusTwoExtraInMonth += penaltyMultiplier
              }
            }
          } else {
            console.log(`     • Leave Day ${cursorPenalty.format('YYYY-MM-DD')}: skipped (non-working day)`)
          }
          cursorPenalty = cursorPenalty.add(1, "day")
        }
        console.log(`     • Total Penalty Days: ${onePlusTwoExtra}`)
      }
      
      const onePlusTwoRuleApplied = applyRules && onePlusTwoExtra > 0
      const finalTotalAfterRules = totalSandwichDeduction + onePlusTwoExtra
      
      if (applyOnePlusTwoRule) {
        console.log(`   1️⃣+2️⃣ Penalty Calculation:`)
        console.log(`     • Penalty Days Added: ${onePlusTwoExtra}`)
        console.log(`     • 1+2 Applied: ${onePlusTwoRuleApplied ? 'YES' : 'NO'}`)
      }
      
      // --- CALCULATE DAYS FOR THIS MONTH ONLY ---
      const sandwichInMonth = sandwichApplied
        ? sandwichDates.filter((dateValue) => {
            const parsed = dayjs(dateValue)
            return (
              (parsed.isSame(monthStartDay, 'day') || parsed.isAfter(monthStartDay, 'day')) &&
              (parsed.isSame(monthEndDay, 'day') || parsed.isBefore(monthEndDay, 'day'))
            )
          }).length
        : 0

      let daysAfterRuleInMonth = daysInSelectedMonth + sandwichInMonth + onePlusTwoExtraInMonth
      
      daysAfterRuleInMonth = Math.round(daysAfterRuleInMonth * 100) / 100
      
      console.log(`   📊 Final Calculation:`)
      console.log(`     • Days in Month (Before Rules): ${daysInSelectedMonth}`)
      console.log(`     • Days in Month (After Rules): ${daysAfterRuleInMonth}`)
      console.log(`   ✅ Leave Processed\n`)
      
      leavesByEmployee.get(empId)!.push({
        id: leave.Id,
        leaveType: leave.Leave_Type__c,
        leaveCategory: leave.Leave_Category__c,
        startDate: leave.Start_Date__c,
        endDate: leave.End_Date__c,
        totalDays: rangeLeaveDays,
        totalDaysAfterRule: finalTotalAfterRules,
        daysInSelectedMonth,
        daysAfterRuleInMonth,
        status: leave.Status__c,
        sandwichApplied,
        onePlusTwoRuleApplied,
      })
    })

    console.log('------------------------------------------')
    console.log('\n💰 CALCULATING EMPLOYEE PAYROLLS:')
    console.log('------------------------------------------\n')
    
    // Map employees with their salary and leave details
    const employeePayrollData = employeeRecords.records.map((emp: any) => {
      const employeeLeaves = leavesByEmployee.get(emp.Id) || []
      const originalCTC = toNumber(emp.Salary_CTC__c)
      
      console.log(`👤 ${emp.Employee_Name__c}`)
      console.log(`   Original CTC: ₹${originalCTC.toLocaleString()}`)
      console.log(`   Leaves Count: ${employeeLeaves.length}`)
      
      // STEP 1: Calculate leave deductions FIRST
      const leavesWithDeductions = employeeLeaves.map(leave => {
        const normalizedCategory = leave.leaveCategory?.toLowerCase().replace(/\s+/g, '-') || ''
        const isHalfDay = leave.totalDays < 1 // Check if it's a half-day leave
        
        // For Extra Day Pay, add amount instead of deducting
        if (normalizedCategory === 'extra-day-pay') {
          const extraPayAmount = calculateDeduction(originalCTC, leave.daysInSelectedMonth, startDate)
          console.log(`     • Leave ${leave.id.substring(0, 8)} (Extra Day Pay): +₹${extraPayAmount}`)
          return {
            ...leave,
            actualDeduction: -extraPayAmount, // Negative means addition
            afterRuleDeduction: -extraPayAmount,
          }
        }
        
        // For Loss of Pay leaves
        if (normalizedCategory === 'loss-of-pay') {
          // For half-day, ignore sandwich and 1+2 rules, use actual days only
          if (isHalfDay) {
            const halfDayDeduction = calculateDeduction(originalCTC, leave.daysInSelectedMonth, startDate)
            console.log(`     • Leave ${leave.id.substring(0, 8)} (Half Day): ₹${halfDayDeduction}`)
            return {
              ...leave,
              actualDeduction: halfDayDeduction,
              afterRuleDeduction: halfDayDeduction, // No rules applied for half-day
            }
          }
          
          // For full-day, apply rules
          const actualDeduction = calculateDeduction(originalCTC, leave.daysInSelectedMonth, startDate)
          const afterRuleDeduction = calculateDeduction(originalCTC, leave.daysAfterRuleInMonth, startDate)
          console.log(`     • Leave ${leave.id.substring(0, 8)}: ₹${actualDeduction} → ₹${afterRuleDeduction}`)
          return {
            ...leave,
            actualDeduction,
            afterRuleDeduction,
          }
        }
        
        // For other leave types, deduct actual days
        const actualDeduction = calculateDeduction(originalCTC, leave.daysInSelectedMonth, startDate)
        const afterRuleDeduction = calculateDeduction(originalCTC, leave.daysAfterRuleInMonth, startDate)
        console.log(`     • Leave ${leave.id.substring(0, 8)}: ₹${actualDeduction} → ₹${afterRuleDeduction}`)
        return {
          ...leave,
          actualDeduction,
          afterRuleDeduction,
        }
      })
      
      // Calculate total leave deductions
      const totalActualDeductions = leavesWithDeductions
        .filter(leave => leave.afterRuleDeduction > 0)
        .reduce((sum, leave) => sum + leave.afterRuleDeduction, 0)
      
      const totalAdditions = leavesWithDeductions
        .filter(leave => leave.afterRuleDeduction < 0)
        .reduce((sum, leave) => sum + Math.abs(leave.afterRuleDeduction), 0)

      const performanceComponent = round2(totalAdditions)
      
      // STEP 2: Deduct leave amount from CTC to get adjusted salary
      const adjustedMonthlyIncome = round2(originalCTC - totalActualDeductions)
      const baseSalary = adjustedMonthlyIncome
      
      const totalLeaveDays = round2(employeeLeaves.reduce((sum, leave) => sum + leave.daysInSelectedMonth, 0))
      const totalLeaveDaysAfterRule = round2(employeeLeaves.reduce((sum, leave) => sum + leave.daysAfterRuleInMonth, 0))
      
      console.log(`   Leave Deduction: ₹${totalActualDeductions.toLocaleString()}`)
      console.log(`   Adjusted Monthly Income (CTC - Leave): ₹${adjustedMonthlyIncome.toLocaleString()}`)
      console.log(`   Leave Days (Before Rules): ${totalLeaveDays}`)
      console.log(`   Leave Days (After Rules): ${totalLeaveDaysAfterRule}`)
      
      // STEP 3: Calculate salary components based on ADJUSTED income
      const basicPercentage = toNumber(emp.Basic_Console__c)
      const hraPercentage = toNumber(emp.HRA__c)
      const convPercentage = toNumber(emp.CONV__c)
      const specialAllowancePercentage = toNumber(emp.S_All__c)
      const pfPercentage = toNumber(emp.PF__c)
      const ptAmount = toNumber(emp.PT__c)
      const esiPercentage = toNumber(emp.ESI__c)

      const actualMonthlyIncome = round2(originalCTC)
      const actualBasicComponent = round2(actualMonthlyIncome * (basicPercentage / 100))
      const actualHraComponent = round2(actualMonthlyIncome * (hraPercentage / 100))
      const actualConvComponent = round2(actualMonthlyIncome * (convPercentage / 100))
      const actualSpecialAllowanceComponent = round2(actualMonthlyIncome * (specialAllowancePercentage / 100))
      const actualPerformanceComponent = performanceComponent
      const actualGrossIncome = round2(
        actualBasicComponent +
        actualHraComponent +
        actualConvComponent +
        actualSpecialAllowanceComponent +
        actualPerformanceComponent
      )

      const basicComponent = round2(adjustedMonthlyIncome * (basicPercentage / 100))
      const hraComponent = round2(adjustedMonthlyIncome * (hraPercentage / 100))
      const convComponent = round2(adjustedMonthlyIncome * (convPercentage / 100))
      const specialAllowanceComponent = round2(adjustedMonthlyIncome * (specialAllowancePercentage / 100))
      const grossIncome = round2(
        basicComponent + hraComponent + convComponent + specialAllowanceComponent + performanceComponent
      )
      const esiEligibleGrossIncome = round2(
        basicComponent + hraComponent + convComponent + specialAllowanceComponent
      )
      const totalDaysInPayrollMonth = endDate.getDate()
      const configuredPfBase = toNumber(emp.PF_Basic__c)
      const pfBase = configuredPfBase > 0 ? configuredPfBase : basicComponent
      const pfThreshold = 15000
      const lossOfPayLeaveDaysAfterRule = round2(
        leavesWithDeductions
          .filter((leave) => {
            const normalizedCategory = leave.leaveCategory?.toLowerCase().replace(/\s+/g, '-') || ''
            return normalizedCategory === 'loss-of-pay'
          })
          .reduce((sum, leave) => sum + Number(leave.daysAfterRuleInMonth || 0), 0)
      )
      const hasLeaveInMonth = lossOfPayLeaveDaysAfterRule > 0

      // If employee has leave:
      // PF = (((total days in month - days after rule) * PF_Base) / total days in month) * PF%
      const payableDaysForPf = Math.max(0, totalDaysInPayrollMonth - lossOfPayLeaveDaysAfterRule)
      const proratedPfBase = totalDaysInPayrollMonth > 0
        ? (payableDaysForPf * pfBase) / totalDaysInPayrollMonth
        : 0
      const pfDeductionBase = pfBase >= pfThreshold
        ? pfBase
        : (hasLeaveInMonth ? proratedPfBase : pfBase)
      const pfDeduction = round2(pfDeductionBase * (pfPercentage / 100))
      const esiDeduction = round2(esiEligibleGrossIncome * (esiPercentage / 100))
      const salaryStructureDeductions = round2(pfDeduction + ptAmount + esiDeduction)
      
      console.log(`   Gross Income (after leave): ₹${grossIncome.toLocaleString()}`)
      
      const totalDeductionsWithSecurity = round2(totalActualDeductions + salaryStructureDeductions)
      
      // Extra Day Pay is included in grossIncome via performanceComponent.
      // Keep additions bucket free for manual bonus/adjustments from UI.
      const totalAdditionsWithBonus = 0
      
      const netSalary = round2(grossIncome - salaryStructureDeductions)
      
      if (totalAdditions > 0) {
        console.log(`   Total Additions: ₹${totalAdditions.toLocaleString()}`)
      }
      if (totalActualDeductions > 0) {
        console.log(`   Total Deductions: ₹${totalActualDeductions.toLocaleString()}`)
      }
      if (salaryStructureDeductions > 0) {
        console.log(`   Salary Structure Deductions (PF/PT/ESI): ₹${salaryStructureDeductions.toLocaleString()}`)
      }
      console.log(
        `   PF Debug: base=₹${pfBase.toLocaleString()}, threshold=₹${pfThreshold.toLocaleString()}, totalDays=${totalDaysInPayrollMonth}, ` +
        `lopLeaveAfterRule=${lossOfPayLeaveDaysAfterRule}, payableDays=${payableDaysForPf}, ` +
        `proratedBase=₹${round2(proratedPfBase).toLocaleString()}, ` +
        `pfDeductionBase=₹${round2(pfDeductionBase).toLocaleString()}, PF%=${pfPercentage}, PF=₹${pfDeduction.toLocaleString()}`
      )
      console.log(
        `   ESI Debug: eligibleGross=₹${esiEligibleGrossIncome.toLocaleString()}, ESI%=${esiPercentage}, ESI=₹${esiDeduction.toLocaleString()}`
      )
      console.log(`   Net Salary: ₹${netSalary.toLocaleString()}`)
      console.log(`   ✅ Payroll Calculated\n`)

      return {
        id: emp.Id,
        employeeId: emp.Employee_Id__c || emp.Name || emp.Id,
        Employee_Id__c: emp.Employee_Id__c || '',
        employeeName: emp.Employee_Name__c || "Unknown",
        email: emp.Employee_Email__c || "",
        department: emp.Department__c || "",
        role: emp.Role__c || "",
        dateOfJoining: emp.Joining_Date__c || '',
        pfNumber: emp.PF_Number__c || '',
        esiNumber: emp.ESI_Number__c || '',
        uanNumber: emp.UAN_Number__c || '',
        bankName: bankByEmployeeId.get(emp.Id)?.bankName || '',
        accountNumber: bankByEmployeeId.get(emp.Id)?.accountNumber || '',
        monthlyIncome: round2(adjustedMonthlyIncome),
        baseSalary: round2(adjustedMonthlyIncome),
        basicSalary: round2(adjustedMonthlyIncome),
        actualMonthlyIncome,
        actualBasicComponent,
        actualHraComponent,
        actualConvComponent,
        actualSpecialAllowanceComponent,
        actualPerformanceComponent,
        actualGrossIncome,
        basicComponent,
        hraComponent,
        convComponent,
        specialAllowanceComponent,
        performanceComponent,
        grossIncome,
        pfDeduction,
        ptDeduction: round2(ptAmount),
        esiDeduction,
        salaryStructureDeductions,
        totalLeaveDays,
        totalAdditions: Math.round(totalAdditionsWithBonus * 100) / 100,
        totalDeductions: Math.round(totalDeductionsWithSecurity * 100) / 100,
        leaves: leavesWithDeductions,
        netSalary: Math.round(netSalary * 100) / 100,
      }
    })

    const totalNetSalary = employeePayrollData.reduce((sum, emp) => sum + emp.netSalary, 0)
    const totalDeductionsAll = employeePayrollData.reduce((sum, emp) => sum + emp.totalDeductions, 0)
    
    console.log('------------------------------------------')
    console.log('✨ PAYROLL GENERATION COMPLETED')
    console.log('------------------------------------------')
    console.log(`📊 Summary:`)
    console.log(`   • Total Employees: ${employeePayrollData.length}`)
    console.log(`   • Total Deductions: ₹${totalDeductionsAll.toLocaleString()}`)
    console.log(`   • Total Net Salary: ₹${totalNetSalary.toLocaleString()}`)
    console.log('==========================================\n')

    return NextResponse.json({
      month,
      year,
      totalEmployees: employeePayrollData.length,
      employees: employeePayrollData,
    })
  } catch (error) {
    console.error("Error generating payroll:", error)
    return NextResponse.json({ error: "Failed to generate payroll" }, { status: 500 })
  }
}
