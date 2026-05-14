import { NextResponse } from 'next/server';
import chromium from '@sparticuz/chromium';
import { chromium as playwright } from 'playwright-core';

const globalPlaywright = global as any;
if (!globalPlaywright.sfSessions) {
  globalPlaywright.sfSessions = {};
}

const sessions: Record<string, any> = globalPlaywright.sfSessions;

async function resetSecurityToken(page: any) {
  const currentUrl = new URL(page.url());
  const baseDomain = currentUrl.origin;

  await page.goto(`${baseDomain}/_ui/system/security/ResetApiTokenEdit`);
  
  // // Refresh the page
  // await page.reload();
  
  try {
    // Wait for the page/iframe to fully load
    await page.waitForTimeout(8000); 
    
    const btnSelector = 'input[value="Reset Security Token"][type="submit"]';

    let clicked = false;
    // Check main frame
    if (await page.locator(btnSelector).count() > 0) {
       await page.locator(btnSelector).click();
       clicked = true;
    } else {
       // Search inside iframes (Lightning setup loads in iframes)
       for (const frame of page.frames()) {
          if (await frame.locator(btnSelector).count() > 0) {
             await frame.locator(btnSelector).click();
             clicked = true;
             break;
          }
       }
    }
    
    if (clicked) {
       // Wait for the token reset action to finish processing
       await page.waitForTimeout(4000);
    }
  } catch(e) {
    console.log("Error clicking reset button:", e);
  }
}

export async function POST(req: Request) {
  const body = await req.json();
  const { action } = body;

  try {
    if (action === 'start') {
      const { envUrl, username, password } = body;
      const sessionId = Date.now().toString();

      const executablePath = await chromium.executablePath();
      const browser = await playwright.launch({
        args: chromium.args,
        executablePath: executablePath,
        headless: true,
      });
      const context = await browser.newContext();
      const page = await context.newPage();

      sessions[sessionId] = { browser, context, page, envUrl, username, password };

      let url = envUrl;
      if (!url.startsWith('http')) {
        url = `https://${url}`;
      }

      await page.goto(url);

      await page.fill('input#username', username);
      await page.fill('input#password', password);
      await page.click('input#Login');

      try {
        await Promise.race([
          page.waitForSelector('input#save[title="Verify"]', { timeout: 15000 }), 
          page.waitForSelector('text="Check Your Mobile Device"', { timeout: 15000 }),
          page.waitForSelector('text="Check your mobile device"', { timeout: 15000 }),
          page.waitForSelector('text="Approve the request"', { timeout: 15000 }),
          page.waitForSelector('.slds-global-header__logo', { timeout: 15000 }), 
          page.waitForURL(/lightning/, { timeout: 15000 })
        ]);
      } catch (e) {
      }

      const isVerification = await page.locator('input#save[title="Verify"]').count() > 0;
      const isMobileAuth = (await page.locator('text="Check Your Mobile Device"').count() > 0) || (await page.locator('text="Check your mobile device"').count() > 0) || (await page.locator('text="Approve the request"').count() > 0);

      if (isVerification) {
        return NextResponse.json({ requires2FA: true, type: 'otp', sessionId });
      } else if (isMobileAuth) {
        return NextResponse.json({ requires2FA: true, type: 'mobile', sessionId });
      }

      // If no 2FA, get the current exact URL (e.g. custom domain)
      await resetSecurityToken(page);

      await browser.close();
      delete sessions[sessionId];

      return NextResponse.json({ success: true, message: 'Token reset successfully' });

    } else if (action === 'wait_for_mobile_auth') {
      const { sessionId } = body;
      const session = sessions[sessionId];

      if (!session) {
        return NextResponse.json({ error: 'Session expired or not found' }, { status: 400 });
      }

      const { page, browser } = session;

      try {
         await page.waitForURL(/lightning/, { timeout: 45000 });
      } catch(e) {
         return NextResponse.json({ error: 'Timeout waiting for approval. Please try again.' }, { status: 400 });
      }

      await resetSecurityToken(page);

      await browser.close();
      delete sessions[sessionId];

      return NextResponse.json({ success: true, message: 'Token reset successfully' });

    } else if (action === 'verify') {
      const { sessionId, code } = body;
      const session = sessions[sessionId];

      if (!session) {
        return NextResponse.json({ error: 'Session expired or not found' }, { status: 400 });
      }

      const { page, browser, envUrl } = session;
      
      const emcCount = await page.locator('#emc').count();
      const smcCount = await page.locator('#smc').count();
      if (emcCount > 0) {
          await page.fill('#emc', code);
      } else if (smcCount > 0) {
          await page.fill('#smc', code);
      } else {
          await page.fill('input[type="text"]', code);
      }

      await page.click('input#save[title="Verify"]');

      try {
         await page.waitForURL(/lightning/, { timeout: 15000 });
      } catch(e) {}

      await resetSecurityToken(page);

      await browser.close();
      delete sessions[sessionId];

      return NextResponse.json({ success: true, message: 'Token reset successfully' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error: any) {
    console.error('Playwright Error:', error);
    return NextResponse.json({ error: error.message || 'An error occurred' }, { status: 500 });
  }
}
