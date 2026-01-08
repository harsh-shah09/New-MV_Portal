/**
 * Email utility for sending notifications
 * Replace GoogleGmailApi.sendEmailFuture from Apex
 */

import nodemailer from 'nodemailer';

interface EmailParams {
  to: string;
  subject: string;
  body: string;
  contentType?: string;
}

/**
 * Create nodemailer transporter for Gmail
 */
function createTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

/**
 * Send email notification using Gmail
 */
export async function sendEmail({ to, subject, body, contentType = 'text/plain' }: EmailParams): Promise<void> {
  try {
    console.log('📧 Sending email:', { to, subject, contentType });
    
    const transporter = createTransporter();
    
    const mailOptions: any = {
      from: process.env.GMAIL_USER,
      to,
      subject,
    };

    if (contentType === 'text/html') {
      mailOptions.html = body;
    } else {
      mailOptions.text = body;
    }

    await transporter.sendMail(mailOptions);
    
    console.log('✅ Email sent successfully to:', to);
  } catch (error) {
    console.error('❌ Error sending email:', error);
    // Don't throw - we don't want email failures to break the application
  }
}

/**
 * Send email asynchronously (non-blocking)
 * Equivalent to @future in Apex
 */
export function sendEmailAsync(params: EmailParams): void {
  // Run in next tick to avoid blocking
  setImmediate(() => {
    sendEmail(params).catch(err => {
      console.error('Async email error:', err);
    });
  });
}

/**
 * Get HR email from environment variable
 */
export function getHREmail(): string {
  return 'sibtenkhan6789@gmail.com';
}
