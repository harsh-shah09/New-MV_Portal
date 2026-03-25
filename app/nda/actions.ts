'use server'

import puppeteer from 'puppeteer-core'
import chromium from '@sparticuz/chromium'

const LOCAL_CHROME_PATH: Record<string, string> = {
  darwin: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  linux: '/usr/bin/google-chrome',
  win32: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
}

export async function generateNDAPDF(htmlContent: string , isPayslip: boolean = false) {
  const isVercel = !!process.env.VERCEL_ENV

  const browser = await puppeteer.launch({
    args: isVercel ? chromium.args : ['--no-sandbox', '--disable-setuid-sandbox'],
    executablePath: isVercel
      ? await chromium.executablePath()
      : LOCAL_CHROME_PATH[process.platform],
    headless: true,
  })

  try {
    const page = await browser.newPage()
    await page.setContent(htmlContent, { waitUntil: 'load' })

    const pdfBuffer = await page.pdf({
      path : undefined,
      format: 'A4',
      printBackground: true,
      margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
    })

    return isPayslip ? Buffer.from(pdfBuffer) : Buffer.from(pdfBuffer).toString('base64')
  } catch (error) {
    console.error('PDF generation error:', error)
    throw new Error('Failed to generate PDF')
  } finally {
    await browser.close()
  }
}