import puppeteer from 'puppeteer'
import type { Browser } from 'puppeteer'
import fs from 'fs'
import path from 'path'
import {generateNDAPDF} from '@/app/nda/actions'
interface Leave {
  id: string
  leaveType: string
  leaveCategory: string
  startDate: string
  endDate: string
  totalDays: number
  totalDaysAfterRule: number
  daysInSelectedMonth: number
  daysAfterRuleInMonth: number
  actualDeduction: number
  afterRuleDeduction: number
  status: string
  onePlusTwoRuleApplied?: boolean
  sandwichRuleApplied?: boolean
}

interface Adjustment {
  adjustmentType: "Addition" | "Deduction"
  adjustmentAmount: number
  adjustmentDescription: string
}

interface PayslipData {
  employeeName: string
  employeeId: string
  email: string
  department: string
  role: string
  payrollMonth: string
  payrollYear: number
  basicSalary: number
  bonus: number
  anniversaryBonus?: number
  totalAdditions: number
  totalDeductions: number
  companySecurityDeduction?: number
  netSalary: number
  totalLeaveDays: number
  totalLeaveDaysAfterRule: number
  totalLeaveDeductions: number
  leaves: Leave[]
  adjustments: Adjustment[]
  daysInMonth: number
}

let browserInstance: Browser | null = null
let browserLaunching: Promise<Browser> | null = null

const launchBrowser = async (): Promise<Browser> => {
  const maxAttempts = 3
  let lastError: unknown

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.info('[PDF] Launching browser', { attempt })
      const browser = await puppeteer.launch({
        headless: true,
        timeout: 60000,
        protocolTimeout: 120000,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-zygote',
          '--single-process'
        ]
      })
      console.info('[PDF] Browser launched successfully', { attempt })
      return browser
    } catch (error) {
      lastError = error
      console.error('[PDF] Browser launch failed', { attempt, error })
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 1000))
      }
    }
  }

  throw lastError || new Error('Failed to launch browser')
}

const getBrowser = async (): Promise<Browser> => {
  if (browserInstance && browserInstance.connected) {
    return browserInstance
  }

  if (!browserLaunching) {
    browserLaunching = launchBrowser()
      .then((browser) => {
        browserInstance = browser
        return browser
      })
      .finally(() => {
        browserLaunching = null
      })
  }

  return browserLaunching
}

export async function generatePayslipPDF(payslipData: PayslipData): Promise<Buffer> {

  try {
    // Generate HTML for the payslip
    const html = generatePayslipHTML(payslipData)
    const pdfBuffer = await generateNDAPDF(html , true)
    
    return pdfBuffer as Buffer;
  } catch (error) {
    console.error('[PDF] PDF generation failed', {
      employeeId: payslipData.employeeId,
      employeeName: payslipData.employeeName,
      payrollMonth: payslipData.payrollMonth,
      payrollYear: payslipData.payrollYear,
      error,
    })
    throw error
  } 
}

function generatePayslipHTML(payslip: PayslipData): string {
  // Calculate extra day pay
  const adjustmentAdditions = payslip.adjustments
    ?.filter(a => a.adjustmentType === 'Addition')
    .reduce((sum, a) => sum + a.adjustmentAmount, 0) || 0
  const extraDayPay = payslip.totalAdditions - payslip.bonus - (payslip.anniversaryBonus || 0) - adjustmentAdditions

  const grossEarnings = payslip.basicSalary + (payslip.totalAdditions || 0)

  // Read and encode logo as base64
  let logoBase64 = ''
  try {
    const logoPath = path.join(process.cwd(), 'public', 'mv_logo1.png')
    const logoBuffer = fs.readFileSync(logoPath)
    logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`
  } catch (error) {
    console.error('Error reading logo:', error)
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; padding: 20px; background: white; }
    .container { max-width: 900px; margin: 0 auto; border: 1px solid #e5e7eb; }
    .header { display: flex; justify-content: space-between; padding: 30px; border-bottom: 2px solid #e5e7eb; }
    .company-info { display: flex; align-items: center; gap: 15px; }
    .logo { width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; }
    .logo img { width: 60px; height: 60px; object-fit: contain; }
    .company-details h1 { font-size: 24px; color: #111827; }
    .company-details p { font-size: 12px; color: #6b7280; margin-top: 4px; }
    .period-info { text-align: right; }
    .period-info p:first-child { font-size: 12px; color: #6b7280; }
    .period-info p:last-child { font-size: 24px; font-weight: bold; color: #111827; margin-top: 4px; }
    .content { padding: 30px; }
    .summary-section { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px; }
    .summary-box h2 { font-size: 16px; font-weight: bold; color: #111827; margin-bottom: 15px; }
    .info-row { display: flex; margin-bottom: 10px; }
    .info-label { color: #6b7280; width: 140px; }
    .info-value { color: #111827; }
    .net-pay-box { background: #f0fdf4; border-left: 4px solid #22c55e; padding: 25px; border-radius: 8px; }
    .net-pay-box .amount { font-size: 36px; font-weight: bold; color: #111827; margin-bottom: 8px; }
    .net-pay-box .label { font-size: 12px; color: #6b7280; margin-bottom: 15px; }
    .net-pay-details { border-top: 1px solid #22c55e40; padding-top: 15px; }
    .net-pay-details .detail-row { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 8px; }
    .earnings-deductions { border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; margin-bottom: 30px; }
    .ed-header { display: grid; grid-template-columns: 1fr 1fr; background: #f9fafb; border-bottom: 1px solid #e5e7eb; }
    .ed-header > div { padding: 15px; font-weight: bold; color: #111827; }
    .ed-header > div:first-child { border-right: 1px solid #e5e7eb; }
    .ed-content { display: grid; grid-template-columns: 1fr 1fr; }
    .ed-column { border-right: 1px solid #e5e7eb; }
    .ed-column:last-child { border-right: none; }
    .ed-row { display: grid; grid-template-columns: 1fr auto; padding: 12px 15px; border-bottom: 1px solid #e5e7eb; }
    .ed-row.total { background: #f9fafb; font-weight: bold; border-bottom: none; }
    .ed-label { color: #111827; }
    .ed-amount { color: #111827; text-align: right; }
    .net-payable { background: #f0fdf4; border-radius: 8px; padding: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; }
    .net-payable-label h3 { font-size: 18px; font-weight: bold; color: #111827; }
    .net-payable-label p { font-size: 12px; color: #6b7280; margin-top: 4px; }
    .net-payable-amount { font-size: 30px; font-weight: bold; color: #111827; }
    .leave-section h3 { font-size: 16px; font-weight: bold; color: #111827; margin-bottom: 10px; }
    .leave-note { font-size: 12px; color: #f59e0b; margin-bottom: 15px; }
    table { width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; margin-bottom: 30px; }
    th, td { padding: 10px; text-align: left; border: 1px solid #e5e7eb; font-size: 12px; }
    th { background: #f9fafb; font-weight: bold; color: #111827; }
    .footer { text-align: center; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
    .footer p { margin-bottom: 8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="company-info">
        <div class="logo">
          ${logoBase64 ? `<img src="${logoBase64}" alt="MV Logo" />` : '<span style="font-size: 24px; font-weight: bold;">MV</span>'}
        </div>
        <div class="company-details">
          <h1>MV Clouds</h1>
          <p>D-404 Synthesis the first Ahmedabad India</p>
        </div>
      </div>
      <div class="period-info">
        <p>Payslip For the Month</p>
        <p>${payslip.payrollMonth} ${payslip.payrollYear}</p>
      </div>
    </div>

    <div class="content">
      <div class="summary-section">
        <div class="summary-box">
          <h2>EMPLOYEE SUMMARY</h2>
          <div class="info-row">
            <span class="info-label">Employee Name</span>
            <span class="info-value">: ${payslip.employeeName}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Employee ID</span>
            <span class="info-value">: ${payslip.employeeId.slice(0, 15)}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Department</span>
            <span class="info-value">: ${payslip.department || 'N/A'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Pay Period</span>
            <span class="info-value">: ${payslip.payrollMonth} ${payslip.payrollYear}</span>
          </div>
        </div>

        <div class="net-pay-box">
          <div class="amount">₹${payslip.netSalary.toLocaleString()}</div>
          <div class="label">Total Net Pay</div>
          <div class="net-pay-details">
            <div class="detail-row">
              <span>Paid Days</span>
              <span>: ${payslip.daysInMonth}</span>
            </div>
            <div class="detail-row">
              <span>LOP Days</span>
              <span>: ${payslip.totalLeaveDaysAfterRule?.toFixed(1) || payslip.totalLeaveDays || 0}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="earnings-deductions">
        <div class="ed-header">
          <div>EARNINGS</div>
          <div>DEDUCTIONS</div>
        </div>
        <div class="ed-content">
          <div class="ed-column">
            <div class="ed-row">
              <span class="ed-label">Basic</span>
              <span class="ed-amount">₹${payslip.basicSalary.toLocaleString()}</span>
            </div>
            ${payslip.bonus > 0 ? `
            <div class="ed-row">
              <span class="ed-label">Bonus</span>
              <span class="ed-amount">₹${payslip.bonus.toLocaleString()}</span>
            </div>
            ` : ''}
            ${(payslip.anniversaryBonus || 0) > 0 ? `
            <div class="ed-row">
              <span class="ed-label">Anniversary Bonus</span>
              <span class="ed-amount">₹${(payslip.anniversaryBonus || 0).toLocaleString()}</span>
            </div>
            ` : ''}
            ${extraDayPay > 0 ? `
            <div class="ed-row">
              <span class="ed-label">Extra Day Pay</span>
              <span class="ed-amount">₹${extraDayPay.toLocaleString()}</span>
            </div>
            ` : ''}
            ${payslip.adjustments?.filter(a => a.adjustmentType === 'Addition').map(adj => `
            <div class="ed-row">
              <span class="ed-label">${adj.adjustmentDescription || 'Allowance'}</span>
              <span class="ed-amount">₹${adj.adjustmentAmount.toLocaleString()}</span>
            </div>
            `).join('') || ''}
            <div class="ed-row total">
              <span class="ed-label">Gross Earnings</span>
              <span class="ed-amount">₹${grossEarnings.toLocaleString()}</span>
            </div>
          </div>
          <div class="ed-column">
            ${payslip.totalLeaveDeductions > 0 ? `
            <div class="ed-row">
              <span class="ed-label">Leave Deduction</span>
              <span class="ed-amount">₹${payslip.totalLeaveDeductions.toLocaleString()}</span>
            </div>
            ` : ''}
            ${(payslip.companySecurityDeduction || 0) > 0 ? `
            <div class="ed-row">
              <span class="ed-label">Company Security Deduction</span>
              <span class="ed-amount">₹${(payslip.companySecurityDeduction || 0).toLocaleString()}</span>
            </div>
            ` : ''}
            ${payslip.adjustments?.filter(a => a.adjustmentType === 'Deduction').map(adj => `
            <div class="ed-row">
              <span class="ed-label">${adj.adjustmentDescription || 'Deduction'}</span>
              <span class="ed-amount">₹${adj.adjustmentAmount.toLocaleString()}</span>
            </div>
            `).join('') || ''}
            <div class="ed-row total">
              <span class="ed-label">Total Deductions</span>
              <span class="ed-amount">₹${payslip.totalDeductions.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="net-payable">
        <div class="net-payable-label">
          <h3>TOTAL NET PAYABLE</h3>
          <p>Gross Earnings - Total Deductions</p>
        </div>
        <div class="net-payable-amount">₹${payslip.netSalary.toLocaleString()}</div>
      </div>

      <div class="footer">
        <p>This is a computer-generated payslip and does not require a signature.</p>
        <p>For queries, please contact HR department.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `
}
