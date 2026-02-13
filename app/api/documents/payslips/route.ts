import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifyToken } from "@/lib/auth-utils"
import { getSalesforceConnection } from "@/lib/salesforce"

export async function GET(request: NextRequest) {
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

    const conn = await getSalesforceConnection()
    if (!conn) {
      return NextResponse.json({ error: "Failed to connect to Salesforce" }, { status: 500 })
    }

    // Fetch payslip documents for the logged-in employee
    const query = `
      SELECT Id, Name, Document_Category__c, File_URL__c, CreatedDate
      FROM Document__c 
      WHERE Employee__c = '${payload.employeeId}' 
      AND Document_Category__c = 'Payslip'
      ORDER BY CreatedDate DESC
    `

    const result = await conn.query(query)

    return NextResponse.json(result.records || [])
  } catch (error) {
    console.error("Error fetching payslips:", error)
    return NextResponse.json({ error: "Failed to fetch payslips" }, { status: 500 })
  }
}
