"use client"

import { Row, Col } from "antd"
import { LeaveBalanceCards } from "./employee/leave-balance-cards"
import { EmployeeQuickActions } from "./employee/employee-quick-actions"
import { PendingRequests } from "./employee/pending-requests"
import { UpcomingLeavesHolidays } from "./employee/upcoming-leaves-holidays"
import { LeaveUtilizationSummary } from "./employee/leave-utilization-summary"
import { TeamOnLeave } from "./employee/team-on-leave"
import { GoogleIntegration } from "./employee/google-integration"
import { PageHeader } from "@/components/page-header"
import { PendingApprovalsQueue } from "./hr/pending-approvals-queue"
import EmployeeBirthday from './employee/employee-birthday'
import EmployeeAnniversary from './employee/employee-anniversary'
interface EmployeeDashboardProps {
  data: any
  hideTeamMembersWidget?: boolean
}

export function EmployeeDashboard({ data, hideTeamMembersWidget = false }: EmployeeDashboardProps) {
  const leaveBalanceData = data?.leaveBalance || {
    annualLeaveRemaining: 0,
    sickLeaveCount: 0,
    emergencyLeaveCount: 0,
    plannedLeaveCount: 0,
    earnedLeaveBalance: 0
  }

  const upcomingLeaves = data?.upcomingLeaves || []
  const pendingRequests = data?.pendingRequests || []
  const pendingApprovals = data?.pendingApprovals || []
  const holidays = data?.holidays || []
  const teamMembers = data?.teamMembers || []
  const isTeamLead = data?.isTeamLead === true

  const totalLeavesTaken = leaveBalanceData.sickLeaveCount + leaveBalanceData.emergencyLeaveCount + leaveBalanceData.plannedLeaveCount
  const totalAllowance = 18
  return (
    <div className="space-y-6">
      {/* Header Section */}
      <PageHeader 
        title={`Welcome Back, ${data?.employeeName || 'Employee'}!`}
        subtitle="Here's your leave management overview"
      />

      {/* Leave Balance Cards */}
      <LeaveBalanceCards 
        leaveBalanceData={leaveBalanceData}
        totalAllowance={totalAllowance}
      />

      {/* Quick Actions and Pending Requests */}
      <Row gutter={[16, 16]}>
        {isTeamLead && (
          <Col xs={24} lg={24}>
            <PendingApprovalsQueue initialPendingApprovals={pendingApprovals} dashboardView="default" />
          </Col>
        )}
        <Col xs={24} lg={24}>
          <PendingRequests pendingRequests={pendingRequests} />
        </Col>
        <Col xs={24} lg={8}>
          <EmployeeQuickActions employeeId={data?.employeeId} />
        </Col>
        <Col xs={24} lg={8}>
          <EmployeeBirthday data={data?.birthdayToday || []} />
        </Col>
        <Col xs={24} lg={8}>
          <EmployeeAnniversary data={data?.anniversaryToday || []} />
        </Col>
      </Row>

      {/* Upcoming Leaves and Holidays */}
      <UpcomingLeavesHolidays 
        upcomingLeaves={upcomingLeaves}
        holidays={holidays}
      />

      {/* Team Members */}
      {!hideTeamMembersWidget && <TeamOnLeave teamMembers={teamMembers} />}

      {/* Google Integration */}
      <GoogleIntegration />

      {/* Leave Utilization Summary */}
      {/* <LeaveUtilizationSummary 
        leaveBalanceData={leaveBalanceData}
        totalLeavesTaken={totalLeavesTaken}
        totalAllowance={totalAllowance}
      /> */}
    </div>
  )
}
