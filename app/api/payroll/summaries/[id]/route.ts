import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifyToken } from "@/lib/auth-utils"
import { getSalesforceConnection } from "@/lib/salesforce"
import { deletePayslipFromS3 } from "@/lib/s3"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { role } = payload
    if (role !== "Admin") {
      return NextResponse.json({ error: "Forbidden - Only Admin can update payroll summary status" }, { status: 403 })
    }

    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: "Payroll Summary ID is required" }, { status: 400 })
    }

    const body = await request.json()
    const requestedStatus = String(body?.status || "").toLowerCase()
    const allowedStatuses = ["draft", "paid"]

    if (!allowedStatuses.includes(requestedStatus)) {
      return NextResponse.json({ error: "Invalid status. Allowed values: Draft, Paid" }, { status: 400 })
    }

    const statusValue = requestedStatus === "paid" ? "Paid" : "Draft"

    const conn = await getSalesforceConnection()
    if (!conn) {
      return NextResponse.json({ error: "Failed to connect to Salesforce" }, { status: 500 })
    }

    const updateResult = await conn.sobject("Payroll_Summary__c").update({
      Id: id,
      Status__c: statusValue,
    })

    const normalizedResult = Array.isArray(updateResult) ? updateResult[0] : updateResult
    if (!normalizedResult?.success) {
      return NextResponse.json(
        { error: "Failed to update payroll summary status", details: normalizedResult?.errors || [] },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: "Payroll summary status updated successfully",
      summaryId: id,
      status: requestedStatus,
    })
  } catch (error: any) {
    console.error("Error updating payroll summary status:", error)
    return NextResponse.json(
      { error: "Failed to update payroll summary status", details: error.message },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { role } = payload
    if (role !== "HR" && role !== "Admin") {
      return NextResponse.json({ error: "Forbidden - Only HR and Admin can delete payroll summaries" }, { status: 403 })
    }

    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: "Payroll Summary ID is required" }, { status: 400 })
    }

    const conn = await getSalesforceConnection()
    if (!conn) {
      return NextResponse.json({ error: "Failed to connect to Salesforce" }, { status: 500 })
    }

    console.log(`Starting deletion process for Payroll Summary: ${id}`)

    // Step 1: Fetch the Payroll Summary to get month and year
    const summaryQuery = `
      SELECT Id, Payroll_Month__c, Payroll_Year__c 
      FROM Payroll_Summary__c 
      WHERE Id = '${id}'
    `
    const summaryResult = await conn.query(summaryQuery)

    if (!summaryResult.records || summaryResult.records.length === 0) {
      return NextResponse.json({ error: "Payroll Summary not found" }, { status: 404 })
    }

    const summary = summaryResult.records[0] as any
    const month = summary.Payroll_Month__c
    const year = summary.Payroll_Year__c

    console.log(`Found Payroll Summary: ${month} ${year}`)

    // Step 2: Fetch all Payroll__c records associated with this summary
    const payrollQuery = `
      SELECT Id, Employee__c, Employee__r.Name, Employee__r.Employee_Id__c 
      FROM Payroll__c 
      WHERE Payroll_Summary__c = '${id}'
    `
    const payrollResult = await conn.query(payrollQuery)
    const payrollRecords = payrollResult.records || []

    console.log(`Found ${payrollRecords.length} Payroll records to delete`)

    // Step 3: Delete Document__c records and S3 files for each employee
    const deletionResults = {
      documents: { success: 0, failed: 0, errors: [] as any[] },
      s3Files: { success: 0, failed: 0, errors: [] as any[] },
      payrollRecords: { success: 0, failed: 0, errors: [] as any[] },
    }

    for (const payroll of payrollRecords) {
      const employeeId = (payroll as any).Employee__r?.Employee_Id__c || (payroll as any).Employee__r?.Name

      if (employeeId) {
        // Delete Document__c record
        try {
          const documentName = `Payslip_${employeeId}_${month}_${year}`
          const documentQuery = `
            SELECT Id 
            FROM Document__c 
            WHERE Name = '${documentName}'
          `
          const documentResult = await conn.query(documentQuery)

          if (documentResult.records && documentResult.records.length > 0) {
            const documentId = documentResult.records[0].Id
            await conn.sobject("Document__c").delete(documentId as string)
            deletionResults.documents.success++
            console.log(`✓ Deleted Document record: ${documentName}`)
          }
        } catch (error: any) {
          console.error(`Failed to delete Document record for ${employeeId}:`, error)
          deletionResults.documents.failed++
          deletionResults.documents.errors.push({ employeeId, error: error.message })
        }

        // Delete S3 file
        try {
          await deletePayslipFromS3(employeeId, month, year)
          deletionResults.s3Files.success++
          console.log(`✓ Deleted S3 file: Payslip_${employeeId}_${month}_${year}.pdf`)
        } catch (error: any) {
          console.error(`Failed to delete S3 file for ${employeeId}:`, error)
          deletionResults.s3Files.failed++
          deletionResults.s3Files.errors.push({ employeeId, error: error.message })
        }
      }
    }

    // Step 4: Delete all Payroll__c records
    if (payrollRecords.length > 0) {
      try {
        const payrollIds = payrollRecords.map((record: any) => record.Id)
        const deletePayrollResult = await conn.sobject("Payroll__c").delete(payrollIds as string[])
        
        const results = Array.isArray(deletePayrollResult) ? deletePayrollResult : [deletePayrollResult]
        results.forEach(result => {
          if (result.success) {
            deletionResults.payrollRecords.success++
          } else {
            deletionResults.payrollRecords.failed++
            deletionResults.payrollRecords.errors.push(result.errors)
          }
        })
        
        console.log(`✓ Deleted ${deletionResults.payrollRecords.success} Payroll records`)
      } catch (error: any) {
        console.error("Failed to delete Payroll records:", error)
        return NextResponse.json({ 
          error: "Failed to delete Payroll records", 
          details: error.message 
        }, { status: 500 })
      }
    }

    // Step 5: Delete the Payroll Summary itself
    try {
      await conn.sobject("Payroll_Summary__c").delete(id)
      console.log(`✓ Deleted Payroll Summary: ${id}`)
    } catch (error: any) {
      console.error("Failed to delete Payroll Summary:", error)
      return NextResponse.json({ 
        error: "Failed to delete Payroll Summary", 
        details: error.message 
      }, { status: 500 })
    }

    console.log("Deletion process completed successfully")

    return NextResponse.json({
      message: "Payroll Summary and all related records deleted successfully",
      summary: {
        month,
        year,
        summaryId: id,
      },
      deletionResults,
    })
  } catch (error: any) {
    console.error("Error deleting payroll summary:", error)
    return NextResponse.json({ 
      error: "Failed to delete payroll summary", 
      details: error.message 
    }, { status: 500 })
  }
}
