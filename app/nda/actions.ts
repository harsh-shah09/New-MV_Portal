'use server'

import puppeteer, { Browser } from 'puppeteer-core'
import chromium from '@sparticuz/chromium'

const LOCAL_CHROME_PATH: Record<string, string> = {
  darwin: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  linux: '/usr/bin/google-chrome',
  win32: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
}

let cachedBrowser: Browser | null = null;
let browserLaunchPromise: Promise<Browser> | null = null;

async function getBrowser(): Promise<Browser> {
  if (cachedBrowser && cachedBrowser.connected) {
    return cachedBrowser;
  }

  if (browserLaunchPromise) {
    return browserLaunchPromise;
  }

  const isProduction = process.env.NODE_ENV === 'production'
  
  browserLaunchPromise = puppeteer.launch({
    args: isProduction ? chromium.args : ['--no-sandbox', '--disable-setuid-sandbox'],
    executablePath: isProduction
      ? await chromium.executablePath()
      : LOCAL_CHROME_PATH[process.platform],
    headless: true,
  }).then(browser => {
    cachedBrowser = browser;
    browserLaunchPromise = null;
    return browser;
  }).catch(error => {
    browserLaunchPromise = null;
    throw error;
  });

  return browserLaunchPromise;
}

export async function generateNDAPDF(htmlContent: string , isPayslip: boolean = false) {
  const browser = await getBrowser()
  let page;
  
  try {
    page = await browser.newPage()
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
    if (page) {
      await page.close().catch(console.error)
    }
  }
}