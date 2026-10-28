/**
 * Email Templates for Leave Management
 * Professional HTML email templates for all leave-related notifications
 * Templates are loaded from Salesforce Custom Metadata (Email_Templates__mdt)
 */

import { getSalesforceConnection } from './salesforce';
import { getAdminSettingValue } from './admin-settings';
import dayjs from 'dayjs';

interface LeaveEmailData {
  recipientName: string;
  employeeName?: string;
  employeeId?: string;
  employeeEmail?: string;
  leaveType?: string;
  startDate?: string;
  endDate?: string;
  duration?: number;
  reason?: string;
  approverName?: string;
  approverTitle?: string;
  teamLeadName?: string;
  decisionStatus?: string;
  decisionStatusClass?: string;
  setupLink?: string;
  appLink?: string;
  documentName? :string;
}

const EMAIL_TEMPLATE_METADATA = 'Email_Templates__mdt';
const TEMPLATE_CACHE_TTL_MS = 5 * 60 * 1000;

let templateCache: Map<string, string> | null = null;
let templateCacheFetchedAt = 0;

function normalizeTemplateKey(value: string): string {
  return (value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function formatLeaveTemplateDate(value?: string): string {
  if (!value) {
    return 'N/A';
  }

  const parsedDate = dayjs(value);
  if (!parsedDate.isValid()) {
    return value;
  }

  return parsedDate.format('DD MMM YYYY');
}

function applyTemplateData(template: string, data: LeaveEmailData): string {
  let html = template;
  html = html.replace(/{{recipientName}}/g, data.recipientName || 'Employee');
  html = html.replace(/{{employeeName}}/g, data.employeeName || 'Unknown');
  html = html.replace(/{{employeeId}}/g, data.employeeId || 'N/A');
  html = html.replace(/{{employeeEmail}}/g, data.employeeEmail || 'N/A');
  html = html.replace(/{{leaveType}}/g, data.leaveType || 'N/A');
  html = html.replace(/{{startDate}}/g, formatLeaveTemplateDate(data.startDate));
  html = html.replace(/{{endDate}}/g, formatLeaveTemplateDate(data.endDate));
  html = html.replace(/{{duration}}/g, String(data.duration || 0));
  html = html.replace(/{{Reason}}/g, String(data.reason || 'N/A'));
  html = html.replace(/{{approverName}}/g, data.approverName || 'HR Team');
  html = html.replace(/{{approverTitle}}/g, data.approverTitle || 'Approver');
  html = html.replace(/{{teamLeadName}}/g, data.teamLeadName || 'Team Lead');
  html = html.replace(/{{decisionStatus}}/g, data.decisionStatus || 'Pending');
  html = html.replace(/{{decisionStatusClass}}/g, data.decisionStatusClass || 'approved');
  html = html.replace(/{{setupLink}}/g, data.setupLink || '');
  html = html.replace(/{{appLink}}/g, data.appLink || '');
  html = html.replace(/{{documentName}}/g, data.documentName || '');
  html = html.replace(/{{RejectedDocumentsTable}}/gi, data.documentName || '');
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
      <p>Please review your leave notification in the MV portal.</p>
      <p style="margin-top: 24px;">Regards,<br/>MV System</p>
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
export async function loadTemplate(templateName: string, data: LeaveEmailData): Promise<string> {
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
 * Template: Employee Leave Request to HR (CC Team Lead + Admin)
 */
export async function employeeLeaveRequestToHR(data: LeaveEmailData): Promise<{ subject: string; html: string; text: string }> {
  const subject = `Leave Request from ${data.employeeName}`;
  const html = await loadTemplate('employee-request-to-hr', data);
  const text = `Dear ${data.recipientName},\n\n${data.employeeName} has submitted a new leave request.\n\nLeave Details:\n- Employee: ${data.employeeName}\n- Leave Type: ${data.leaveType}\n- Start Date: ${formatLeaveTemplateDate(data.startDate)}\n- End Date: ${formatLeaveTemplateDate(data.endDate)}\n- Duration: ${data.duration} day(s)\n\nCC: Team Lead, Admin\n\nRegards,\nHRMS System`;

  return { subject, html, text };
}

/**
 * Template: Extra Day Pay Request
 */
export async function extraDayPayRequest(data: LeaveEmailData): Promise<{ subject: string; html: string; text: string }> {
  const subject = `Extra Day Pay Request from ${data.employeeName}`;
  const html = await loadTemplate('extra-day-pay-request', {
    ...data,
    leaveType: 'Extra Day Pay',
  });
  const text = `Dear ${data.recipientName},\n\n${data.employeeName} has submitted an Extra Day Pay request.\n\nRequest Details:\n- Employee: ${data.employeeName}\n- Request Type: Extra Day Pay\n- Start Date: ${formatLeaveTemplateDate(data.startDate)}\n- End Date: ${formatLeaveTemplateDate(data.endDate)}\n- Duration: ${data.duration} day(s)${data.reason ? `\n- Reason: ${data.reason}` : ''}\n\nRegards,\nHRMS System`;

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
 * Template: Team Lead Decision (Approve/Reject) to HR (CC Employee + Admin)
 */
export async function teamLeadDecisionToHR(data: LeaveEmailData): Promise<{ subject: string; html: string; text: string }> {
  const decision = (data.decisionStatus || 'Approved').toLowerCase();
  const decisionLabel = decision === 'rejected' ? 'Rejected' : 'Approved';
  const html = await loadTemplate('tl-decision-to-hr', {
    ...data,
    decisionStatus: decisionLabel,
    decisionStatusClass: decision === 'rejected' ? 'rejected' : 'approved',
  });
  const subject = `Team Lead ${decisionLabel} Leave - ${data.employeeName}`;
  const text = `Dear ${data.recipientName},\n\nTeam Lead ${data.teamLeadName || ''} has ${decisionLabel.toLowerCase()} leave request for ${data.employeeName}.\n\nLeave Details:\n- Leave Type: ${data.leaveType}\n- Start Date: ${formatLeaveTemplateDate(data.startDate)}\n- End Date: ${formatLeaveTemplateDate(data.endDate)}\n- Duration: ${data.duration} day(s)${data.reason ? `\n- Reason: ${data.reason}` : ''}\n\nCC: Employee, Admin\n\nRegards,\nHRMS System`;

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
 * Template: HR Decision (Approve/Reject) to Employee (CC Team Lead + Admin)
 */
export async function hrDecisionToEmployee(data: LeaveEmailData): Promise<{ subject: string; html: string; text: string }> {
  const decision = (data.decisionStatus || 'Approved').toLowerCase();
  const decisionLabel = decision === 'rejected' ? 'Rejected' : 'Approved';
  const html = await loadTemplate('hr-decision-to-employee', {
    ...data,
    decisionStatus: decisionLabel,
    decisionStatusClass: decision === 'rejected' ? 'rejected' : 'approved',
  });
  const subject = `Leave Request ${decisionLabel} by HR`;
  const text = `Dear ${data.recipientName},\n\nYour leave request has been ${decisionLabel.toLowerCase()} by HR.\n\nLeave Details:\n- Leave Type: ${data.leaveType}\n- Start Date: ${formatLeaveTemplateDate(data.startDate)}\n- End Date: ${formatLeaveTemplateDate(data.endDate)}\n- Duration: ${data.duration} day(s)${data.reason ? `\n- Reason: ${data.reason}` : ''}\n\nCC: Team Lead, Admin\n\nRegards,\nHRMS System`;

  return { subject, html, text };
}

/**
 * Template: Extra Day Pay Decision (Approved/Rejected)
 */
export async function extraDayPayDecision(data: LeaveEmailData): Promise<{ subject: string; html: string; text: string }> {
  const decision = (data.decisionStatus || 'Approved').toLowerCase();
  const decisionLabel = decision === 'rejected' ? 'Rejected' : 'Approved';
  const html = await loadTemplate('extra-day-pay-decision', {
    ...data,
    decisionStatus: decisionLabel,
    decisionStatusClass: decision === 'rejected' ? 'rejected' : 'approved',
    leaveType: 'Extra Day Pay',
  });
  const subject = `Extra Day Pay ${decisionLabel} - ${data.employeeName || data.recipientName}`;
  const text = `Dear ${data.recipientName},\n\nYour Extra Day Pay request has been ${decisionLabel.toLowerCase()}.\n\nRequest Details:\n- Start Date: ${formatLeaveTemplateDate(data.startDate)}\n- End Date: ${formatLeaveTemplateDate(data.endDate)}\n- Duration: ${data.duration} day(s)${data.reason ? `\n- Reason: ${data.reason}` : ''}\n\nRegards,\nHRMS System`;

  return { subject, html, text };
}

/**
 * Template: Team Lead Leave Request to HR (CC Admin)
 */
export async function teamLeadLeaveRequestToHRWithAdminCC(data: LeaveEmailData): Promise<{ subject: string; html: string; text: string }> {
  const subject = `Leave Request from Team Lead - ${data.employeeName}`;
  const html = await loadTemplate('team-lead-request-to-hr-cc-admin', data);
  const text = `Dear ${data.recipientName},\n\n${data.employeeName} (Team Lead) has submitted a leave request.\n\nLeave Details:\n- Leave Type: ${data.leaveType}\n- Start Date: ${formatLeaveTemplateDate(data.startDate)}\n- End Date: ${formatLeaveTemplateDate(data.endDate)}\n- Duration: ${data.duration} day(s)\n\nCC: Admin\n\nRegards,\nHRMS System`;

  return { subject, html, text };
}

/**
 * Template: HR Decision (Approve/Reject) to Team Lead (CC Admin)
 */
export async function hrDecisionToTeamLead(data: LeaveEmailData): Promise<{ subject: string; html: string; text: string }> {
  const decision = (data.decisionStatus || 'Approved').toLowerCase();
  const decisionLabel = decision === 'rejected' ? 'Rejected' : 'Approved';
  const html = await loadTemplate('hr-decision-to-employee', {
    ...data,
    decisionStatus: decisionLabel,
    decisionStatusClass: decision === 'rejected' ? 'rejected' : 'approved',
  });
  const subject = `Leave Request ${decisionLabel} by HR ${data.recipientName ? ` - ${data.recipientName}` : ''}`;
  const text = `Dear ${data.recipientName},\n\nYour leave request has been ${decisionLabel.toLowerCase()} by HR.\n\nLeave Details:\n- Leave Type: ${data.leaveType}\n- Start Date: ${formatLeaveTemplateDate(data.startDate)}\n- End Date: ${formatLeaveTemplateDate(data.endDate)}\n- Duration: ${data.duration} day(s)${data.reason ? `\n- Reason: ${data.reason}` : ''}\n\nCC: Admin\n\nRegards,\nHRMS System`;

  return { subject, html, text };
}

/**
 * Template: Admin Decision (Approve/Reject) to HR
 */
export async function adminDecisionToHR(data: LeaveEmailData): Promise<{ subject: string; html: string; text: string }> {
  const decision = (data.decisionStatus || 'Approved').toLowerCase();
  const decisionLabel = decision === 'rejected' ? 'Rejected' : 'Approved';
  const html = await loadTemplate('admin-decision-to-hr', {
    ...data,
    decisionStatus: decisionLabel,
    decisionStatusClass: decision === 'rejected' ? 'rejected' : 'approved',
  });
  const subject = `Leave Request ${decisionLabel} by Admin`;
  const text = `Dear ${data.recipientName},\n\nYour leave request has been ${decisionLabel.toLowerCase()} by Admin.\n\nLeave Details:\n- Leave Type: ${data.leaveType}\n- Start Date: ${formatLeaveTemplateDate(data.startDate)}\n- End Date: ${formatLeaveTemplateDate(data.endDate)}\n- Duration: ${data.duration} day(s)${data.reason ? `\n- Reason: ${data.reason}` : ''}\n\nRegards,\nHRMS System`;

  return { subject, html, text };
}

/**
 * Template: Leave Auto-Approved (to Team Lead)
 */
export async function leaveAutoApproved(data: LeaveEmailData): Promise<{ subject: string; html: string; text: string }> {
  const subject = `Leave Approved for ${data.employeeName}`;
  const html = await loadTemplate('leave-auto-approved', data);
  const text = `Dear ${data.recipientName},\n\n${data.approverTitle} has applied and auto-approved leave on behalf of ${data.employeeName}.\n\nLeave Details:\n- Type: ${data.leaveType}\n- Category: Loss of Pay\n- Start Date: ${formatLeaveTemplateDate(data.startDate)}\n- End Date: ${formatLeaveTemplateDate(data.endDate)}\n- Duration: ${data.duration} day(s)\n\nRegards,\nHRMS System`;

  return { subject, html, text };
}

/**
 * Template: Withdrawal Request Submitted (to Employee)
 */
export async function withdrawalRequestSubmitted(data: LeaveEmailData): Promise<{ subject: string; html: string; text: string }> {
  const subject = `Withdrawal Request Submitted - Pending HR Approval`;
  const html = await loadTemplate('withdrawal-request-submitted', data);
  const text = `Dear ${data.recipientName},\n\nYour request to withdraw the approved leave has been successfully submitted and is now pending HR approval.\n\nLeave Details:\n- Leave Type: ${data.leaveType}\n- Start Date: ${formatLeaveTemplateDate(data.startDate)}\n- End Date: ${formatLeaveTemplateDate(data.endDate)}\n- Duration: ${data.duration} day(s)\n\nYou will be notified once HR reviews your request.\n\nRegards,\nHRMS System`;
  
  return { subject, html, text };
}

/**
 * Template: Withdrawal Request to HR
 */
export async function withdrawalRequestToHR(data: LeaveEmailData): Promise<{ subject: string; html: string; text: string }> {
  const subject = `Withdrawal Request: ${data.employeeName} - Leave from ${formatLeaveTemplateDate(data.startDate)} to ${formatLeaveTemplateDate(data.endDate)}`;
  const html = await loadTemplate('withdrawal-request-to-hr', data);
  const text = `Dear HR Team,\n\n${data.employeeName} has requested to withdraw their approved leave.\n\nLeave Details:\n- Employee: ${data.employeeName}\n- Leave Type: ${data.leaveType}\n- Start Date: ${formatLeaveTemplateDate(data.startDate)}\n- End Date: ${formatLeaveTemplateDate(data.endDate)}\n- Duration: ${data.duration} day(s)\n\nPlease review and approve or reject this withdrawal request through the MV portal.\n\nRegards,\nHRMS System`;
  
  return { subject, html, text };
}

/**
 * Template: Withdrawal Approved (to Employee)
 */
export async function withdrawalApproved(data: LeaveEmailData): Promise<{ subject: string; html: string; text: string }> {
  const subject = `Withdrawal Approved ${data.recipientName ? ` - ${data.recipientName}` : ''}`;
  const html = await loadTemplate('withdrawal-approved', data);
  const text = `Dear ${data.recipientName},\n\nYour withdrawal request has been approved by ${data.approverTitle}. The leave has been successfully withdrawn and your leave balance has been restored.\n\nLeave Details:\n- Leave Type: ${data.leaveType}\n- Start Date: ${formatLeaveTemplateDate(data.startDate)}\n- End Date: ${formatLeaveTemplateDate(data.endDate)}\n- Duration: ${data.duration} day(s)\n\nRegards,\nHRMS System`;
  
  return { subject, html, text };
}

/**
 * Template: Withdrawal Rejected (to Employee)
 */
export async function withdrawalRejected(data: LeaveEmailData): Promise<{ subject: string; html: string; text: string }> {
  const subject = `Withdrawal Rejected ${data.recipientName ? ` - ${data.recipientName}` : ''}`;
  const html = await loadTemplate('withdrawal-rejected', data);
  const text = `Dear ${data.recipientName},\n\nYour withdrawal request has been rejected by ${data.approverTitle}. Your leave remains approved and active.\n\n${data.reason ? `Reason: ${data.reason}\n\n` : ''}Leave Details:\n- Leave Type: ${data.leaveType}\n- Start Date: ${formatLeaveTemplateDate(data.startDate)}\n- End Date: ${formatLeaveTemplateDate(data.endDate)}\n- Duration: ${data.duration} day(s)\n\nRegards,\nHRMS System`;
  
  return { subject, html, text };
}

/**
 * Template: Doubtful Leave Marked by HR to Admin
 */
export async function doubtfulLeaveMarkedToAdmin(data: LeaveEmailData): Promise<{ subject: string; html: string; text: string }> {
  const subject = `Doubtful Leave Review Required - ${data.employeeName}`;
  const html = await loadTemplate('doubtful-leave-to-admin', data);
  const text = `Dear ${data.recipientName},\n\n${data.approverTitle || 'HR'} ${data.approverName || ''} has marked a leave request as doubtful and it requires Admin review.\n\nLeave Details:\n- Employee: ${data.employeeName}\n- Leave Type: ${data.leaveType}\n- Start Date: ${formatLeaveTemplateDate(data.startDate)}\n- End Date: ${formatLeaveTemplateDate(data.endDate)}\n- Duration: ${data.duration} day(s)${data.reason ? `\n- Reason: ${data.reason}` : ''}\n\nPlease review this request in the MV portal.\n\nRegards,\nHRMS System`;

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
export async function onboardingMail(data: { recipientName: string; setupLink: string }): Promise<{ subject: string; html: string; text: string }> {
  const subject = `Welcome to MV Clouds Team!`;
  const html = await loadTemplate('onboarding-mail', {
    recipientName: data.recipientName,
    setupLink: data.setupLink,
  });
  
  const text = `...`;
  return { subject, html, text };
}

export async function onboardingCompletedToHR(data: {
  recipientName?: string;
  employeeName: string;
  employeeId: string;
  employeeEmail: string;
  recordId: string;
}): Promise<{ subject: string; html: string; text: string }> {
  const subject = `Onboarding Completed - ${data.employeeName}`;
  const recipientName = data.recipientName || 'HR Team';
  const settingsAppUrl = await getAdminSettingValue('NEXT_PUBLIC_APP_URL');
  const baseUrl = (settingsAppUrl || process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || '').replace(/\/$/, '');
  const appLink = baseUrl && data.recordId
    ? `${baseUrl}/employees/${encodeURIComponent(data.recordId)}?tab=personal`
    : '';
  const html = await loadTemplate('onboarding-completed-to-hr', {
    recipientName,
    employeeName: data.employeeName,
    employeeId: data.employeeId,
    employeeEmail: data.employeeEmail,
    appLink,
  });

  const text = `Dear ${recipientName},\n\nOnboarding data collection has been completed for the following employee:\n- Employee Name: ${data.employeeName}\n- Employee ID: ${data.employeeId}\n- Email: ${data.employeeEmail}\n\nPlease review the submitted onboarding details in MV Portak.\n\nRegards,\nHRMS System`;

  return { subject, html, text };
}

// ─── Asset Email Templates ────────────────────────────────────────────────────

/**
 * Data contract for the single "asset_return_request" MDT template.
 * All 4 asset emails (Return: emp + HR, Request: emp + HR) use this shape
 * with different field values so the same template renders each variant.
 */
interface AssetEmailData {
  /** CSS gradient string for the header strip — e.g. "linear-gradient(135deg,#1e40af,#3b82f6)" */
  headerGradient: string;
  /** Main title in the header */
  headerTitle: string;
  /** Subtitle line below the title */
  headerSubtitle: string;
  /** Hex color for the subtitle text */
  headerSubtitleColor: string;
  /** Name shown after "Dear" */
  recipientName: string;
  /** Introductory paragraph */
  bodyIntro: string;
  /** Hex color for the left-border of the details card */
  sectionBorderColor: string;
  /** Hex color for the section heading text inside the card */
  sectionTitleColor: string;
  /** Heading text above the details table */
  sectionTitle: string;
  /** Pre-built HTML <tr>…</tr> rows for the details table */
  tableRows: string;
  /** Optional workflow callout HTML block — pass "" to omit */
  workflowSection: string;
  /** Closing sentence */
  bodyOutro: string;
}

/**
 * Replace all {{placeholders}} in an asset template with the supplied data.
 * HTML-block fields (tableRows, workflowSection) are injected verbatim.
 */
function applyAssetTemplateData(template: string, data: AssetEmailData): string {
  let html = template;
  html = html.replace(/{{headerGradient}}/g, data.headerGradient);
  html = html.replace(/{{headerTitle}}/g, data.headerTitle);
  html = html.replace(/{{headerSubtitle}}/g, data.headerSubtitle);
  html = html.replace(/{{headerSubtitleColor}}/g, data.headerSubtitleColor);
  html = html.replace(/{{recipientName}}/g, data.recipientName);
  html = html.replace(/{{bodyIntro}}/g, data.bodyIntro);
  html = html.replace(/{{sectionBorderColor}}/g, data.sectionBorderColor);
  html = html.replace(/{{sectionTitleColor}}/g, data.sectionTitleColor);
  html = html.replace(/{{sectionTitle}}/g, data.sectionTitle);
  html = html.replace(/{{tableRows}}/g, data.tableRows);
  html = html.replace(/{{workflowSection}}/g, data.workflowSection);
  html = html.replace(/{{bodyOutro}}/g, data.bodyOutro);
  html = html.replace(/{{year}}/g, new Date().getFullYear().toString());
  return html;
}

/** Shared fallback when the MDT template is missing */
function getAssetDefaultTemplate(data: AssetEmailData): string {
  return `
    <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6; max-width: 600px; margin: 0 auto;">
      <h2>${data.headerTitle}</h2>
      <p>Dear ${data.recipientName},</p>
      <p>${data.bodyIntro}</p>
      <p>${data.bodyOutro}</p>
      <p style="color:#6b7280;font-size:12px;">© ${new Date().getFullYear()} MV Clouds · Asset Management System</p>
    </div>
  `.trim();
}

/**
 * Load the single 'asset_return_request' MDT template and apply AssetEmailData.
 * Falls back to a plain text template if the MDT record is missing.
 */
export async function loadAssetTemplate(templateName: string, data: AssetEmailData): Promise<string> {
  try {
    const templateMap = await getTemplateMap();
    const raw = templateMap.get(templateName) || templateMap.get(normalizeTemplateKey(templateName));
    if (!raw) {
      console.warn(`[Asset Email Templates] Template not found: ${templateName}`);
      return getAssetDefaultTemplate(data);
    }
    return applyAssetTemplateData(raw, data);
  } catch (error) {
    console.error(`[Asset Email Templates] Failed loading template: ${templateName}`, error);
    return getAssetDefaultTemplate(data);
  }
}

// ─── Shared table-row builder ─────────────────────────────────────────────────

const TD_LABEL = `style="color:#64748b;font-size:13px;padding:5px 0;width:160px;vertical-align:top;"`;
const TD_VALUE = `style="color:#1e293b;font-size:14px;font-weight:600;"`;
const TD_VALUE_MONO = `style="color:#1e293b;font-size:14px;font-weight:600;font-family:monospace;"`;
const TD_VALUE_NORMAL = `style="color:#1e293b;font-size:14px;"`;

function tr(label: string, value: string, mono = false, normal = false): string {
  const tdVal = mono ? TD_VALUE_MONO : normal ? TD_VALUE_NORMAL : TD_VALUE;
  return `<tr><td ${TD_LABEL}>${label}</td><td ${tdVal}>${value}</td></tr>`;
}

// ─── 4 exported asset email functions ────────────────────────────────────────

const TEMPLATE_NAME = 'asset_return_request';

const WORKFLOW_BOX = `
  <div style="background:#ecfdf5;border-radius:10px;padding:18px 22px;margin:0 0 20px;border:1px solid #a7f3d0;">
    <h3 style="color:#065f46;font-size:13px;font-weight:700;margin:0 0 10px;">⏱ Approval Workflow</h3>
    <ul style="color:#374151;font-size:13px;margin:0;padding-left:18px;line-height:2;">
      <li>Your request is pending HR review.</li>
      <li>HR will evaluate and approve or follow up with you.</li>
      <li>Once approved, the asset will be assigned within <strong>5 working days</strong>.</li>
    </ul>
  </div>
`;

const HR_WORKFLOW_BOX = `
  <div style="background:#fffbeb;border-radius:10px;padding:16px 20px;border:1px solid #fde68a;margin-bottom:20px;">
    <p style="color:#92400e;font-size:13px;font-weight:600;margin:0 0 6px;">📋 Approval Workflow Reminder</p>
    <p style="color:#78350f;font-size:13px;margin:0;">Please process via <strong>Asset Management → Manage Assignment</strong> within <strong>5 working days</strong> of approval.</p>
  </div>
`;

/** Asset Return — confirmation email sent to the employee */
export async function assetReturnEmployeeEmail(params: {
  employeeName: string;
  assetName: string;
  assetCode: string;
  remarks?: string;
  requestDate: string;
}): Promise<{ subject: string; html: string }> {
  const rows = [
    tr('Asset Name', params.assetName),
    tr('Asset Code', params.assetCode, true),
    tr('Request Date', params.requestDate),
    params.remarks ? tr('Remarks', params.remarks, false, true) : '',
  ].join('');

  const data: AssetEmailData = {
    headerGradient: 'linear-gradient(135deg,#1e40af 0%,#3b82f6 100%)',
    headerTitle: 'Asset Return Request',
    headerSubtitle: 'Submitted successfully — pending HR processing',
    headerSubtitleColor: '#bfdbfe',
    recipientName: params.employeeName,
    bodyIntro: 'Your asset return request has been submitted. HR will process the physical return and update the system accordingly.',
    sectionBorderColor: '#3b82f6',
    sectionTitleColor: '#1e40af',
    sectionTitle: 'Asset Details',
    tableRows: rows,
    workflowSection: '',
    bodyOutro: 'Please coordinate with HR to hand over the physical asset at your earliest convenience.',
  };

  const subject = `Asset Return Request — ${params.assetName} (${params.assetCode})`;
  const html = await loadAssetTemplate(TEMPLATE_NAME, data);
  return { subject, html };
}

/** Asset Return — notification email sent to HR */
export async function assetReturnHREmail(params: {
  employeeName: string;
  employeeEmail: string;
  assetName: string;
  assetCode: string;
  remarks?: string;
  requestDate: string;
}): Promise<{ subject: string; html: string }> {
  const rows = [
    tr('Employee', params.employeeName),
    tr('Employee Email', params.employeeEmail, false, true),
    tr('Asset Name', params.assetName),
    tr('Asset Code', params.assetCode, true),
    tr('Request Date', params.requestDate),
    params.remarks ? tr('Remarks', params.remarks, false, true) : '',
  ].join('');

  const data: AssetEmailData = {
    headerGradient: 'linear-gradient(135deg,#7c3aed 0%,#a855f7 100%)',
    headerTitle: 'Asset Return Request — Action Required',
    headerSubtitle: 'An employee has requested to return an asset',
    headerSubtitleColor: '#e9d5ff',
    recipientName: 'HR Team',
    bodyIntro: `<strong>${params.employeeName}</strong> has submitted an asset return request. Please coordinate with the employee and process the return in the Asset Management portal.`,
    sectionBorderColor: '#a855f7',
    sectionTitleColor: '#7c3aed',
    sectionTitle: 'Return Details',
    tableRows: rows,
    workflowSection: '',
    bodyOutro: 'Please process this return in the <strong>Asset Management → Manage Assignment</strong> panel.',
  };

  const subject = `[Return Request] ${params.assetName} (${params.assetCode}) — ${params.employeeName}`;
  const html = await loadAssetTemplate(TEMPLATE_NAME, data);
  return { subject, html };
}

/** Asset Request by category — confirmation email sent to the employee */
export async function assetRequestEmployeeEmail(params: {
  employeeName: string;
  category: string;
  reason?: string;
  requestDate: string;
}): Promise<{ subject: string; html: string }> {
  const rows = [
    tr('Asset Category', params.category),
    tr('Request Date', params.requestDate),
    params.reason ? tr('Reason', params.reason, false, true) : '',
  ].join('');

  const data: AssetEmailData = {
    headerGradient: 'linear-gradient(135deg,#065f46 0%,#10b981 100%)',
    headerTitle: 'Asset Request Submitted',
    headerSubtitle: 'Pending HR Approval',
    headerSubtitleColor: '#a7f3d0',
    recipientName: params.employeeName,
    bodyIntro: 'Your asset request has been successfully submitted and is now <strong>pending HR approval</strong>.',
    sectionBorderColor: '#10b981',
    sectionTitleColor: '#065f46',
    sectionTitle: 'Request Details',
    tableRows: rows,
    workflowSection: WORKFLOW_BOX,
    bodyOutro: 'You will be notified via email once HR reviews your request.',
  };

  const subject = `Asset Request Submitted — ${params.category} — Pending HR Approval`;
  const html = await loadAssetTemplate(TEMPLATE_NAME, data);
  return { subject, html };
}

/** Asset Request by category — approval request email sent to HR */
export async function assetRequestHREmail(params: {
  employeeName: string;
  employeeEmail: string;
  category: string;
  reason?: string;
  requestDate: string;
}): Promise<{ subject: string; html: string }> {
  const rows = [
    tr('Employee', params.employeeName),
    tr('Employee Email', params.employeeEmail, false, true),
    tr('Asset Category', params.category),
    tr('Request Date', params.requestDate),
    params.reason ? tr('Reason', params.reason, false, true) : '',
  ].join('');

  const data: AssetEmailData = {
    headerGradient: 'linear-gradient(135deg,#92400e 0%,#f59e0b 100%)',
    headerTitle: 'New Asset Request — Approval Required',
    headerSubtitle: 'An employee has requested an asset',
    headerSubtitleColor: '#fde68a',
    recipientName: 'HR Team',
    bodyIntro: `<strong>${params.employeeName}</strong> has submitted a new asset request requiring your approval.`,
    sectionBorderColor: '#f59e0b',
    sectionTitleColor: '#92400e',
    sectionTitle: 'Request Details',
    tableRows: rows,
    workflowSection: HR_WORKFLOW_BOX,
    bodyOutro: '',
  };

  const subject = `[Asset Request] ${params.category} — ${params.employeeName}`;
  const html = await loadAssetTemplate(TEMPLATE_NAME, data);
  return { subject, html };
}