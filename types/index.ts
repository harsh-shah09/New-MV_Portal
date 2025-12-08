export interface User {
  id: string
  name: string
  email: string
  role: "admin" | "manager" | "employee"
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
  status: "active" | "inactive" | "on_leave"
  salary: number
  manager?: string
  bankAccountNumber?: string
  bankName?: string
  personalDetails?: PersonalDetails
  ndaStatus?: "pending" | "signed" | "rejected"
}

export interface PersonalDetails {
  dateOfBirth?: string
  address?: string
  city?: string
  state?: string
  zipCode?: string
  nationality?: string
  emergencyContact?: string
  emergencyPhone?: string
}

export interface LeaveRequest {
  id: string
  employeeId: string
  employeeName: string
  leaveType: "annual" | "sick" | "personal" | "maternity" | "sabbatical"
  startDate: string
  endDate: string
  duration: number
  reason: string
  status: "pending" | "approved" | "rejected" | "cancelled"
  approvedBy?: string
  approvalDate?: string
}

export interface LeavePolicy {
  id: string
  leaveType: string
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
  signDate: string
  expiryDate: string
  status: "pending" | "signed" | "expired"
  documentUrl: string
}

export interface Asset {
  id: string
  assetTag: string
  name: string
  type: "laptop" | "phone" | "tablet" | "monitor" | "other"
  category: string
  purchaseDate: string
  purchasePrice: number
  currentValue: number
  status: "available" | "assigned" | "damaged" | "retired"
  assignedTo?: string
  assignmentDate?: string
  depreciationRate: number
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
