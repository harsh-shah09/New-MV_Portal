import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifyToken } from "@/lib/auth-utils"
import { getSalesforceConnection, sendInAppNotifications } from "@/lib/salesforce"
import { generatePayslipPDF } from "@/lib/pdf-generator"
import { uploadPayslipToS3 } from "@/lib/s3"

export async function POST(request: NextRequest) {
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
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { month, year, employees } = body || {}

    if (!month || !year || !Array.isArray(employees)) {
      return NextResponse.json({ error: "Month, year, and employees are required" }, { status: 400 })
    }

    const conn = await getSalesforceConnection()
    if (!conn) {
      return NextResponse.json({ error: "Failed to connect to Salesforce" }, { status: 500 })
    }

    // 1) Create Payroll_Summary__c
    const summaryPayload: any = {
      Payroll_Month__c: month,
      Payroll_Year__c: year,
      Status__c: "Draft",
      Period_Type__c: "Month",
    }

    console.log("Creating Payroll Summary:", summaryPayload)

    const summaryResult = await conn.sobject("Payroll_Summary__c").create(summaryPayload)
    
    // Handle result (can be single object or array)
    const summary = Array.isArray(summaryResult) ? summaryResult[0] : summaryResult
    
    if (!summary.success) {
      console.error("Failed to create payroll summary:", summary.errors)
      return NextResponse.json({ 
        error: "Failed to create payroll summary", 
        details: summary.errors 
      }, { status: 500 })
    }

    const summaryId = summary.id
    console.log("Payroll Summary created with ID:", summaryId)

    // 2) Create Payroll__c records for each employee
    const payrollRecords = employees.map((emp: any) => {
      // Extract adjustment details (only 1 adjustment allowed per employee)
      const adjustment = emp.adjustments && emp.adjustments.length > 0 ? emp.adjustments[0] : null
      
      // totalAdditions and totalDeductions already include all calculations from frontend
      // (Extra Day Pay + Bonus + Anniversary Bonus + Adjustments for additions)
      // (Leave Deductions + Adjustments + Company Security Deduction for deductions)
      const totalAdditions = emp.totalAdditions || 0
      const totalDeductions = emp.totalDeductions || 0
      const companySecurityDeduction = emp.companySecurityDeduction || 0
      const anniversaryBonus = emp.anniversaryBonus || 0
      
      // Combine manual bonus and anniversary bonus for Bonus__c field
      const totalBonus = (emp.bonus || 0) + anniversaryBonus
      
      return {
        Payroll_Summary__c: summaryId,
        Employee__c: emp.id,
        Payroll_Month__c: month,
        Basic_Salary__c: emp.baseSalary || emp.basicSalary || 0,
        Bonus__c: totalBonus,
        Adjustment_Type__c: adjustment?.adjustmentType || null,
        Adjustment_Amount__c: adjustment?.adjustmentAmount || null,
        Adjustment_Description__c: adjustment?.adjustmentDescription || null,
        Total_Additions__c: totalAdditions,
        Total_Deductions__c: totalDeductions,
      }
    })

    console.log("Creating Payroll records:", JSON.stringify(payrollRecords, null, 2))
    console.log("Number of payroll records to create:", payrollRecords.length)

    const payrollResult = await conn.sobject("Payroll__c").create(payrollRecords, { allOrNone: false })
    
    console.log("Payroll creation result:", JSON.stringify(payrollResult, null, 2))

    // Generate and upload PDFs to S3
    console.log("Generating and uploading payslip PDFs to S3...")
    const pdfUploadResults = []
    
    for (let i = 0; i < employees.length; i++) {
      const emp = employees[i]
      const payrollRecord = Array.isArray(payrollResult) ? payrollResult[i] : payrollResult
      
      if (!payrollRecord.success) {
        console.error(`Skipping PDF generation for ${emp.employeeName} due to payroll creation failure`)
        pdfUploadResults.push({
          employeeId: emp.employeeId,
          employeeName: emp.employeeName,
          success: false,
          error: "Payroll record creation failed"
        })
        continue
      }

      try {
        // Prepare payslip data for PDF generation
        const daysInMonth = new Date(year, 
          ["January", "February", "March", "April", "May", "June",
           "July", "August", "September", "October", "November", "December"].indexOf(month) + 1,
          0
        ).getDate()

        const payslipData = {
          employeeName: emp.employeeName,
          employeeId: emp.employeeId,
          email: emp.email || "",
          department: emp.department || "",
          role: emp.role || "",
          payrollMonth: month,
          payrollYear: year,
          basicSalary: emp.baseSalary || emp.basicSalary || 0,
          bonus: emp.bonus || 0,
          anniversaryBonus: emp.anniversaryBonus || 0,
          totalAdditions: emp.totalAdditions || 0,
          totalDeductions: emp.totalDeductions || 0,
          companySecurityDeduction: emp.companySecurityDeduction || 0,
          netSalary: emp.netSalary || 0,
          totalLeaveDays: emp.totalLeaveDays || 0,
          totalLeaveDaysAfterRule: emp.totalLeaveDaysAfterRule || emp.totalLeaveDays || 0,
          totalLeaveDeductions: emp.leaves?.reduce((sum: number, leave: any) => 
            sum + (leave.afterRuleDeduction || 0), 0) || 0,
          leaves: emp.leaves || [],
          adjustments: emp.adjustments || [],
          daysInMonth,
        }

        // Generate PDF
        const pdfBuffer = await generatePayslipPDF(payslipData)

        // Upload to S3
        const s3Url = await uploadPayslipToS3(pdfBuffer, emp.employeeId, month, year)

        console.log(`✓ PDF uploaded for ${emp.employeeName}: ${s3Url}`)
        
        // Create Document__c record for the payslip
        try {
          const documentName = `Payslip_${emp.employeeId}_${month}_${year}`
          const documentRecord = {
            Name: documentName,
            Document_Category__c: 'Payslip',
            Document_Type__c: 'Payslip',
            Status__c: 'Uploaded',
            Employee__c: emp.id,
            File_URL__c: s3Url,
          }
          
          const documentResult = await conn.sobject("Document__c").create(documentRecord)
          
          if (Array.isArray(documentResult) ? documentResult[0].success : documentResult.success) {
            console.log(`✓ Document record created for ${emp.employeeName}`)
          } else {
            console.error(`Failed to create document record for ${emp.employeeName}:`, 
              Array.isArray(documentResult) ? documentResult[0].errors : documentResult.errors)
          }
        } catch (docError: any) {
          console.error(`Error creating document record for ${emp.employeeName}:`, docError)
          // Don't fail the whole process if document creation fails
        }
        
        pdfUploadResults.push({
          employeeId: emp.employeeId,
          employeeName: emp.employeeName,
          success: true,
          s3Url
        })
      } catch (error: any) {
        console.error(`Error generating/uploading PDF for ${emp.employeeName}:`, error)
        pdfUploadResults.push({
          employeeId: emp.employeeId,
          employeeName: emp.employeeName,
          success: false,
          error: error.message
        })
      }
    }

    console.log("PDF generation and upload completed")

    // Send in-app notifications to all employees about payslip generation
    try {
      const employeeIds = employees.map((emp: any) => emp.id).filter(Boolean);
      
      if (employeeIds.length > 0) {
        await sendInAppNotifications(
          employeeIds,
          `Your payslip for ${month} ${year} has been generated and is now available for download.`,
          'Payroll',
          false
        );
        console.log(`✓ In-app notifications sent to ${employeeIds.length} employees about payslip generation`);
      }
    } catch (notifError) {
      console.error('Error sending payslip notifications:', notifError);
      // Don't fail the request if notification fails
    }

    return NextResponse.json({
      payrollSummaryId: summaryId,
      payrollResults: payrollResult,
      totalRecordsCreated: Array.isArray(payrollResult) ? payrollResult.length : 1,
      pdfUploadResults,
    })
  } catch (error) {
    console.error("Error saving payroll:", error)
    return NextResponse.json({ error: "Failed to save payroll" }, { status: 500 })
  }
}
