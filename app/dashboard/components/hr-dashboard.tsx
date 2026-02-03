"use client"

import { Row, Col } from "antd"
import { HRKPIStats } from "./hr/hr-kpi-stats"
import { PendingApprovalsQueue } from "./hr/pending-approvals-queue"
import { LeaveAnalytics } from "./hr/leave-analytics"
import { EmployeeStats } from "./hr/employee-stats"
import { RecentActivities } from "./hr/recent-activities"
import { HRQuickActions } from "./hr/hr-quick-actions"
import { EmployeesOnLeave } from "./hr/employees-on-leave"
import { GoogleIntegration } from "./employee/google-integration"

interface HRDashboardProps {
  data: any
}

export function HRDashboard({ data }: HRDashboardProps) {
  const stats = data?.stats || {
    totalEmployees: 0,
    pendingApprovals: 0,
    approvedToday: 0,
    onLeaveToday: 0,
    pendingDocuments: 0,
    newJoinersThisMonth: 0
  }

  const recentActivities = data?.recentActivities || []
  const leaveAnalytics = data?.leaveAnalytics || {}
  const employeesOnLeave = data?.employeesOnLeave || []

  return (
    <div className="space-y-6">
      {/* KPI Stats */}
      <HRKPIStats stats={stats} />

      {/* Pending Approvals Queue */}
      <PendingApprovalsQueue />

      {/* Analytics and Stats Row */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <LeaveAnalytics leaveAnalytics={leaveAnalytics} />
        </Col>
        <Col xs={24} lg={12}>
          <EmployeeStats stats={stats} />
        </Col>
      </Row>

      {/* Recent Activities and Quick Actions */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <RecentActivities recentActivities={recentActivities} />
        </Col>
        <Col xs={24} lg={8}>
          <HRQuickActions />
        </Col>
      </Row>

      {/* Employees On Leave Today */}
      <EmployeesOnLeave employeesOnLeave={employeesOnLeave} />

      {/* Google Integration */}
      <GoogleIntegration />
    </div>
  )
}
