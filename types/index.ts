export interface User {
  id: string
  name: string
  email: string
  role: "admin" | "hr" | "manager" | "employee"
  department?: string
  avatar?: string
}

export interface Employee {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  department: string
  position: string
  joinDate: string
  status: "active" | "intern" | "on_notice" | "resigned" | "terminated"
  active?: boolean
  salary: number
  manager?: string
  bankDetails?: BankDetails
  personalDetails?: PersonalDetails
  documents?: EmployeeDocument[]
  ndaStatus?: "pending" | "signed" | "rejected"
  profilePhoto?: string,
  title?:string
}

export interface BankDetails {
  accountHolderName: string
  bankName: string
  accountNumber: string
  ifscCode: string
  branchName?: string
}

export interface EmployeeDocument {
  id: string
  name: string
  type: "id_proof" | "address_proof" | "resume" | "contract" | "other"
  url: string
  uploadDate: string
  verified: boolean
}

export interface PersonalDetails {
  dateOfBirth?: string
  gender?: "male" | "female" | "other"
  maritalStatus?: "single" | "married" | "divorced" | "widowed"
  address?: string
  city?: string
  state?: string
  zipCode?: string
  nationality?: string
  emergencyContact?: string
  emergencyPhone?: string
  bloodGroup?: string
}

export interface LeaveRequest {
  id: string
  employeeId: string
  employeeRecordName?: string
  employeeName: string
  teamLeadName?: string
  leaveType: string
  session?: string
  sessionStart?: string
  sessionEnd?: string
  leaveCategory?: string
  startDate: string
  endDate: string
  duration: number
  totalDaysAfterRule?: number
  reason?: string
  status: "pending" | "approved" | "rejected" | "cancelled" | "applied" | "withdrawn" | "withdrawal pending"
  isWithdrawalRequest?: boolean
  approvedBy?: string
  approvalDate?: string
  tlApproved?: string
  hrApproval?: string
  tlRejectionReason?: string
  hrRejectionReason?: string
  confirmMerge ?: boolean
  mergeExistingLeaveId ?: string
  withdrawalStartDate?: string
  withdrawalEndDate?: string
  sandwichRuleApplicable?: boolean
  onePlusTwoRuleApplicable?: boolean
  doubtfullCase?: boolean
}

export interface LeavePolicy {
  id: string
  leaveType: "casual" | "sick" | "earned" | "unpaid"
  annualDays: number
  carryForwardDays: number
  minAdvanceNotice: number
}

export interface Training {
  id: string
  title: string
  description: string
  category: string
  instructor: string
  startDate: string
  endDate: string
  duration: number
  maxParticipants: number
  enrolledCount: number
  status: "scheduled" | "ongoing" | "completed"
}

export interface TrainingEnrollment {
  id: string
  trainingId: string
  employeeId: string
  enrollmentDate: string
  completionDate?: string
  score?: number
  certificateUrl?: string
  status: "enrolled" | "completed" | "dropped"
}

export interface NDA {
  id: string
  employeeId: string
  employeeName: string
  templateId: string
  signDate?: string
  expiryDate?: string
  status: "pending" | "signed" | "expired"
  documentUrl?: string
  generatedContent?: string
}

export interface NDATemplate {
  id: string
  name: string
  content: string
  type: "offer_letter" | "experience_letter" | "contract" | "other"
  createdAt: string
}

export interface Asset {
  currentValue: any
  id: string
  assetTag: string
  name: string
  serialNumber: string
  category: "laptop" | "mobile" | "headset" | "id_card" | "monitor" | "furniture" | "other"
  purchaseDate: string
  purchaseCost: number
  vendor: string
  warrantyExpiry?: string
  status: "available" | "assigned" | "in_repair" | "under_maintenance" | "lost" | "stolen" | "disposed"
  assignedTo?: string
  assignmentDate?: string
  condition?: "new" | "good" | "fair" | "poor"
  history?: AssetHistory[],
  type : "laptop" | "mobile" | "headset" | "id_card" | "monitor" | "furniture" | "other"
}

export interface AssetHistory {
  id: string
  assetId: string
  action: "allocation" | "reassignment" | "repair" | "return" | "disposal"
  date: string
  userId: string
  notes?: string
}

export interface Payroll {
  id: string
  employeeId: string
  employeeName: string
  month: string
  year: number
  basicSalary: number
  allowances: number
  deductions: number
  taxAmount: number
  netSalary: number
  status: "draft" | "processed" | "paid"
  paymentDate?: string
}

export interface PayrollSummary {
  id: string
  month: string
  year: number
  totalEmployees: number
  totalDaysAfterRule?: number
  netTotalSalary: number
  status: "draft" | "processed" | "paid"
  createdAt: string
}

export interface PayrollEmployeeDetail {
  id: string
  employeeId: string
  employeeName: string
  payrollMonth?: string
  email?: string
  department?: string
  role?: string
  dateOfJoining?: string
  pfNumber?: string
  esiNumber?: string
  uanNumber?: string
  bankName?: string
  accountNumber?: string
  year?: number
  monthlyIncome?: number
  basicSalary?: number
  baseSalary?: number
  actualMonthlyIncome?: number
  actualBasicComponent?: number
  actualHraComponent?: number
  actualConvComponent?: number
  actualSpecialAllowanceComponent?: number
  actualPerformanceComponent?: number
  actualGrossIncome?: number
  basicComponent?: number
  hraComponent?: number
  convComponent?: number
  specialAllowanceComponent?: number
  performanceComponent?: number
  grossIncome?: number
  pfDeduction?: number
  ptDeduction?: number
  esiDeduction?: number
  totalAdditions?: number
  totalDeductions?: number
  anniversaryBonus?: number
  totalLeaveDays?: number
  totalLeaveDaysAfterRule?: number
  bonus?: number
  netSalary?: number
  leaves?: PayrollLeaveDetail[]
  adjustments?: PayrollAdjustment[]
}

export interface PayrollAdjustment {
  id?: string
  adjustmentType: "Addition" | "Deduction"
  adjustmentAmount: number
  adjustmentDescription: string
}

export interface PayrollLeaveDetail {
  id: string
  leaveType: string
  leaveCategory: string
  startDate: string
  endDate: string
  totalDays: number
  totalDaysAfterRule: number
  daysInSelectedMonth: number
  status: string
  actualDeduction: number
  afterRuleDeduction: number
}

export interface CalendarEvent {
  id: string
  title: string
  description?: string
  startDate: string
  endDate: string
  eventType: "meeting" | "training" | "leave" | "holiday" | "deadline"
  category?: string
  attendees?: string[]
}

export interface Notification {
  id: string
  userId: string
  title: string
  message: string
  type: "info" | "success" | "warning" | "error"
  read: boolean
  createdAt: string
  actionUrl?: string
}

export interface DashboardStats {
  totalEmployees: number
  activeLeaves: number
  pendingApprovals: number
  completedTraining: number
}