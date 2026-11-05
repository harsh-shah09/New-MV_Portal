import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifyToken } from "@/lib/auth-utils"
import { getSalesforceConnection } from "@/lib/salesforce"
import { db } from "@/lib/dynamodb"
import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb"
import dayjs from "dayjs"

const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
]

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate and authorize
    const cookieStore = await cookies()
    const session = cookieStore.get("session")?.value

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = await verifyToken(session)
    if (!payload) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 })
    }

    const { role } = payload
    if (role !== "HR" && role !== "Admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // 2. Parse query parameters
    const { searchParams } = new URL(request.url)
    const month = searchParams.get("month")
    const yearStr = searchParams.get("year")

    if (!month || !yearStr) {
      return NextResponse.json({ error: "Month and year query parameters are required" }, { status: 400 })
    }

    const monthIndex = months.indexOf(month)
    if (monthIndex < 0) {
      return NextResponse.json({ error: "Invalid month" }, { status: 400 })
    }

    const year = Number(yearStr)
    if (!Number.isFinite(year)) {
      return NextResponse.json({ error: "Invalid year" }, { status: 400 })
    }

    // End date of the selected payroll month
    const selectedPeriodEnd = dayjs(new Date(year, monthIndex + 1, 0)).endOf('day')

    // 3. Connect to Salesforce and query active employees
    const conn = await getSalesforceConnection()
    if (!conn) {
      return NextResponse.json({ error: "Failed to connect to Salesforce" }, { status: 500 })
    }

    // Check if payroll already exists for this period
    const existingSummaryQuery = await conn.query<any>(`
      SELECT Id, Name, Status__c
      FROM Payroll_Summary__c
      WHERE Payroll_Month__c = '${month}'
      AND Payroll_Year__c = ${year}
      LIMIT 1
    `)

    if ((existingSummaryQuery.records || []).length > 0) {
      return NextResponse.json(
        { error: `Payroll already exists for ${month} ${year}` },
        { status: 409 }
      )
    }

    const employeeRecords = await conn.query<any>(`
      SELECT Id, Name, Employee_Id__c, Employee_Name__c, Joining_Date__c, Onboarding_Date__c, Salary_CTC__c, Role__c
      FROM Employee__c
      WHERE Active__c = true
      ORDER BY Employee_Name__c ASC
    `)

    const isAdminRole = (roleName?: string) => roleName?.toString().trim().toLowerCase().includes("admin")
    const eligibleEmployees = (employeeRecords.records || []).filter((employee: any) => !isAdminRole(employee.Role__c))

    const results: any[] = []

    // 4. Iterate over each employee to identify completed anniversaries
    for (const employee of eligibleEmployees) {
      const onboardingDateStr = employee.Onboarding_Date__c || employee.Joining_Date__c
      if (!onboardingDateStr) continue

      const onboardingDate = dayjs(onboardingDateStr)
      let anniversaryYear = onboardingDate.year() + 1
      const completedAnniversaries: Array<{ years: number; dateStr: string }> = []

      while (true) {
        const anniversaryDate = onboardingDate.year(anniversaryYear)
        // Only include anniversaries completed on or before the end of the selected month
        if (anniversaryDate.isAfter(selectedPeriodEnd)) {
          break
        }
        completedAnniversaries.push({
          years: anniversaryYear - onboardingDate.year(),
          dateStr: anniversaryDate.format('YYYY-MM-DD')
        })
        anniversaryYear++
      }

      // Check DynamoDB for each completed anniversary to see if it is already paid
      if (completedAnniversaries.length > 0) {
        const checkedAnniversaries = await Promise.all(
          completedAnniversaries.map(async (ann) => {
            const getCmd = new GetCommand({
              TableName: "MV_Portal",
              Key: {
                Employee_Id: employee.Id,
                SortKey: `ANNIVERSARY_PAYOUT#${ann.dateStr}`
              }
            })
            const dbResult = await db.send(getCmd)
            const isPaid = dbResult.Item?.status === "Paid"
            return { ...ann, isPaid }
          })
        )

        const unpaid = checkedAnniversaries.filter(ann => !ann.isPaid)

        for (const ann of unpaid) {
          const ctc = Number(employee.Salary_CTC__c) || 0
          const amount = Math.round((ctc / 30) * 18 * 100) / 100

          results.push({
            employeeId: employee.Id,
            employeeCode: employee.Employee_Id__c || employee.Name || employee.Id,
            employeeName: employee.Employee_Name__c || "Unknown",
            onboardingDate: onboardingDateStr,
            yearsCompleted: ann.years,
            anniversaryDate: ann.dateStr,
            amount,
            status: dayjs(ann.dateStr).isBefore(dayjs().startOf('day')) ? 'Overdue' : 'Due'
          })
        }
      }
    }

    return NextResponse.json({ anniversaries: results })

  } catch (error: any) {
    console.error("Error fetching anniversaries:", error)
    return NextResponse.json({ error: "Failed to fetch anniversaries", details: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate and authorize
    const cookieStore = await cookies()
    const session = cookieStore.get("session")?.value

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = await verifyToken(session)
    if (!payload) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 })
    }

    const { role } = payload
    if (role !== "HR" && role !== "Admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // 2. Parse request body
    const body = await request.json()
    const { employeeId, anniversaryDate, amount, month, year } = body || {}

    if (!employeeId || !anniversaryDate || amount === undefined || !month || !year) {
      return NextResponse.json({ error: "employeeId, anniversaryDate, amount, month, and year are required" }, { status: 400 })
    }

    // Write payment receipt to DynamoDB
    const putCmd = new PutCommand({
      TableName: "MV_Portal",
      Item: {
        Employee_Id: employeeId,
        SortKey: `ANNIVERSARY_PAYOUT#${anniversaryDate}`,
        status: "Paid",
        payout_method: "Manual",
        amount: Number(amount),
        paid_date: new Date().toISOString(),
        payroll_month: month,
        payroll_year: Number(year),
        updated_time: new Date().toISOString()
      }
    })

    await db.send(putCmd)

    return NextResponse.json({ success: true, message: "Anniversary marked as paid successfully" })

  } catch (error: any) {
    console.error("Error marking anniversary as paid:", error)
    return NextResponse.json({ error: "Failed to mark anniversary as paid", details: error.message }, { status: 500 })
  }
}
