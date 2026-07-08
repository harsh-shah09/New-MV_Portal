import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verifyToken } from "@/lib/auth-utils"
import { getSalesforceConnection } from "@/lib/salesforce"
import { sendEmail } from "@/lib/email"
import { getRawTemplate } from "@/lib/email-templates"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ payrollId: string }> }
) {
  try {
    const { payrollId } = await params
    console.info("[API][PayslipEmail] Request received", { payrollId })

    const cookieStore = await cookies()
    const session = cookieStore.get("session")?.value

    if (!session) {
      console.warn("[API][PayslipEmail] Unauthorized - missing session", { payrollId })
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = await verifyToken(session)
    if (!payload) {
      console.warn("[API][PayslipEmail] Unauthorized - invalid session token", { payrollId })
      return NextResponse.json({ error: "Invalid session" }, { status: 401 })
    }

    const userRole = payload.role || ""
    const isPrivilegedUser = userRole === "Admin" || userRole === "HR"

    console.info("[API][PayslipEmail] Session verified", { payrollId, userEmail: payload.email, role: payload.role })

    const conn = await getSalesforceConnection()
    if (!conn) {
      console.error("[API][PayslipEmail] Salesforce connection failed", { payrollId })
      return NextResponse.json({ error: "Failed to connect to Salesforce" }, { status: 500 })
    }

    // Fetch only what's needed to identify the payroll, employee and locate the document
    // PAN__c is fetched server-side only for PDF password protection — never sent to client
    const payrollResult = await conn.query<any>(`
      SELECT 
        Id,
        Employee__c,
        Employee__r.Employee_Email__c,
        Employee__r.Company_Email__c,
        Employee__r.Employee_Id__c,
        Employee__r.Employee_Name__c,
        Employee__r.Name,
        Employee__r.Birthdate__c,
        Payroll_Month__c,
        Payroll_Summary__r.Status__c,
        Payroll_Summary__r.Payroll_Month__c,
        Payroll_Summary__r.Payroll_Year__c,
        CreatedDate
      FROM Payroll__c
      WHERE Id = '${payrollId}'
      LIMIT 1
    `)

    if (!payrollResult.records || payrollResult.records.length === 0) {
      console.warn("[API][PayslipEmail] Payroll record not found", { payrollId })
      return NextResponse.json({ error: "Payroll record not found" }, { status: 404 })
    }

    const payroll = payrollResult.records[0]
    const payrollOwnerEmail = payroll.Employee__r?.Employee_Email__c || ""
    const companyEmail = payroll.Employee__r?.Company_Email__c || ""
    const payrollSummaryStatus = String(payroll.Payroll_Summary__r?.Status__c || "").toLowerCase()

    // Security: employees can only email their own payslip
    if (!isPrivilegedUser && payload.email !== payrollOwnerEmail) {
      console.warn("[API][PayslipEmail] Forbidden - employee attempted email of another employee payslip", {
        payrollId,
        requester: payload.email,
        owner: payrollOwnerEmail,
      })
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (!isPrivilegedUser && payrollSummaryStatus !== "paid") {
      console.warn("[API][PayslipEmail] Blocked - payroll not marked paid", { payrollId })
      return NextResponse.json({ error: "Payslip is available only after payroll is marked as Paid" }, { status: 403 })
    }

    const employeeName = payroll.Employee__r?.Employee_Name__c || "Employee"
    const employeeId = payroll.Employee__r?.Employee_Id__c || payroll.Employee__r?.Name || ""
    const payrollMonth = payroll.Payroll_Summary__r?.Payroll_Month__c || payroll.Payroll_Month__c || ""
    const payrollYear = payroll.Payroll_Summary__r?.Payroll_Year__c || new Date().getFullYear()

    // Derive PDF password from birthdate in DDMMYYYY format (server-side only)
    const birthdateRaw: string = payroll.Employee__r?.Birthdate__c || ""
    let pdfPassword = ""
    if (birthdateRaw) {
      const dob = new Date(birthdateRaw)
      if (!isNaN(dob.getTime())) {
        const dd = String(dob.getUTCDate()).padStart(2, "0")
        const mm = String(dob.getUTCMonth() + 1).padStart(2, "0")
        const yyyy = String(dob.getUTCFullYear())
        pdfPassword = `${dd}${mm}${yyyy}`
      }
    }

    // Send to company email; fall back to personal email if company email is not set
    const recipientEmail = companyEmail || payrollOwnerEmail

    // Fetch the payslip PDF from Salesforce Document store
    const documentName = `Payslip_${employeeId}_${payrollMonth}_${payrollYear}`
    console.info("[API][PayslipEmail] Resolving payslip document", { payrollId, documentName })

    const documentResult = await conn.query<any>(`
      SELECT File_URL__c 
      FROM Document__c 
      WHERE Name = '${documentName}' 
      AND Document_Category__c = 'Payslip'
      LIMIT 1
    `)

    if (!documentResult.records || documentResult.records.length === 0) {
      console.warn("[API][PayslipEmail] Payslip PDF document not found", { payrollId, documentName })
      return NextResponse.json({ error: "Payslip PDF not found. Please contact HR." }, { status: 404 })
    }

    const pdfUrl = documentResult.records[0].File_URL__c
    if (!pdfUrl) {
      console.warn("[API][PayslipEmail] Payslip PDF URL is empty", { payrollId, documentName })
      return NextResponse.json({ error: "Payslip PDF URL is missing. Please contact HR." }, { status: 404 })
    }

    // Download the PDF server-side
    console.info("[API][PayslipEmail] Fetching PDF from storage", { payrollId })
    const pdfResponse = await fetch(pdfUrl)
    if (!pdfResponse.ok) {
      console.error("[API][PayslipEmail] Failed to fetch PDF from storage", {
        payrollId,
        status: pdfResponse.status,
        statusText: pdfResponse.statusText,
      })
      return NextResponse.json({ error: "Failed to retrieve payslip PDF. Please try again later." }, { status: 500 })
    }

    const rawPdfBytes = await pdfResponse.arrayBuffer()

    // The PDF stored in S3 is already AES-256 encrypted with the employee's
    // birthdate (DDMMYYYY) as the password — applied at payroll-save time.
    // We just attach it to the email as-is.
    const finalPdfBuffer = Buffer.from(rawPdfBytes)
    const isPdfPasswordProtected = Boolean(pdfPassword)

    const pdfFilename = `Payslip_${employeeName.replace(/\s+/g, "_")}_${payrollMonth}_${payrollYear}.pdf`

    // Build clean generic email body
    const emailBody = await buildPayslipNotificationEmail({
      employeeName,
      payrollMonth,
      payrollYear,
      isPdfPasswordProtected,
      hasBirthdate: Boolean(birthdateRaw),
    })

    // Send email with the PDF as an attachment
    await sendEmail({
      to: recipientEmail,
      subject: `Your Payslip for ${payrollMonth} ${payrollYear} – MV Clouds`,
      body: emailBody,
      isInfo: true,
      attachments: [
        {
          filename: pdfFilename,
          content: finalPdfBuffer,
          contentType: "application/pdf",
        },
      ],
    })

    console.info("[API][PayslipEmail] Payslip email sent successfully", {
      payrollId,
      recipientEmail,
      pdfFilename,
      sizeBytes: finalPdfBuffer.byteLength,
      isPdfPasswordProtected,
    })

    return NextResponse.json({ success: true, message: `Payslip sent to ${recipientEmail}` })
  } catch (error) {
    console.error("[API][PayslipEmail] Unhandled error", error)
    return NextResponse.json({ error: "Failed to send payslip email" }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// Email body builder – generic text only, no salary figures
// ---------------------------------------------------------------------------

interface PayslipNotificationData {
  employeeName: string
  payrollMonth: string
  payrollYear: number | string
  isPdfPasswordProtected: boolean
  hasBirthdate: boolean
}

async function buildPayslipNotificationEmail(data: PayslipNotificationData): Promise<string> {
  const { employeeName, payrollMonth, payrollYear, isPdfPasswordProtected, hasBirthdate } = data
  const currentYear = new Date().getFullYear()

  const passwordNote = isPdfPasswordProtected
    ? `<tr>
        <td style="padding: 0 30px 24px 30px;">
          <table cellpadding="0" cellspacing="0" border="0" style="width: 100%; background: #FFF8E1; border-radius: 8px; border-left: 4px solid #F59E0B;">
            <tbody>
              <tr>
                <td style="padding: 14px 18px; font-family: Verdana, Geneva, sans-serif; font-size: 13px; color: #78350F; line-height: 22px;">
                  <strong style="display: block; margin-bottom: 4px; color: #92400E;">🔒 Password Protected PDF</strong>
                  The attached payslip PDF is password-protected for your security.<br/>
                  <strong>Password: Your Date of Birth in DDMMYYYY format</strong> (e.g. 15081995)
                </td>
              </tr>
            </tbody>
          </table>
        </td>
      </tr>`
    : (!hasBirthdate
        ? `<tr>
        <td style="padding: 0 30px 24px 30px;">
          <table cellpadding="0" cellspacing="0" border="0" style="width: 100%; background: #FFF1F2; border-radius: 8px; border-left: 4px solid #F87171;">
            <tbody>
              <tr>
                <td style="padding: 14px 18px; font-family: Verdana, Geneva, sans-serif; font-size: 13px; color: #7F1D1D; line-height: 22px;">
                  ⚠️ Your date of birth is not on record. Please contact HR to update your profile so future payslips can be password-protected.
                </td>
              </tr>
            </tbody>
          </table>
        </td>
      </tr>`
        : "")

  // Fetch the template from Salesforce metadata (e.g. DeveloperName = 'Payslip_Notification')
  // The user will create a metadata record with DeveloperName 'Payslip_Notification'
  let template = await getRawTemplate("Payslip_Notification")

  if (!template) {
    console.warn("[Email Templates] Payslip_Notification template not found in metadata, using minimal fallback.")
    template = `
      <div style="font-family: sans-serif; line-height: 1.5;">
        <p>Dear {{employeeName}},</p>
        <p>Please find attached your salary payslip for <strong>{{payrollMonth}} {{payrollYear}}</strong>.</p>
        {{passwordNote}}
        <p>Regards,<br/>HR & Finance Team</p>
      </div>
    `
  }

  // Replace placeholders
  let html = template
  html = html.replace(/{{employeeName}}/g, employeeName)
  html = html.replace(/{{payrollMonth}}/g, payrollMonth)
  html = html.replace(/{{payrollYear}}/g, String(payrollYear))
  html = html.replace(/{{passwordNote}}/g, passwordNote)
  html = html.replace(/{{year}}/g, String(currentYear))

  return html
}
