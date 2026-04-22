import puppeteer from 'puppeteer'
import type { Browser } from 'puppeteer'
import fs from 'fs'
import path from 'path'
import { generateNDAPDF } from '@/app/nda/actions'
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
  Employee_Id__c?: string
  email: string
  department: string
  role: string
  dateOfJoining?: string
  bankName?: string
  accountNumber?: string
  designation?: string
  pfNumber?: string
  uanNumber?: string
  esiNumber?: string
  payrollMonth: string
  payrollYear: number
  monthlyIncome?: number
  actualMonthlyIncome?: number
  basicSalary: number
  actualBasicComponent?: number
  actualHraComponent?: number
  actualConvComponent?: number
  actualSpecialAllowanceComponent?: number
  actualPerformanceComponent?: number
  actualGrossIncome?: number
  basicComponent?: number
  hraComponent?: number
  convComponent?: number
  specialAllowanceComponent?: number
  performanceComponent?: number
  grossIncome?: number
  pfDeduction?: number
  ptDeduction?: number
  esiDeduction?: number
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
  WD?: number
  WO?: number
  PH?: number
  PD?: number
  CL?: number
  PL?: number
  SL?: number
  LWP?: number
  holidayDates?: string[]
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
    const pdfBuffer = await generateNDAPDF(html, true)

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
  const formatMoney = (value?: number | null) => {
    const rounded = Math.round(Number(value) || 0)
    return `₹${rounded.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const formatDayCount = (value: number) => {
    const safeValue = Number.isFinite(value) ? value : 0
    return Number.isInteger(safeValue) ? `${safeValue}` : safeValue.toFixed(1)
  }

  const basicComponent = payslip.basicComponent ?? 0
  const hraComponent = payslip.hraComponent ?? 0
  const convComponent = payslip.convComponent ?? 0
  const specialAllowanceComponent = payslip.specialAllowanceComponent ?? 0
  const performanceComponent = payslip.performanceComponent ?? 0
  const actualMonthlyIncome = payslip.actualMonthlyIncome ?? (payslip.monthlyIncome ?? payslip.basicSalary)
  const actualBasicComponent = payslip.actualBasicComponent ?? basicComponent
  const actualHraComponent = payslip.actualHraComponent ?? hraComponent
  const actualConvComponent = payslip.actualConvComponent ?? convComponent
  const actualSpecialAllowanceComponent = payslip.actualSpecialAllowanceComponent ?? specialAllowanceComponent
  const actualPerformanceComponent = payslip.actualPerformanceComponent ?? performanceComponent
  const actualGrossEarnings = payslip.actualGrossIncome
    || (actualBasicComponent + actualHraComponent + actualConvComponent + actualSpecialAllowanceComponent + actualPerformanceComponent)
  const grossEarnings = payslip.grossIncome || (basicComponent + hraComponent + convComponent + specialAllowanceComponent + performanceComponent)
  const monthlyIncome = payslip.monthlyIncome ?? payslip.basicSalary
  const pfDeduction = payslip.pfDeduction ?? 0
  const ptDeduction = payslip.ptDeduction ?? 0
  const esiDeduction = payslip.esiDeduction ?? 0
  const salaryStructureDeductions = pfDeduction + ptDeduction + esiDeduction
  const formatDisplayDate = (dateValue?: string) => {
    if (!dateValue) {
      return ''
    }

    const parsedDate = new Date(dateValue)
    if (Number.isNaN(parsedDate.getTime())) {
      return dateValue
    }

    return parsedDate.toLocaleDateString('en-GB')
  }

  const normalizeLabel = (value?: string) => (value || '').toLowerCase().trim().replace(/\s+/g, ' ')
  const normalizeCategory = (value?: string) => (value || '').toLowerCase().trim().replace(/\s+/g, '-')
  const leaves = Array.isArray(payslip.leaves) ? payslip.leaves : []
  const leaveDays = (leave: Leave) => Number(leave.daysAfterRuleInMonth ?? leave.daysInSelectedMonth ?? 0) || 0

  const sumLeaveDays = (predicate: (leave: Leave) => boolean) =>
    Math.round(
      leaves
        .filter(predicate)
        .reduce((sum, leave) => sum + leaveDays(leave), 0) * 10
    ) / 10

  const isLossOfPay = (leave: Leave) => normalizeCategory(leave.leaveCategory) === 'loss-of-pay'

  const monthNames = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december',
  ]
  const monthIndex = monthNames.indexOf((payslip.payrollMonth || '').toLowerCase())
  const payrollYear = Number(payslip.payrollYear)
  const hasValidPeriod = monthIndex >= 0 && Number.isFinite(payrollYear)

  const monthStart = hasValidPeriod ? new Date(payrollYear, monthIndex, 1) : null
  const monthEnd = hasValidPeriod ? new Date(payrollYear, monthIndex + 1, 0) : null

  const toISODate = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const holidayDateSet = new Set(
    (payslip.holidayDates || [])
      .map((item) => String(item || '').slice(0, 10))
      .filter(Boolean)
  )

  let weekendCount = 0
  const weekendDateSet = new Set<string>()
  if (monthStart && monthEnd) {
    for (let day = 1; day <= monthEnd.getDate(); day++) {
      const currentDate = new Date(payrollYear, monthIndex, day)
      const dayOfWeek = currentDate.getDay()
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        weekendCount += 1
        weekendDateSet.add(toISODate(currentDate))
      }
    }
  }

  const publicHolidayCount = monthStart && monthEnd
    ? Array.from(holidayDateSet).filter((dateKey) => {
        const currentDate = new Date(dateKey)
        if (Number.isNaN(currentDate.getTime())) return false
        const currentMonth = currentDate.getMonth()
        const currentYear = currentDate.getFullYear()
        return currentMonth === monthIndex && currentYear === payrollYear
      }).length
    : holidayDateSet.size

  const nonWorkingDateSet = new Set<string>([...weekendDateSet, ...holidayDateSet])

  const countLeaves = (predicate: (leave: Leave) => boolean) => leaves.filter(predicate).length
  const calculatedPL = sumLeaveDays((leave) => normalizeLabel(leave.leaveType) === 'planned leave')
  const calculatedSL = countLeaves((leave) => {
    const type = normalizeLabel(leave.leaveType)
    return type === 'sick leave' || type === 'emergency leave'
  })
  const calculatedLWP = calculatedPL + calculatedSL
  const calculatedExtraDayPay = sumLeaveDays((leave) => normalizeCategory(leave.leaveCategory) === 'extra-day-pay')
  const calculatedWO = weekendCount
  const calculatedPH = publicHolidayCount
  const calculatedWD = Math.max(0, (Number(payslip.daysInMonth) || 0) - nonWorkingDateSet.size)

  const wd = Number.isFinite(Number(payslip.WD)) ? Number(payslip.WD) : calculatedWD
  const wo = Number.isFinite(Number(payslip.WO)) ? Number(payslip.WO) : calculatedWO
  const ph = Number.isFinite(Number(payslip.PH)) ? Number(payslip.PH) : calculatedPH
  const pl = Number.isFinite(Number(payslip.PL)) ? Number(payslip.PL) : calculatedPL
  const sl = Number.isFinite(Number(payslip.SL)) ? Number(payslip.SL) : calculatedSL
  const lwp = Number.isFinite(Number(payslip.LWP)) ? Number(payslip.LWP) : calculatedLWP

  const workingDetailsRows = [
    { label: 'WD', value: formatDayCount(wd) },
    { label: 'WO', value: formatDayCount(wo) },
    { label: 'PH', value: formatDayCount(ph) },
    { label: 'PL', value: formatDayCount(pl) },
    { label: 'SL', value: formatDayCount(sl) },
    { label: 'LWP', value: formatDayCount(lwp) },
  ]

  const employeeDetails = [
    { label: 'Emp. Id', value: payslip.Employee_Id__c || payslip.employeeId },
    { label: 'Emp Name', value: payslip.employeeName },
    { label: 'Department', value: payslip.department || 'N/A' },
    { label: 'P.F. No', value: payslip.pfNumber || 'N/A' },
    { label: 'UAN No', value: payslip.uanNumber || 'N/A' },
    { label: 'ESI No', value: payslip.esiNumber || 'N/A' },
    { label: 'Bank', value: payslip.bankName || 'N/A' },
    { label: 'A/C No', value: payslip.accountNumber || 'N/A' },
    { label: 'D.O.J.', value: formatDisplayDate(payslip.dateOfJoining) || 'N/A' },
  ]

  const earningRows = [
    { label: 'Basic', actual: actualBasicComponent, payable: basicComponent },
    { label: 'HRA', actual: actualHraComponent, payable: hraComponent },
    { label: 'Conveyance', actual: actualConvComponent, payable: convComponent },
    { label: 'Special Allowance', actual: actualSpecialAllowanceComponent, payable: specialAllowanceComponent },
    { label: 'Performance', actual: actualPerformanceComponent, payable: performanceComponent },
  ]

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
    @page { size: A4 landscape; margin: 12mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; background: white; color: #111827; }
    .container { width: 100%; border: 1px solid #e5e7eb; }
    .header { display: flex; justify-content: space-between; padding: 12px 16px; border-bottom: 2px solid #e5e7eb; }
    .company-info { display: flex; align-items: center; gap: 15px; }
    .logo { width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; }
    .logo img { width: 44px; height: 44px; object-fit: contain; }
    .company-details h1 { font-size: 18px; color: #111827; }
    .company-details p { font-size: 10px; color: #6b7280; margin-top: 2px; }
    .period-info { text-align: right; }
    .period-info p:first-child { font-size: 10px; color: #6b7280; }
    .period-info p:last-child { font-size: 18px; font-weight: bold; color: #111827; margin-top: 2px; }
    .content { padding: 12px 16px 12px; }
    .top-grid { display: grid; grid-template-columns: 2.45fr 1fr; gap: 10px; margin-bottom: 10px; }
    .details-box { border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
    .details-box h2 { font-size: 12px; font-weight: 700; color: #111827; padding: 7px 10px; background: #f9fafb; border-bottom: 1px solid #e5e7eb; }
    .details-grid { display: grid; grid-template-columns: 1fr 1fr; }
    .details-item { display: flex; align-items: center; gap: 4px; padding: 6px 10px; border-bottom: 1px solid #e5e7eb; min-height: 28px; }
    .details-item:nth-last-child(-n+2) { border-bottom: none; }
    .details-item:nth-child(odd) { border-right: 1px solid #e5e7eb; }
    .details-label { width: 78px; color: #6b7280; font-size: 11px; }
    .details-value { color: #111827; font-size: 11px; font-weight: 600; }
    .net-pay-box { background: #f0fdf4; border-left: 4px solid #22c55e; padding: 12px; border-radius: 8px; }
    .net-pay-box .amount { font-size: 22px; font-weight: bold; color: #111827; margin-bottom: 4px; }
    .net-pay-box .label { font-size: 10px; color: #6b7280; margin-bottom: 9px; }
    .net-pay-details { border-top: 1px solid #22c55e40; padding-top: 9px; }
    .net-pay-details .detail-row { display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 4px; }
    .earnings-deductions { border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; margin-bottom: 10px; }
    .ed-header { display: grid; grid-template-columns: 0.8fr 1.1fr 1fr; background: #f9fafb; border-bottom: 1px solid #e5e7eb; }
    .ed-header > div { padding: 8px 10px; font-weight: bold; font-size: 11px; color: #111827; }
    .ed-header > div { border-right: 1px solid #e5e7eb; }
    .ed-header > div:last-child { border-right: none; }
    .ed-content { display: grid; grid-template-columns: 0.8fr 1.1fr 1fr; }
    .ed-totals { display: grid; grid-template-columns: 0.8fr 1.1fr 1fr; border-top: 1px solid #e5e7eb; background: #f9fafb; }
    .ed-total-cell { border-right: 1px solid #e5e7eb; }
    .ed-total-cell:last-child { border-right: none; }
    .ed-column { border-right: 1px solid #e5e7eb; }
    .ed-column:last-child { border-right: none; }
    .ed-row { display: grid; grid-template-columns: 1fr auto; padding: 7px 10px; border-bottom: 1px solid #e5e7eb; }
    .ed-row.total { background: #f9fafb; font-weight: bold; border-bottom: none; }
    .ed-label { color: #111827; font-size: 11px; }
    .ed-amount { color: #111827; text-align: right; font-size: 11px; }
    .earnings-three-head { display: grid; grid-template-columns: 1.35fr 1fr 1fr; padding: 7px 10px; background: #f9fafb; border-bottom: 1px solid #e5e7eb; font-weight: 700; font-size: 11px; color: #111827; }
    .earnings-three-row { display: grid; grid-template-columns: 1.35fr 1fr 1fr; padding: 7px 10px; border-bottom: 1px solid #e5e7eb; font-size: 11px; }
    .earnings-three-row.total { background: #f9fafb; font-weight: 700; border-bottom: none; }
    .earnings-three-row .amount-col { text-align: right; }
    .net-payable { background: #f0fdf4; border-radius: 8px; padding: 10px 12px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; }
    .net-payable-label h3 { font-size: 14px; font-weight: bold; color: #111827; }
    .net-payable-label p { font-size: 10px; color: #6b7280; margin-top: 2px; }
    .net-payable-amount { font-size: 20px; font-weight: bold; color: #111827; }
    .leave-section h3 { font-size: 16px; font-weight: bold; color: #111827; margin-bottom: 10px; }
    .leave-note { font-size: 12px; color: #f59e0b; margin-bottom: 15px; }
    table { width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; margin-bottom: 30px; }
    th, td { padding: 10px; text-align: left; border: 1px solid #e5e7eb; font-size: 12px; }
    th { background: #f9fafb; font-weight: bold; color: #111827; }
    .footer { text-align: center; padding-top: 6px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #6b7280; }
    .footer p { margin-bottom: 4px; }
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
      <div class="top-grid">
        <div class="details-box">
          <h2>EMPLOYEE DETAILS</h2>
          <div class="details-grid">
            ${employeeDetails.map((field) => `
            <div class="details-item">
              <span class="details-label">${field.label}</span>
              <span class="details-value">: ${field.value || ''}</span>
            </div>
            `).join('')}
          </div>
        </div>

        <div class="net-pay-box">
          <div class="amount">${formatMoney(payslip.netSalary)}</div>
          <div class="label">Total Net Pay</div>
          <div class="net-pay-details">
            <div class="detail-row">
              <span>LOP Days</span>
              <span>: ${formatDayCount(lwp)}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="earnings-deductions">
        <div class="ed-header">
        <div>WORKING DETAILS</div>
        <div class="earnings-three-head">
            <span>Earning</span>
            <span style="text-align:right;">Actual</span>
            <span style="text-align:right;">Payable</span>
        </div>          
        <div>DEDUCTIONS</div>
        </div>
        <div class="ed-content">
          <div class="ed-column">
            ${workingDetailsRows.map((row) => `
            <div class="ed-row">
              <span class="ed-label">${row.label}</span>
              <span class="ed-amount">${row.value}</span>
            </div>
            `).join('')}
          </div>
          <div class="ed-column">
            
            ${earningRows.map((row) => `
            <div class="earnings-three-row">
              <span>${row.label}</span>
              <span class="amount-col">${formatMoney(row.actual)}</span>
              <span class="amount-col">${formatMoney(row.payable)}</span>
            </div>
            `).join('')}
            ${payslip.bonus > 0 ? `
            <div class="earnings-three-row">
              <span>Bonus</span>
              <span class="amount-col">${formatMoney(payslip.bonus)}</span>
              <span class="amount-col">${formatMoney(payslip.bonus)}</span>
            </div>
            ` : ''}
            ${(payslip.anniversaryBonus || 0) > 0 ? `
            <div class="earnings-three-row">
              <span>Anniversary Bonus</span>
              <span class="amount-col">${formatMoney(payslip.anniversaryBonus || 0)}</span>
              <span class="amount-col">${formatMoney(payslip.anniversaryBonus || 0)}</span>
            </div>
            ` : ''}
            ${payslip.adjustments?.filter(a => a.adjustmentType === 'Addition').map(adj => `
            <div class="earnings-three-row">
              <span>Other</span>
              <span class="amount-col">${formatMoney(adj.adjustmentAmount)}</span>
              <span class="amount-col">${formatMoney(adj.adjustmentAmount)}</span>
            </div>
            `).join('') || ''}
          </div>
          <div class="ed-column">
            <div class="ed-row">
              <span class="ed-label">PF Deduction</span>
              <span class="ed-amount">${formatMoney(pfDeduction)}</span>
            </div>
            <div class="ed-row">
              <span class="ed-label">PT Deduction</span>
              <span class="ed-amount">${formatMoney(ptDeduction)}</span>
            </div>
            <div class="ed-row">
              <span class="ed-label">ESI Deduction</span>
              <span class="ed-amount">${formatMoney(esiDeduction)}</span>
            </div>
            ${(payslip.companySecurityDeduction || 0) > 0 ? `
            <div class="ed-row">
              <span class="ed-label">Company Security Deduction</span>
              <span class="ed-amount">${formatMoney(payslip.companySecurityDeduction || 0)}</span>
            </div>
            ` : ''}
            ${payslip.adjustments?.filter(a => a.adjustmentType === 'Deduction').map(adj => `
            <div class="ed-row">
              <span class="ed-label">Other</span>
              <span class="ed-amount">${formatMoney(adj.adjustmentAmount)}</span>
            </div>
            `).join('') || ''}
          </div>
        </div>
        <div class="ed-totals">
          <div class="ed-total-cell">
            <div class="ed-row total">
              <span class="ed-label">Days In Month</span>
              <span class="ed-amount">${formatDayCount(Number(payslip.daysInMonth) || 0)}</span>
            </div>
          </div>
          <div class="ed-total-cell">
            <div class="earnings-three-row total">
              <span>Gross Earnings</span>
              <span class="amount-col">${formatMoney(actualGrossEarnings)}</span>
              <span class="amount-col">${formatMoney(grossEarnings)}</span>
            </div>
          </div>
          <div class="ed-total-cell">
            <div class="ed-row total">
              <span class="ed-label">Gross Deductions</span>
              <span class="ed-amount">${formatMoney(payslip.totalDeductions)}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="net-payable">
        <div class="net-payable-label">
          <h3>TOTAL NET PAYABLE</h3>
          <p>Gross Earnings - Total Deductions</p>
        </div>
        <div class="net-payable-amount">${formatMoney(payslip.netSalary)}</div>
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
