import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifyToken } from "@/lib/auth-utils"
import { getSalesforceConnection } from "@/lib/salesforce"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ payrollId: string }> }
) {
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

    const { payrollId } = await params

    const conn = await getSalesforceConnection()
    if (!conn) {
      return NextResponse.json({ error: "Failed to connect to Salesforce" }, { status: 500 })
    }

    // Fetch detailed payroll record
    const payrollResult = await conn.query<any>(`
      SELECT 
        Id,
        Employee__c,
        Employee__r.Employee_Name__c,
        Employee__r.Employee_Email__c,
        Employee__r.Department__c,
        Employee__r.Role__c,
        Employee__r.Base_Salary__c,
        Payroll_Month__c,
        Basic_Salary__c,
        Bonus__c,
        Adjustment_Type__c,
        Adjustment_Amount__c,
        Adjustment_Description__c,
        Total_Additions__c,
        Total_Deductions__c,
        Net_Salary__c,
        Payroll_Summary__r.Payroll_Month__c,
        Payroll_Summary__r.Payroll_Year__c
      FROM Payroll__c
      WHERE Id = '${payrollId}'
      LIMIT 1
    `)

    if (!payrollResult.records || payrollResult.records.length === 0) {
      return NextResponse.json({ error: "Payroll record not found" }, { status: 404 })
    }

    const payroll = payrollResult.records[0]

    // Extract month and year
    const payrollMonth = payroll.Payroll_Summary__r?.Payroll_Month__c || payroll.Payroll_Month__c
    const payrollYear = payroll.Payroll_Summary__r?.Payroll_Year__c || new Date().getFullYear()

    // Calculate date range for the payroll month
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ]
    const monthIndex = monthNames.indexOf(payrollMonth)
    
    if (monthIndex === -1) {
      return NextResponse.json({ error: "Invalid payroll month" }, { status: 400 })
    }

    const startDate = new Date(payrollYear, monthIndex, 1)
    const endDate = new Date(payrollYear, monthIndex + 1, 0)
    const startDateStr = startDate.toISOString().split("T")[0]
    const endDateStr = endDate.toISOString().split("T")[0]

    // Fetch holidays for rule calculations
    const holidayResult = await conn.query<any>(`
      SELECT Date__c 
      FROM Holidays_List__c
    `)

    const holidayDates = (holidayResult.records || [])
      .map((h: any) => h?.Date__c)
      .filter(Boolean)
      .map((d: string) => new Date(d).toISOString().split('T')[0])
    const holidaySet = new Set(holidayDates)

    // Helper functions
    const isWeekend = (date: Date): boolean => {
      const day = date.getDay()
      return day === 0 || day === 6
    }

    const isHoliday = (date: Date): boolean => {
      return holidaySet.has(date.toISOString().split('T')[0])
    }

    const isNonWorkingDay = (date: Date): boolean => {
      return isWeekend(date) || isHoliday(date)
    }

    // Fetch leave records for this employee and month
    const leaveResult = await conn.query<any>(`
      SELECT 
        Id,
        Leave_Type__c,
        Leave_Category__c,
        Start_Date__c,
        End_Date__c,
        Total_Days__c,
        Total_Days_After_Rule__c,
        Status__c,
        Actual_Deduction__c,
        After_Rule_Deduction__c,
        OnePlusTwo_Rule__c,
        Sandwich_Rule__c
      FROM Leave__c
      WHERE 
        Employee__c = '${payroll.Employee__c}'
        AND (Start_Date__c >= ${startDateStr} OR End_Date__c >= ${startDateStr})
        AND (Start_Date__c <= ${endDateStr} OR End_Date__c <= ${endDateStr})
        AND Status__c = 'Approved'
      ORDER BY Start_Date__c
    `)

    // Calculate days in selected month for each leave
    const calculateDaysInMonth = (leaveStart: string, leaveEnd: string): number => {
      const start = new Date(leaveStart)
      const end = new Date(leaveEnd)
      
      const overlapStart = start > startDate ? start : startDate
      const overlapEnd = end < endDate ? end : endDate
      
      if (overlapStart > overlapEnd) return 0
      
      const timeDiff = overlapEnd.getTime() - overlapStart.getTime()
      const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24)) + 1
      
      return daysDiff
    }

    // Calculate deduction for leaves
    const baseSalary = payroll.Basic_Salary__c || 0
    const daysInMonth = new Date(payrollYear, monthIndex + 1, 0).getDate()
    const dailySalary = baseSalary / daysInMonth

    // Helper: Calculate sandwich days for a specific month range
    const calculateSandwichDaysInMonth = (
      leaveStart: Date, 
      leaveEnd: Date, 
      sandwichApplied: boolean,
      isHalfDay: boolean
    ): number => {
      if (!sandwichApplied || isHalfDay) {
        return calculateDaysInMonth(leaveStart.toISOString().split('T')[0], leaveEnd.toISOString().split('T')[0])
      }

      const overlapStart = leaveStart > startDate ? leaveStart : startDate
      const overlapEnd = leaveEnd < endDate ? leaveEnd : endDate

      if (overlapStart > overlapEnd) return 0

      let workingLeaveDays = 0
      let cursor = new Date(overlapStart)
      while (cursor <= overlapEnd) {
        if (!isNonWorkingDay(cursor)) {
          workingLeaveDays++
        }
        cursor.setDate(cursor.getDate() + 1)
      }

      let sandwichDaysInMonth = 0

      if (leaveStart >= startDate && leaveStart <= endDate) {
        let preCursor = new Date(leaveStart)
        preCursor.setDate(preCursor.getDate() - 1)
        while (preCursor >= startDate && isNonWorkingDay(preCursor)) {
          sandwichDaysInMonth++
          preCursor.setDate(preCursor.getDate() - 1)
        }
      }

      if (leaveEnd >= startDate && leaveEnd <= endDate) {
        let postCursor = new Date(leaveEnd)
        postCursor.setDate(postCursor.getDate() + 1)
        while (postCursor <= endDate && isNonWorkingDay(postCursor)) {
          sandwichDaysInMonth++
          postCursor.setDate(postCursor.getDate() + 1)
        }
      }

      let nonWorkingWithinLeave = 0
      cursor = new Date(overlapStart)
      while (cursor <= overlapEnd) {
        if (isNonWorkingDay(cursor)) {
          nonWorkingWithinLeave++
        }
        cursor.setDate(cursor.getDate() + 1)
      }

      return workingLeaveDays + nonWorkingWithinLeave + sandwichDaysInMonth
    }

    const leaves = leaveResult.records.map((leave: any) => {
      const leaveStart = new Date(leave.Start_Date__c)
      const leaveEnd = new Date(leave.End_Date__c)
      const daysInSelectedMonth = calculateDaysInMonth(leave.Start_Date__c, leave.End_Date__c)
      
      // Use Total_Days_After_Rule__c which includes sandwich and 1+2 rule calculations
      const totalDays = leave.Total_Days__c || 0
      const totalDaysAfterRule = leave.Total_Days_After_Rule__c || totalDays
      const sandwichApplied = leave.Sandwich_Rule__c || false
      const onePlusTwoApplied = leave.OnePlusTwo_Rule__c || false
      const isHalfDay = leave.Session__c === "Session-1" || leave.Session__c === "Session-2"
      
      // Calculate rule-applied days for this month
      let daysAfterRuleInMonth = daysInSelectedMonth
      
      if (sandwichApplied || onePlusTwoApplied) {
        const sandwichDays = calculateSandwichDaysInMonth(leaveStart, leaveEnd, sandwichApplied, isHalfDay)
        
        // Calculate 1+2 penalty for this month
        const totalPenalty = totalDaysAfterRule - totalDays
        const penaltyDays = totalDays > 0 ? (daysInSelectedMonth / totalDays) * totalPenalty : 0
        
        if (sandwichApplied && !onePlusTwoApplied) {
          daysAfterRuleInMonth = sandwichDays
        } else if (!sandwichApplied && onePlusTwoApplied) {
          daysAfterRuleInMonth = daysInSelectedMonth + penaltyDays
        } else if (sandwichApplied && onePlusTwoApplied) {
          daysAfterRuleInMonth = sandwichDays + penaltyDays
        }
      }
      
      daysAfterRuleInMonth = Math.round(daysAfterRuleInMonth * 100) / 100
      
      // Calculate actual deduction and after-rule deduction
      const actualDeduction = Math.round(dailySalary * daysInSelectedMonth * 100) / 100
      const afterRuleDeduction = Math.round(dailySalary * daysAfterRuleInMonth * 100) / 100

      return {
        id: leave.Id,
        leaveType: leave.Leave_Type__c,
        leaveCategory: leave.Leave_Category__c,
        startDate: leave.Start_Date__c,
        endDate: leave.End_Date__c,
        totalDays,
        totalDaysAfterRule,
        daysInSelectedMonth,
        daysAfterRuleInMonth,
        status: leave.Status__c,
        actualDeduction,
        afterRuleDeduction,
        onePlusTwoRuleApplied: onePlusTwoApplied,
        sandwichRuleApplied: sandwichApplied,
      }
    })

    // Parse adjustments
    const adjustments = []
    if (payroll.Adjustment_Type__c && payroll.Adjustment_Amount__c) {
      adjustments.push({
        id: `adj-${payroll.Id}`,
        adjustmentType: payroll.Adjustment_Type__c,
        adjustmentAmount: payroll.Adjustment_Amount__c,
        adjustmentDescription: payroll.Adjustment_Description__c || "",
      })
    }

    // Calculate totals
    const totalLeaveDays = leaves.reduce((sum: number, leave: any) => sum + leave.daysInSelectedMonth, 0)
    const totalLeaveDaysAfterRule = leaves.reduce((sum: number, leave: any) => sum + leave.daysAfterRuleInMonth, 0)
    const totalLeaveDeductions = leaves.reduce((sum: number, leave: any) => sum + leave.afterRuleDeduction, 0)

    // Build payslip data
    const payslip = {
      id: payroll.Id,
      employeeId: payroll.Employee__c,
      employeeName: payroll.Employee__r?.Employee_Name__c || "Unknown",
      email: payroll.Employee__r?.Employee_Email__c || "",
      department: payroll.Employee__r?.Department__c || "",
      role: payroll.Employee__r?.Role__c || "",
      payrollMonth,
      payrollYear,
      
      // Salary breakdown
      basicSalary: baseSalary,
      bonus: payroll.Bonus__c || 0,
      totalAdditions: payroll.Total_Additions__c || 0,
      totalDeductions: payroll.Total_Deductions__c || 0,
      netSalary: payroll.Net_Salary__c || 0,
      
      // Leave details
      totalLeaveDays,
      totalLeaveDaysAfterRule,
      totalLeaveDeductions: Math.round(totalLeaveDeductions * 100) / 100,
      leaves,
      
      // Adjustments
      adjustments,
      
      // Additional info
      daysInMonth,
      dailySalary: Math.round(dailySalary * 100) / 100,
    }

    return NextResponse.json({ payslip })
  } catch (error) {
    console.error("Error fetching payslip:", error)
    return NextResponse.json({ error: "Failed to fetch payslip" }, { status: 500 })
  }
}
