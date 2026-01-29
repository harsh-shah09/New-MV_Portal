# Payslip Feature Implementation

## Overview
This implementation adds comprehensive payslip viewing functionality to the HRMS system, allowing both HR/Admin and employees to view detailed salary breakdowns including leave calculations, adjustments, and bonuses.

## Features Implemented

### 1. Payslip API Endpoint
**File**: `/app/api/payroll/payslips/[payrollId]/route.ts`

- Fetches detailed payroll data for a specific payroll record
- Retrieves associated leave records and calculates deductions
- Includes salary breakdown with:
  - Basic salary
  - Bonuses
  - Leave deductions (with detailed calculations)
  - Adjustments (additions/deductions)
  - Net salary

### 2. Employee Self-Service API
**File**: `/app/api/payroll/my-payrolls/route.ts`

- Allows employees to fetch their own payroll history
- Secured by employee email from session
- Returns all payroll records for the logged-in employee

### 3. Comprehensive Payslip View Component
**File**: `/components/payslip-view.tsx`

**Features**:
- Professional payslip layout with company header
- Employee information section
- Detailed salary breakdown:
  - Earnings (basic salary + bonus)
  - Deductions (leaves, adjustments)
  - Net salary with daily rate calculation
- Leave details table showing:
  - Leave type and category
  - Date range
  - Days taken in the month
  - Deduction amount
- Adjustments table (additions/deductions)
- Print functionality
- Download PDF button (placeholder for future implementation)
- Print-friendly styling

### 4. Employee Payroll Page
**File**: `/app/my-payrolls/page.tsx`

**Features**:
- Lists all payslips for the logged-in employee
- Sortable table with:
  - Month/Year
  - Basic salary
  - Bonus
  - Deductions
  - Net salary
- "View Payslip" action button
- Empty state for no payrolls
- Loading states

### 5. Enhanced Payroll Management
**Updated Files**: 
- `/app/payroll/components/payroll-employee-detail.tsx`
- `/app/payroll/components/payroll-employee-list.tsx`

**Enhancements**:
- Added tabbed interface in employee detail view:
  - Summary tab (original view)
  - Payslip tab (detailed payslip)
- Added "View" button in employee list for quick access
- Fixed expandable row type issues

### 6. Updated Navigation
**File**: `/components/sidebar.tsx`

**Changes**:
- HR/Admin users see "Payroll" menu item (payroll management)
- Regular employees see "My Payslips" menu item (view their own payslips)
- Role-based navigation ensures proper access control

### 7. Print Functionality
**File**: `/app/globals.css`

**Added**:
- Print media queries for professional payslip printing
- Hide navigation and UI elements when printing
- Optimized page breaks for tables
- A4 page size with proper margins
- Color-accurate printing support

## Data Flow

### For HR/Admin:
1. Navigate to Payroll → Select Summary → View Employee
2. Click employee row or "View" button
3. Click "Payslip" tab to see detailed breakdown
4. Print or download payslip

### For Employees:
1. Navigate to "My Payslips" from sidebar
2. See list of all their payslips
3. Click "View Payslip" button
4. View detailed breakdown
5. Print or download their payslip

## API Endpoints

| Endpoint | Method | Access | Description |
|----------|--------|--------|-------------|
| `/api/payroll/payslips/[payrollId]` | GET | All authenticated | Get detailed payslip data |
| `/api/payroll/my-payrolls` | GET | Employee | Get own payroll history |
| `/api/payroll/employees/[summaryId]` | GET | HR/Admin | Get all employees' payrolls for a summary |

## Payslip Data Structure

```typescript
{
  id: string
  employeeId: string
  employeeName: string
  email: string
  department: string
  role: string
  payrollMonth: string
  payrollYear: number
  basicSalary: number
  bonus: number
  totalAdditions: number
  totalDeductions: number
  netSalary: number
  totalLeaveDays: number
  totalLeaveDeductions: number
  leaves: Array<{
    leaveType: string
    leaveCategory: string
    startDate: string
    endDate: string
    daysInSelectedMonth: number
    actualDeduction: number
  }>
  adjustments: Array<{
    adjustmentType: "Addition" | "Deduction"
    adjustmentAmount: number
    adjustmentDescription: string
  }>
  daysInMonth: number
  dailySalary: number
}
```

## Key Calculations

### Leave Deduction
- Calculates days overlapping with the payroll month
- Formula: `(baseSalary / daysInMonth) * leaveDaysInMonth`
- Rounds to 2 decimal places

### Net Salary
- Formula: `basicSalary + bonus + totalAdditions - totalDeductions`
- Includes all leave deductions and adjustments

## Styling Features

- Professional company header
- Color-coded values (green for additions, red for deductions)
- Responsive layout
- Print-optimized styling
- Clean card-based design
- Tables for detailed breakdowns

## Future Enhancements

1. **PDF Download**: Implement actual PDF generation (currently shows placeholder)
2. **Email Payslip**: Send payslip via email to employee
3. **Payslip History Chart**: Visual representation of salary trends
4. **Comparison View**: Compare payslips across months
5. **Tax Calculations**: Add tax breakdown section
6. **Digital Signature**: Add authorized signatory section
7. **Multi-currency Support**: For international employees

## Security Considerations

- Session-based authentication required
- Employees can only view their own payslips
- HR/Admin can view all payslips
- All sensitive data retrieved from Salesforce with proper validation
- No payslip data cached client-side

## Testing Recommendations

1. Test as employee - verify can only see own payslips
2. Test as HR/Admin - verify can see all employee payslips
3. Test print functionality across browsers
4. Verify leave calculation accuracy
5. Test with various adjustment scenarios
6. Verify responsive design on mobile/tablet
7. Test with missing data (no leaves, no bonus, etc.)

## Dependencies

- Next.js 14+ (App Router)
- React Query (TanStack Query)
- Ant Design components
- Salesforce API connection
- Authentication utilities
