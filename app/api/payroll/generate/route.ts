import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifyToken } from "@/lib/auth-utils"
import { getSalesforceConnection } from "@/lib/salesforce"

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

    const conn = await getSalesforceConnection()

    // Get all active employees with their salary details
    const employeeRecords = await conn.query<any>(`
      SELECT 
        Id,
        Employee_Name__c,
        Employee_Email__c,
        Base_Salary__c,
        Department__c,
        Role__c,
        Status__c,
        Active__c
      FROM Employee__c
      WHERE Active__c = true
      ORDER BY Employee_Name__c
    `)

    console.log(`Fetched ${employeeRecords.totalSize} active employees`)

    // Calculate the date range for the selected month
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

    const startDate = new Date(year, monthIndex, 1)
    const endDate = new Date(year, monthIndex + 1, 0)

    const startDateStr = startDate.toISOString().split("T")[0]
    const endDateStr = endDate.toISOString().split("T")[0]

    console.log(`Querying leaves from ${startDateStr} to ${endDateStr}`)

    // Get all leaves for the selected month for all employees
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
        Total_Days_After_Rule__c,
        Status__c,
        Actual_Deduction__c,
        After_Rule_Deduction__c
      FROM Leave__c
      WHERE 
        (Start_Date__c >= ${startDateStr} OR End_Date__c >= ${startDateStr})
        AND (Start_Date__c <= ${endDateStr} OR End_Date__c <= ${endDateStr})
        AND Status__c IN ('Approved')
      ORDER BY Employee__c, Start_Date__c
    `)

    console.log(`Fetched ${leaveRecords.totalSize} leaves for the selected month`)

    // Helper function to calculate days in the selected month for a leave period
    const calculateDaysInMonth = (leaveStart: string, leaveEnd: string, monthStart: Date, monthEnd: Date): number => {
      const start = new Date(leaveStart)
      const end = new Date(leaveEnd)
      
      // Determine the overlap period
      const overlapStart = start > monthStart ? start : monthStart
      const overlapEnd = end < monthEnd ? end : monthEnd
      
      // If there's no overlap, return 0
      if (overlapStart > overlapEnd) {
        return 0
      }
      
      // Calculate the number of days (inclusive)
      const timeDiff = overlapEnd.getTime() - overlapStart.getTime()
      const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24)) + 1 // +1 to include both start and end dates
      
      return daysDiff
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

    // Group leaves by employee and calculate deductions
    const leavesByEmployee = new Map<string, any[]>()
    leaveRecords.records.forEach((leave: any) => {
      const empId = leave.Employee__c
      if (!leavesByEmployee.has(empId)) {
        leavesByEmployee.set(empId, [])
      }
      
      // Calculate actual days in the selected month
      const daysInSelectedMonth = calculateDaysInMonth(
        leave.Start_Date__c,
        leave.End_Date__c,
        startDate,
        endDate
      )
      
      leavesByEmployee.get(empId)!.push({
        id: leave.Id,
        leaveType: leave.Leave_Type__c,
        leaveCategory: leave.Leave_Category__c,
        startDate: leave.Start_Date__c,
        endDate: leave.End_Date__c,
        totalDays: leave.Total_Days__c || 0,
        totalDaysAfterRule: leave.Total_Days_After_Rule__c || 0,
        daysInSelectedMonth,
        status: leave.Status__c,
      })
    })

    // Map employees with their salary and leave details
    const employeePayrollData = employeeRecords.records.map((emp: any) => {
      const employeeLeaves = leavesByEmployee.get(emp.Id) || []
      const baseSalary = emp.Base_Salary__c || 0
      
      // Calculate total leave days that fall in this month
      const totalLeaveDays = employeeLeaves.reduce((sum, leave) => sum + leave.daysInSelectedMonth, 0)
      
      // Calculate deduction for each leave based on days in the selected month
      const leavesWithDeductions = employeeLeaves.map(leave => {
        const deduction = calculateDeduction(baseSalary, leave.daysInSelectedMonth, startDate)
        return {
          ...leave,
          actualDeduction: deduction,
          afterRuleDeduction: deduction,
        }
      })
      
      // Calculate total deductions
      const totalDeductions = leavesWithDeductions.reduce((sum, leave) => sum + leave.actualDeduction, 0)

      return {
        id: emp.Id,
        employeeId: emp.Id,
        employeeName: emp.Employee_Name__c || "Unknown",
        email: emp.Employee_Email__c || "",
        department: emp.Department__c || "",
        role: emp.Role__c || "",
        baseSalary,
        totalLeaveDays,
        totalDeductions: Math.round(totalDeductions * 100) / 100,
        leaves: leavesWithDeductions,
        netSalary: Math.round((baseSalary - totalDeductions) * 100) / 100,
      }
    })

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
