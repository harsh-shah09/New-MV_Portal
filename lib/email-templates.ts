/**
 * Email Templates for Leave Management
 * Professional HTML email templates for all leave-related notifications
 * Templates are loaded from HTML files in public/email-templates/leave/
 */

import fs from 'fs';
import path from 'path';

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
}

/**
 * Load HTML template from file and replace placeholders with data
 */
function loadTemplate(templateName: string, data: LeaveEmailData): string {
  const templatePath = path.join(process.cwd(), 'public', 'email-templates', 'leave', `${templateName}.html`);
  let html = fs.readFileSync(templatePath, 'utf-8');
  
  // Replace placeholders
  html = html.replace(/{{recipientName}}/g, data.recipientName || 'Employee');
  html = html.replace(/{{employeeName}}/g, data.employeeName || 'Unknown');
  html = html.replace(/{{leaveType}}/g, data.leaveType || 'N/A');
  html = html.replace(/{{startDate}}/g, data.startDate || 'N/A');
  html = html.replace(/{{endDate}}/g, data.endDate || 'N/A');
  html = html.replace(/{{duration}}/g, String(data.duration || 0));
  html = html.replace(/{{approverTitle}}/g, data.approverTitle || 'Approver');
  html = html.replace(/{{teamLeadName}}/g, data.teamLeadName || 'Team Lead');
  html = html.replace(/{{year}}/g, new Date().getFullYear().toString());
  
  // Handle conditional reason display (for rejection template)
  if (data.reason) {
    html = html.replace(/{{#if reason}}/g, '');
    html = html.replace(/{{\/if}}/g, '');
    html = html.replace(/{{reason}}/g, data.reason);
  } else {
    // Remove the entire conditional block if no reason
    html = html.replace(/{{#if reason}}[\s\S]*?{{\/if}}/g, '');
  }
  
  return html;
}

/**
 * Template: New Leave Request to Team Lead
 */
export function newLeaveRequestToTeamLead(data: LeaveEmailData): { subject: string; html: string; text: string } {
  const subject = `New Leave Request from ${data.employeeName}`;
  const html = loadTemplate('new-request-to-team-lead', data);
  const text = `Dear ${data.recipientName},\n\nA new leave request has been submitted by ${data.employeeName}.\n\nLeave Details:\n- Employee: ${data.employeeName}\n- Leave Type: ${data.leaveType}\n- Start Date: ${data.startDate}\n- End Date: ${data.endDate}\n- Duration: ${data.duration} day(s)\n\nPlease log in to the HRMS portal to review and take action.\n\nRegards,\nHR Team`;
  
  return { subject, html, text };
}

/**
 * Template: Team Lead Leave Request to HR
 */
export function teamLeadLeaveRequestToHR(data: LeaveEmailData): { subject: string; html: string; text: string } {
  const subject = `Leave Request from Team Lead - ${data.employeeName}`;
  const html = loadTemplate('team-lead-request-to-hr', data);
  const text = `Dear HR,\n\nA new leave request has been submitted by ${data.employeeName} (Team Lead).\n\nPlease review and approve.\n\nRegards,\nHRMS System`;
  
  return { subject, html, text };
}

/**
 * Template: HR Leave Request to Admin
 */
export function hrLeaveRequestToAdmin(data: LeaveEmailData): { subject: string; html: string; text: string } {
  const subject = `Leave Request from HR - ${data.employeeName}`;
  const html = loadTemplate('hr-request-to-admin', data);
  const text = `Dear ${data.recipientName},\n\nA new leave request has been submitted by ${data.employeeName} (HR).\n\nPlease review and approve.\n\nRegards,\nHRMS System`;
  
  return { subject, html, text };
}

/**
 * Template: Team Lead Approval Notification to HR
 */
export function tlApprovalToHR(data: LeaveEmailData): { subject: string; html: string; text: string } {
  const subject = `Leave Approved by Team Lead - ${data.employeeName}`;
  const html = loadTemplate('tl-approval-to-hr', data);
  const text = `Dear HR,\n\nA new leave request has been submitted by ${data.employeeName} and approved by Team Lead ${data.teamLeadName}.`;
  
  return { subject, html, text };
}

/**
 * Template: Leave Approved by Team Lead (to Employee)
 */
export function leaveApprovedByTL(data: LeaveEmailData): { subject: string; html: string; text: string } {
  const subject = `Leave Request Approved by Team Lead`;
  const html = loadTemplate('leave-approved-by-tl', data);
  const text = `Dear ${data.recipientName},\n\nYour leave request has been Approved by your Team Lead.\n\nRegards,\nHR Team`;
  
  return { subject, html, text };
}

/**
 * Template: Leave Approved by HR/Admin (Final Approval)
 */
export function leaveApprovedFinal(data: LeaveEmailData): { subject: string; html: string; text: string } {
  const subject = `Leave Request Approved - Final Confirmation`;
  const html = loadTemplate('leave-approved-final', data);
  const text = `Dear ${data.recipientName},\n\nYour leave request has been Approved by ${data.approverTitle}.\n\nRegards,\nHRMS System`;
  
  return { subject, html, text };
}

/**
 * Template: Leave Auto-Approved (to Team Lead)
 */
export function leaveAutoApproved(data: LeaveEmailData): { subject: string; html: string; text: string } {
  const subject = `Leave Auto-Approved for ${data.employeeName}`;
  const html = loadTemplate('leave-auto-approved', data);
  const text = `Dear ${data.recipientName},\n\n${data.approverTitle} has applied and auto-approved leave on behalf of ${data.employeeName}.\n\nLeave Details:\n- Type: ${data.leaveType}\n- Category: Loss of Pay\n- Start Date: ${data.startDate}\n- End Date: ${data.endDate}\n- Duration: ${data.duration} day(s)\n\nRegards,\nHRMS System`;

  return { subject, html, text };
}

/**
 * Template: Leave Rejected by Team Lead/HR/Admin
 */
export function leaveRejected(data: LeaveEmailData): { subject: string; html: string; text: string } {
  const subject = `Leave Request Rejected`;
  const html = loadTemplate('leave-rejected', data);
  const text = `Dear ${data.recipientName},\n\nYour leave request has been Rejected by ${data.approverTitle}.\n${data.reason ? `\nReason: ${data.reason}\n` : ''}\nRegards,\nHRMS System`;
  
  return { subject, html, text };
}

/**
 * Template: Leave Withdrawn
 */
export function leaveWithdrawn(data: LeaveEmailData): { subject: string; html: string; text: string } {
  const subject = `Leave Request Withdrawn - Balance Restored`;
  const html = loadTemplate('leave-withdrawn', data);
  const text = `Dear ${data.recipientName || 'Employee'},\n\nYour leave request has been Withdrawn.\n\nRegards,\nHR Team`;
  
  return { subject, html, text };
}

/**
 * Template: Withdrawal Request Submitted (to Employee)
 */
export function withdrawalRequestSubmitted(data: LeaveEmailData): { subject: string; html: string; text: string } {
  const subject = `Withdrawal Request Submitted - Pending HR Approval`;
  const html = loadTemplate('withdrawal-request-submitted', data);
  const text = `Dear ${data.recipientName},\n\nYour request to withdraw the approved leave has been successfully submitted and is now pending HR approval.\n\nLeave Details:\n- Leave Type: ${data.leaveType}\n- Start Date: ${data.startDate}\n- End Date: ${data.endDate}\n- Duration: ${data.duration} day(s)\n\nYou will be notified once HR reviews your request.\n\nRegards,\nHRMS System`;
  
  return { subject, html, text };
}

/**
 * Template: Withdrawal Request to HR
 */
export function withdrawalRequestToHR(data: LeaveEmailData): { subject: string; html: string; text: string } {
  const subject = `Withdrawal Request: ${data.employeeName} - Leave from ${data.startDate} to ${data.endDate}`;
  const html = loadTemplate('withdrawal-request-to-hr', data);
  const text = `Dear HR Team,\n\n${data.employeeName} has requested to withdraw their approved leave.\n\nLeave Details:\n- Employee: ${data.employeeName}\n- Leave Type: ${data.leaveType}\n- Start Date: ${data.startDate}\n- End Date: ${data.endDate}\n- Duration: ${data.duration} day(s)\n\nPlease review and approve or reject this withdrawal request through the HRMS portal.\n\nRegards,\nHRMS System`;
  
  return { subject, html, text };
}

/**
 * Template: Withdrawal Approved (to Employee)
 */
export function withdrawalApproved(data: LeaveEmailData): { subject: string; html: string; text: string } {
  const subject = `Withdrawal Approved - Leave from ${data.startDate} to ${data.endDate}`;
  const html = loadTemplate('withdrawal-approved', data);
  const text = `Dear ${data.recipientName},\n\nYour withdrawal request has been approved by ${data.approverTitle}. The leave has been successfully withdrawn and your leave balance has been restored.\n\nLeave Details:\n- Leave Type: ${data.leaveType}\n- Start Date: ${data.startDate}\n- End Date: ${data.endDate}\n- Duration: ${data.duration} day(s)\n\nRegards,\nHRMS System`;
  
  return { subject, html, text };
}

/**
 * Template: Withdrawal Rejected (to Employee)
 */
export function withdrawalRejected(data: LeaveEmailData): { subject: string; html: string; text: string } {
  const subject = `Withdrawal Rejected - Leave from ${data.startDate} to ${data.endDate}`;
  const html = loadTemplate('withdrawal-rejected', data);
  const text = `Dear ${data.recipientName},\n\nYour withdrawal request has been rejected by ${data.approverTitle}. Your leave remains approved and active.\n\n${data.reason ? `Reason: ${data.reason}\n\n` : ''}Leave Details:\n- Leave Type: ${data.leaveType}\n- Start Date: ${data.startDate}\n- End Date: ${data.endDate}\n- Duration: ${data.duration} day(s)\n\nRegards,\nHRMS System`;
  
  return { subject, html, text };
}

/**
 * Template: Welcome Email
 */
export function welcomeEmail(data: { recipientName: string; setupLink: string }): { subject: string; html: string; text: string } {
    const subject = `Welcome to MV Clouds Team!`;
    const templatePath = path.join(process.cwd(), 'public', 'email-templates', 'leave', 'welcome-email.html');
    let html = fs.readFileSync(templatePath, 'utf-8');

    html = html.replace(/{{recipientName}}/g, data.recipientName);
    html = html.replace(/{{setupLink}}/g, data.setupLink);
    html = html.replace(/{{year}}/g, new Date().getFullYear().toString());
    
    const text = `Dear ${data.recipientName},\n\nWelcome to MV Clouds! Please set up your account here: ${data.setupLink}`;
    return { subject, html, text };
}
