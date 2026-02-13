'use server'

import puppeteer from 'puppeteer'

export async function generateNDAPDF(htmlContent: string) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })

  try {
    const page = await browser.newPage()
    
    // Set the content
    // We assume htmlContent is a complete HTML string or at least has what's needed.
    // We can wrap it in a basic structure to ensure encoding is correct if needed, 
    // but usually the template provides it.
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' })
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      }
    })

    // Return as base64 string
    return Buffer.from(pdfBuffer).toString('base64')
  } catch (error) {
    console.error('Data generation error:', error);
    throw new Error('Failed to generate PDF');
  } finally {
    await browser.close()
  }
}
