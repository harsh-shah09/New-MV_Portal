'use server'

import puppeteer, { Browser } from 'puppeteer-core'
import chromium from '@sparticuz/chromium'
import fs from 'fs'
import path from 'path'

const LOCAL_CHROME_PATH: Record<string, string> = {
  darwin: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  linux: '/usr/bin/google-chrome',
  win32: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
}

let cachedBrowser: Browser | null = null;
let browserLaunchPromise: Promise<Browser> | null = null;
let cachedExecutablePath: string | null = null;
let executablePathPromise: Promise<string> | null = null;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const resolveExecutablePath = async (): Promise<string> => {
  if (cachedExecutablePath) {
    return cachedExecutablePath
  }

  if (executablePathPromise) {
    return executablePathPromise
  }

  const isProduction = process.env.NODE_ENV === 'production'

  executablePathPromise = (async () => {
    if (!isProduction) {
      const localPath = LOCAL_CHROME_PATH[process.platform]
      if (!localPath) {
        throw new Error(`Unsupported platform: ${process.platform}`)
      }
      cachedExecutablePath = localPath
      return localPath
    }

    const chromiumPath = await chromium.executablePath()
    if (!chromiumPath) {
      throw new Error('Chromium executable path could not be resolved')
    }

    const targetPath = path.join('/tmp', `chromium-${process.pid}`)
    try {
      await fs.promises.access(targetPath, fs.constants.X_OK)
      cachedExecutablePath = targetPath
      return targetPath
    } catch {
      // fall through to copy
    }

    const tempPath = `${targetPath}-${Date.now()}`
    await fs.promises.copyFile(chromiumPath, tempPath)
    await fs.promises.chmod(tempPath, 0o755)
    await fs.promises.rename(tempPath, targetPath)
    cachedExecutablePath = targetPath
    return targetPath
  })().finally(() => {
    executablePathPromise = null
  })

  return executablePathPromise
}

async function getBrowser(): Promise<Browser> {
  if (cachedBrowser && cachedBrowser.connected) {
    return cachedBrowser;
  }

  if (browserLaunchPromise) {
    return browserLaunchPromise;
  }

  const isProduction = process.env.NODE_ENV === 'production'

  browserLaunchPromise = (async () => {
    const executablePath = await resolveExecutablePath()
    const launchArgs = isProduction ? chromium.args : ['--no-sandbox', '--disable-setuid-sandbox']
    const maxAttempts = 3
    let lastError: unknown

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const browser = await puppeteer.launch({
          args: launchArgs,
          executablePath,
          headless: true,
        })
        return browser
      } catch (error: any) {
        lastError = error
        const errorCode = error?.code || error?.cause?.code
        if (errorCode === 'ETXTBSY' && attempt < maxAttempts) {
          await delay(attempt * 300)
          continue
        }
        throw error
      }
    }

    throw lastError || new Error('Failed to launch Chromium')
  })()
    .then((browser) => {
      cachedBrowser = browser
      return browser
    })
    .finally(() => {
      browserLaunchPromise = null
    })

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