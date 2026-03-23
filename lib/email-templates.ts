/**
 * Email Templates for Leave Management
 * Professional HTML email templates for all leave-related notifications
 * Templates are loaded from Salesforce Custom Metadata (Email_Templates__mdt)
 */

import { getSalesforceConnection } from './salesforce';

interface LeaveEmailData {
  recipientName: string;
  employeeName?: string;
  leaveType?: string;
  startDate?: string;
  endDate?: string;
  duration?: number;
  reason?: string;
  approverName?: string;
  approverTitle?: string;
  teamLeadName?: string;
  setupLink?: string;
}

const EMAIL_TEMPLATE_METADATA = 'Email_Templates__mdt';
const TEMPLATE_CACHE_TTL_MS = 5 * 60 * 1000;

let templateCache: Map<string, string> | null = null;
let templateCacheFetchedAt = 0;

function normalizeTemplateKey(value: string): string {
  return (value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function applyTemplateData(template: string, data: LeaveEmailData): string {
  let html = template;

  html = html.replace(/{{recipientName}}/g, data.recipientName || 'Employee');
  html = html.replace(/{{employeeName}}/g, data.employeeName || 'Unknown');
  html = html.replace(/{{leaveType}}/g, data.leaveType || 'N/A');
  html = html.replace(/{{startDate}}/g, data.startDate || 'N/A');
  html = html.replace(/{{endDate}}/g, data.endDate || 'N/A');
  html = html.replace(/{{duration}}/g, String(data.duration || 0));
  html = html.replace(/{{approverTitle}}/g, data.approverTitle || 'Approver');
  html = html.replace(/{{teamLeadName}}/g, data.teamLeadName || 'Team Lead');
  html = html.replace(/{{setupLink}}/g, data.setupLink || '');
  html = html.replace(/{{year}}/g, new Date().getFullYear().toString());

  if (data.reason) {
    html = html.replace(/{{#if reason}}/g, '');
    html = html.replace(/{{\/if}}/g, '');
    html = html.replace(/{{reason}}/g, data.reason);
  } else {
    html = html.replace(/{{#if reason}}[\s\S]*?{{\/if}}/g, '');
  }

  return html;
}

function getDefaultTemplate(data: LeaveEmailData): string {
  return `
    <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6;">
      <p>Dear ${data.recipientName || 'Employee'},</p>
      <p>Please review your leave notification in the HRMS portal.</p>
      <p style="margin-top: 24px;">Regards,<br/>HRMS System</p>
      <p style="color:#6b7280;font-size:12px;">© ${new Date().getFullYear()} MV Clouds</p>
    </div>
  `.trim();
}

async function getTemplateMap(): Promise<Map<string, string>> {
  const now = Date.now();
  if (templateCache && now - templateCacheFetchedAt < TEMPLATE_CACHE_TTL_MS) {
    return templateCache;
  }

  const conn = await getSalesforceConnection();
  const result = await conn.query<any>(`SELECT DeveloperName, Value__c FROM ${EMAIL_TEMPLATE_METADATA}`);

  const map = new Map<string, string>();
  for (const record of result.records || []) {
    const key = record.DeveloperName as string;
    const value = (record.Value__c as string) || '';
    if (!key || !value) continue;

    map.set(key, value);
    map.set(normalizeTemplateKey(key), value);
  }

  templateCache = map;
  templateCacheFetchedAt = now;
  return map;
}

/**
 * Load HTML template from Salesforce metadata and replace placeholders with data
 */
async function loadTemplate(templateName: string, data: LeaveEmailData): Promise<string> {
  try {
    const templateMap = await getTemplateMap();
    const template = templateMap.get(templateName) || templateMap.get(normalizeTemplateKey(templateName));

    if (!template) {
      console.warn(`[Email Templates] Template not found in metadata: ${templateName}`);
      return getDefaultTemplate(data);
    }

    return applyTemplateData(template, data);
  } catch (error) {
    console.error(`[Email Templates] Failed loading metadata template: ${templateName}`, error);
    return getDefaultTemplate(data);
  }
}

/**
 * Template: New Leave Request to Team Lead
 */
export async function newLeaveRequestToTeamLead(data: LeaveEmailData): Promise<{ subject: string; html: string; text: string }> {
  const subject = `New Leave Request from ${data.employeeName}`;
  const html = await loadTemplate('new-request-to-team-lead', data);
  const text = `Dear ${data.recipientName},\n\nA new leave request has been submitted by ${data.employeeName}.\n\nLeave Details:\n- Employee: ${data.employeeName}\n- Leave Type: ${data.leaveType}\n- Start Date: ${data.startDate}\n- End Date: ${data.endDate}\n- Duration: ${data.duration} day(s)\n\nPlease log in to the HRMS portal to review and take action.\n\nRegards,\nHR Team`;
  
  return { subject, html, text };
}

/**
 * Template: Team Lead Leave Request to HR
 */
export async function teamLeadLeaveRequestToHR(data: LeaveEmailData): Promise<{ subject: string; html: string; text: string }> {
  const subject = `Leave Request from Team Lead - ${data.employeeName}`;
  const html = await loadTemplate('team-lead-request-to-hr', data);
  const text = `Dear HR,\n\nA new leave request has been submitted by ${data.employeeName} (Team Lead).\n\nPlease review and approve.\n\nRegards,\nHRMS System`;
  
  return { subject, html, text };
}

/**
 * Template: HR Leave Request to Admin
 */
export async function hrLeaveRequestToAdmin(data: LeaveEmailData): Promise<{ subject: string; html: string; text: string }> {
  const subject = `Leave Request from HR - ${data.employeeName}`;
  const html = await loadTemplate('hr-request-to-admin', data);
  const text = `Dear ${data.recipientName},\n\nA new leave request has been submitted by ${data.employeeName} (HR).\n\nPlease review and approve.\n\nRegards,\nHRMS System`;
  
  return { subject, html, text };
}

/**
 * Template: Team Lead Approval Notification to HR
 */
export async function tlApprovalToHR(data: LeaveEmailData): Promise<{ subject: string; html: string; text: string }> {
  const subject = `Leave Approved by Team Lead - ${data.employeeName}`;
  const html = await loadTemplate('tl-approval-to-hr', data);
  const text = `Dear HR,\n\nA new leave request has been submitted by ${data.employeeName} and approved by Team Lead ${data.teamLeadName}.`;
  
  return { subject, html, text };
}

/**
 * Template: Leave Approved by Team Lead (to Employee)
 */
export async function leaveApprovedByTL(data: LeaveEmailData): Promise<{ subject: string; html: string; text: string }> {
  const subject = `Leave Request Approved by Team Lead`;
  const html = await loadTemplate('leave-approved-by-tl', data);
  const text = `Dear ${data.recipientName},\n\nYour leave request has been Approved by your Team Lead.\n\nRegards,\nHR Team`;
  
  return { subject, html, text };
}

/**
 * Template: Leave Approved by HR/Admin (Final Approval)
 */
export async function leaveApprovedFinal(data: LeaveEmailData): Promise<{ subject: string; html: string; text: string }> {
  const subject = `Leave Request Approved - Final Confirmation`;
  const html = await loadTemplate('leave-approved-final', data);
  const text = `Dear ${data.recipientName},\n\nYour leave request has been Approved by ${data.approverTitle}.\n\nRegards,\nHRMS System`;
  
  return { subject, html, text };
}

/**
 * Template: Leave Auto-Approved (to Team Lead)
 */
export async function leaveAutoApproved(data: LeaveEmailData): Promise<{ subject: string; html: string; text: string }> {
  const subject = `Leave Auto-Approved for ${data.employeeName}`;
  const html = await loadTemplate('leave-auto-approved', data);
  const text = `Dear ${data.recipientName},\n\n${data.approverTitle} has applied and auto-approved leave on behalf of ${data.employeeName}.\n\nLeave Details:\n- Type: ${data.leaveType}\n- Category: Loss of Pay\n- Start Date: ${data.startDate}\n- End Date: ${data.endDate}\n- Duration: ${data.duration} day(s)\n\nRegards,\nHRMS System`;

  return { subject, html, text };
}

/**
 * Template: Leave Rejected by Team Lead/HR/Admin
 */
export async function leaveRejected(data: LeaveEmailData): Promise<{ subject: string; html: string; text: string }> {
  const subject = `Leave Request Rejected`;
  const html = await loadTemplate('leave-rejected', data);
  const text = `Dear ${data.recipientName},\n\nYour leave request has been Rejected by ${data.approverTitle}.\n${data.reason ? `\nReason: ${data.reason}\n` : ''}\nRegards,\nHRMS System`;
  
  return { subject, html, text };
}

/**
 * Template: Leave Withdrawn
 */
export async function leaveWithdrawn(data: LeaveEmailData): Promise<{ subject: string; html: string; text: string }> {
  const subject = `Leave Request Withdrawn - Balance Restored`;
  const html = await loadTemplate('leave-withdrawn', data);
  const text = `Dear ${data.recipientName || 'Employee'},\n\nYour leave request has been Withdrawn.\n\nRegards,\nHR Team`;
  
  return { subject, html, text };
}

/**
 * Template: Withdrawal Request Submitted (to Employee)
 */
export async function withdrawalRequestSubmitted(data: LeaveEmailData): Promise<{ subject: string; html: string; text: string }> {
  const subject = `Withdrawal Request Submitted - Pending HR Approval`;
  const html = await loadTemplate('withdrawal-request-submitted', data);
  const text = `Dear ${data.recipientName},\n\nYour request to withdraw the approved leave has been successfully submitted and is now pending HR approval.\n\nLeave Details:\n- Leave Type: ${data.leaveType}\n- Start Date: ${data.startDate}\n- End Date: ${data.endDate}\n- Duration: ${data.duration} day(s)\n\nYou will be notified once HR reviews your request.\n\nRegards,\nHRMS System`;
  
  return { subject, html, text };
}

/**
 * Template: Withdrawal Request to HR
 */
export async function withdrawalRequestToHR(data: LeaveEmailData): Promise<{ subject: string; html: string; text: string }> {
  const subject = `Withdrawal Request: ${data.employeeName} - Leave from ${data.startDate} to ${data.endDate}`;
  const html = await loadTemplate('withdrawal-request-to-hr', data);
  const text = `Dear HR Team,\n\n${data.employeeName} has requested to withdraw their approved leave.\n\nLeave Details:\n- Employee: ${data.employeeName}\n- Leave Type: ${data.leaveType}\n- Start Date: ${data.startDate}\n- End Date: ${data.endDate}\n- Duration: ${data.duration} day(s)\n\nPlease review and approve or reject this withdrawal request through the HRMS portal.\n\nRegards,\nHRMS System`;
  
  return { subject, html, text };
}

/**
 * Template: Withdrawal Approved (to Employee)
 */
export async function withdrawalApproved(data: LeaveEmailData): Promise<{ subject: string; html: string; text: string }> {
  const subject = `Withdrawal Approved - Leave from ${data.startDate} to ${data.endDate}`;
  const html = await loadTemplate('withdrawal-approved', data);
  const text = `Dear ${data.recipientName},\n\nYour withdrawal request has been approved by ${data.approverTitle}. The leave has been successfully withdrawn and your leave balance has been restored.\n\nLeave Details:\n- Leave Type: ${data.leaveType}\n- Start Date: ${data.startDate}\n- End Date: ${data.endDate}\n- Duration: ${data.duration} day(s)\n\nRegards,\nHRMS System`;
  
  return { subject, html, text };
}

/**
 * Template: Withdrawal Rejected (to Employee)
 */
export async function withdrawalRejected(data: LeaveEmailData): Promise<{ subject: string; html: string; text: string }> {
  const subject = `Withdrawal Rejected - Leave from ${data.startDate} to ${data.endDate}`;
  const html = await loadTemplate('withdrawal-rejected', data);
  const text = `Dear ${data.recipientName},\n\nYour withdrawal request has been rejected by ${data.approverTitle}. Your leave remains approved and active.\n\n${data.reason ? `Reason: ${data.reason}\n\n` : ''}Leave Details:\n- Leave Type: ${data.leaveType}\n- Start Date: ${data.startDate}\n- End Date: ${data.endDate}\n- Duration: ${data.duration} day(s)\n\nRegards,\nHRMS System`;
  
  return { subject, html, text };
}

/**
 * Template: Welcome Email
 */
export async function welcomeEmail(data: { recipientName: string; setupLink: string }): Promise<{ subject: string; html: string; text: string }> {
    const subject = `Welcome to MV Clouds Team!`;
    const html = await loadTemplate('welcome-email', {
      recipientName: data.recipientName,
      setupLink: data.setupLink,
    });
    
    const text = `Dear ${data.recipientName},\n\nWelcome to MV Clouds! Please set up your account here: ${data.setupLink}`;
    return { subject, html, text };
}
