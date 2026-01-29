# Payslip PDF Generation and S3 Storage Implementation

## Overview
Implemented automated PDF generation and S3 storage for employee payslips during payroll generation process.

## Features Implemented

### 1. PDF Generation (`lib/pdf-generator.ts`)
- Generates professional payslip PDFs using Puppeteer
- Includes all payroll details:
  - Employee information
  - Earnings breakdown (Basic, Bonus, Extra Day Pay, Adjustments)
  - Deductions breakdown (Leave deductions with rule indicators, Adjustment deductions)
  - Leave details table with sandwich (🥪) and 1+2 rule indicators
  - Net payable amount
- Fully styled HTML-to-PDF conversion with proper formatting

### 2. S3 Upload (`lib/s3.ts`)
- New function: `uploadPayslipToS3()`
- Uploads PDFs to S3 bucket in organized folder structure
- File naming convention: `Payslip_{EmployeeId}_{Month}_{Year}.pdf`
- Storage location: `Payrolls/` folder in S3 bucket

### 3. Integration with Payroll Save (`app/api/payroll/save/route.ts`)
- Automatically generates PDFs for all employees after payroll record creation
- Uploads each PDF to S3
- Returns upload results including S3 URLs
- Handles errors gracefully per employee

## File Structure

```
Payrolls/
├── Payslip_a03dM00001TOBQvQAP_January_2026.pdf
├── Payslip_a03dM00001TMMqUQAX_January_2026.pdf
└── ...
```

## API Response Example

```json
{
  "payrollSummaryId": "xxxxx",
  "payrollResults": [...],
  "totalRecordsCreated": 4,
  "pdfUploadResults": [
    {
      "employeeId": "a03dM00001TOBQvQAP",
      "employeeName": "John Doe",
      "success": true,
      "s3Url": "https://bucket.s3.region.amazonaws.com/Payrolls/Payslip_a03dM00001TOBQvQAP_January_2026.pdf"
    }
  ]
}
```

## Environment Variables Required

Make sure these are set in your `.env` file:
- `AWS_REGION` - AWS region (e.g., us-east-1)
- `AWS_ACCESS_KEY_ID` - AWS access key
- `AWS_SECRET_ACCESS_KEY` - AWS secret key
- `S3_BUCKET_NAME` - S3 bucket name

## Dependencies Added

- `puppeteer` - For HTML to PDF conversion

## How It Works

1. **Payroll Save Request** → `/api/payroll/save`
2. **Create Payroll Records** in Salesforce
3. **For Each Employee:**
   - Generate payslip data with all details (earnings, deductions, leaves, adjustments)
   - Generate PDF using HTML template
   - Upload PDF to S3 with structured naming
4. **Return Results** with S3 URLs for all generated payslips

## Benefits

✅ **Automated**: PDFs generated automatically during payroll save
✅ **Organized**: Structured folder and naming convention
✅ **Accessible**: S3 URLs can be stored in Salesforce for easy access
✅ **Professional**: High-quality PDF formatting matching payslip view
✅ **Comprehensive**: Includes all details (earnings, deductions, leaves with rules, adjustments)
