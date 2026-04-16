"use client"

import { Row, Col } from "antd"
import { useRouter } from "next/navigation"
import { HRKPIStats } from "./hr/hr-kpi-stats"
import { PendingApprovalsQueue } from "./hr/pending-approvals-queue"
import { LeaveAnalytics } from "./hr/leave-analytics"
import { EmployeeStats } from "./hr/employee-stats"
import { RecentActivities } from "./hr/recent-activities"
import { HRQuickActions } from "./hr/hr-quick-actions"
import { EmployeesOnLeave } from "./hr/employees-on-leave"
import { LeavesApprovedToday } from "./hr/leaves-approved-today"
import { GoogleIntegration } from "./employee/google-integration"
import { PageHeader } from "@/components/page-header"
import EmployeeBirthday from './employee/employee-birthday'
import EmployeeAnniversary from '@/app/dashboard/components/employee/employee-anniversary'

interface HRDashboardProps {
  data: any
  dashboardRole?: "HR" | "Admin"
}

export function HRDashboard({ data, dashboardRole = "HR" }: HRDashboardProps) {
  const router = useRouter()

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
  const approvedTodayLeaves = data?.approvedTodayLeaves || []
  const pendingApprovals = data?.pendingApprovals || []
  const birthdayToday = data?.birthdayToday || []
  const anniversaryToday = data?.anniversaryToday || []
  const scrollToElement = (elementId: string) => {
    const element = document.getElementById(elementId)
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <PageHeader 
        title={`${dashboardRole} Dashboard`}
        subtitle={dashboardRole === "Admin" ? "Manage organization-wide leave requests and employee data" : "Manage your organization's leave requests and employee data"}
      />

      {/* KPI Stats */}
      <HRKPIStats
        stats={stats}
        onPendingApprovalsClick={() => router.push('/leaves?tab=approvals')}
        onApprovedTodayClick={() => scrollToElement('approved-today-widget')}
        onOnLeaveTodayClick={() => scrollToElement('on-leave-today-widget')}
        onTotalEmployeesClick={() => router.push('/employees')}
      />
      <Row gutter={[16, 16]}>
      {/* Pending Approvals Queue */}
      <Col xs={24} lg={24}>
        <PendingApprovalsQueue
          initialPendingApprovals={pendingApprovals}
          dashboardView="hr"
          canUseLeaveRulesPopup={dashboardRole === "Admin"}
        />
      </Col>
      {/* Analytics and Stats Row */}
        <Col xs={24} lg={12}>
          <LeaveAnalytics leaveAnalytics={leaveAnalytics} />
        </Col>
        <Col xs={24} lg={12}>
          <EmployeeStats stats={stats} />
        </Col>
      </Row>

      {/* Recent Activities and Quick Actions */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={12}>
          <HRQuickActions />
        </Col>
        <Col xs={24} sm={12} lg={12}>
          <RecentActivities recentActivities={recentActivities} />
        </Col>
        <Col xs={24} sm={12} lg={12}>
          <EmployeeBirthday data={birthdayToday} />
        </Col>
        <Col xs={24} sm={12} lg={12}>
          {/* Anniversary Here */}
          <EmployeeAnniversary data={anniversaryToday} />
        </Col>
        <Col xs={24} sm={12} lg={12} id="on-leave-today-widget">
        {/* Employees On Leave Today */}
        <EmployeesOnLeave employeesOnLeave={employeesOnLeave} />
        </Col>
        <Col xs={24} sm={12} lg={12} id="approved-today-widget">
        {/* Leaves Approved Today */}
        <LeavesApprovedToday approvedTodayLeaves={approvedTodayLeaves} />
        </Col>
        <Col  xs={24} lg={24}>
         {/* Google Integration */}
      <GoogleIntegration />
      </Col>
      </Row>
    </div>
  )
}
