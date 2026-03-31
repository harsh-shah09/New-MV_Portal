# Leave Email Templates

This directory contains professional HTML email templates for all leave-related notifications in the HRMS system.

## Templates

### New Multi-Role Leave Flow
1. **employee-request-to-hr.html** - Sent to HR when an employee submits a leave request (CC: Team Lead, Admin)
2. **tl-decision-to-hr.html** - Sent to HR when Team Lead approves/rejects employee leave (CC: Employee, Admin)
3. **hr-decision-to-employee.html** - Sent to employee when HR approves/rejects after TL decision (CC: Team Lead, Admin)
4. **team-lead-request-to-hr-cc-admin.html** - Sent to HR when Team Lead submits leave request (CC: Admin)
5. **hr-decision-to-team-lead.html** - Sent to Team Lead when HR approves/rejects Team Lead leave (CC: Admin)
6. **hr-request-to-admin.html** - Sent to Admin when HR submits leave request
7. **admin-decision-to-hr.html** - Sent to HR when Admin approves/rejects HR leave

### Leave Request Flow
8. **new-request-to-team-lead.html** - Sent to Team Lead when an employee submits a new leave request
9. **team-lead-request-to-hr.html** - Sent to HR when a Team Lead submits a leave request
10. **tl-approval-to-hr.html** - Sent to HR when a Team Lead approves an employee's leave request
11. **leave-approved-by-tl.html** - Sent to employee when their leave is approved by Team Lead
12. **leave-approved-final.html** - Sent to employee when their leave receives final HR/Admin approval
13. **leave-auto-approved.html** - Sent to Team Lead when HR/Admin applies and auto-approves leave for an employee
14. **leave-rejected.html** - Sent to employee when their leave request is rejected

### Leave Withdrawal Flow
15. **withdrawal-request-submitted.html** - Sent to employee confirming their withdrawal request submission
16. **withdrawal-request-to-hr.html** - Sent to HR when an employee requests to withdraw approved leave
17. **withdrawal-approved.html** - Sent to employee when HR approves the withdrawal request
18. **withdrawal-rejected.html** - Sent to employee when HR rejects the withdrawal request

### Legacy
19. **leave-withdrawn.html** - Legacy template for direct withdrawals (no approval needed)

## Features

- **Modern, responsive design** - Works perfectly on desktop and mobile devices
- **Professional styling** - Clean, corporate look with gradient headers and card-based layouts
- **Color-coded headers** - Different colors for different types of notifications:
  - 🟢 Green - Approvals and success
  - 🔴 Red - Rejections
  - 🟠 Orange - Withdrawal requests (action required)
  - 🔵 Blue - Pending/Information
- **Mobile-optimized** - Fully responsive with mobile-friendly layouts
- **Accessible** - High contrast and clear typography for readability
- **Consistent branding** - MV Clouds branding throughout all templates

## Template Variables

Each template uses placeholders that are replaced with actual data:

- `{{recipientName}}` - Name of the email recipient
- `{{employeeName}}` - Name of the employee requesting leave
- `{{leaveType}}` - Type of leave (Annual, Sick, etc.)
- `{{startDate}}` - Leave start date
- `{{endDate}}` - Leave end date
- `{{duration}}` - Number of days
- `{{approverTitle}}` - Title of the approver (Team Lead, HR, Admin)
- `{{teamLeadName}}` - Name of the Team Lead
- `{{decisionStatus}}` - Decision status text (Approved/Rejected)
- `{{decisionStatusClass}}` - CSS status class (`approved` or `rejected`)
- `{{reason}}` - Rejection reason (conditional, only for rejection template)
- `{{year}}` - Current year for footer

## Usage

These templates are loaded by the `lib/email-templates.ts` file, which:
1. Reads the HTML template file
2. Replaces placeholders with actual data
3. Returns the formatted HTML for email sending

## New Approval Workflow (Requested)

1. Employee applies leave → email to HR (`employee-request-to-hr.html`), CC Team Lead + Admin
2. Team Lead approves/rejects → email to HR (`tl-decision-to-hr.html`), CC Employee + Admin
3. HR approves/rejects employee leave → email to Employee (`hr-decision-to-employee.html`), CC Team Lead + Admin
4. Team Lead applies leave → email to HR (`team-lead-request-to-hr-cc-admin.html`), CC Admin
5. HR approves/rejects Team Lead leave → email to Team Lead (`hr-decision-to-team-lead.html`), CC Admin
6. HR applies leave → email to Admin (`hr-request-to-admin.html`)
7. Admin approves/rejects HR leave → email to HR (`admin-decision-to-hr.html`)

## Withdrawal Workflow

The withdrawal workflow requires HR approval:
1. Employee requests withdrawal → `withdrawal-request-submitted.html` sent to employee
2. HR receives notification → `withdrawal-request-to-hr.html` sent to HR
3. HR approves → `withdrawal-approved.html` sent to employee, balance restored
4. HR rejects → `withdrawal-rejected.html` sent to employee, leave remains approved

## Customization

To customize a template:
1. Open the desired HTML file
2. Modify the HTML/CSS as needed
3. Save the file - changes take effect immediately

### Color Scheme

- **Purple/Violet** (#667eea, #764ba2) - New requests to Team Lead
- **Purple** (#8b5cf6, #6366f1) - Team Lead requests to HR
- **Cyan** (#06b6d4, #0891b2) - HR requests to Admin
- **Green** (#10b981, #059669) - Approvals
- **Red** (#ef4444, #dc2626) - Rejections
- **Amber** (#f59e0b, #d97706) - Withdrawals

## Development Notes

- Templates use inline CSS for maximum email client compatibility
- All templates are self-contained (no external CSS dependencies)
- Images/icons are emoji for universal support without hosting requirements
- Gradients and modern CSS are used but degrade gracefully in older clients
