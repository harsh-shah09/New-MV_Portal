"use client"

import { Row, Col } from "antd"
import { LeaveBalanceCards } from "./employee/leave-balance-cards"
import { EmployeeQuickActions } from "./employee/employee-quick-actions"
import { PendingRequests } from "./employee/pending-requests"
import { RecentLeaves } from "./employee/recent-leaves"
import { UpcomingLeavesHolidays } from "./employee/upcoming-leaves-holidays"
import { LeaveUtilizationSummary } from "./employee/leave-utilization-summary"
import { TeamOnLeave } from "./employee/team-on-leave"
import { GoogleIntegration } from "./employee/google-integration"

interface EmployeeDashboardProps {
  data: any
}

export function EmployeeDashboard({ data }: EmployeeDashboardProps) {
  const leaveBalanceData = data?.leaveBalance || {
    annualLeaveRemaining: 0,
    sickLeaveCount: 0,
    emergencyLeaveCount: 0,
    plannedLeaveCount: 0,
    earnedLeaveBalance: 0
  }

  const recentLeaves = data?.recentLeaves || []
  const upcomingLeaves = data?.upcomingLeaves || []
  const pendingRequests = data?.pendingRequests || []
  const holidays = data?.holidays || []
  const teamMembers = data?.teamMembers || []

  const totalLeavesTaken = leaveBalanceData.sickLeaveCount + leaveBalanceData.emergencyLeaveCount + leaveBalanceData.plannedLeaveCount
  const totalAllowance = 18

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">Welcome Back, {data?.employeeName || 'Employee'}!</h1>
        <p className="text-blue-100">Here's your leave management overview</p>
      </div>

      {/* Leave Balance Cards */}
      <LeaveBalanceCards 
        leaveBalanceData={leaveBalanceData}
        totalAllowance={totalAllowance}
      />

      {/* Quick Actions and Pending Requests */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8}>
          <EmployeeQuickActions employeeId={data?.employeeId} />
        </Col>
        <Col xs={24} lg={16}>
          <PendingRequests pendingRequests={pendingRequests} />
        </Col>
      </Row>

      {/* Recent Leaves Table */}
      <RecentLeaves recentLeaves={recentLeaves} />

      {/* Google Integration */}
      <GoogleIntegration />

      {/* Upcoming Leaves and Holidays */}
      <UpcomingLeavesHolidays 
        upcomingLeaves={upcomingLeaves}
        holidays={holidays}
      />

      {/* Team Members */}
      <TeamOnLeave teamMembers={teamMembers} />

      {/* Leave Utilization Summary */}
      <LeaveUtilizationSummary 
        leaveBalanceData={leaveBalanceData}
        totalLeavesTaken={totalLeavesTaken}
        totalAllowance={totalAllowance}
      />
    </div>
  )
}
