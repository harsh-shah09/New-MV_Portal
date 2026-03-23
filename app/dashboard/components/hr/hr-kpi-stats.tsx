"use client"

import { Card, Statistic, Row, Col } from "antd"
import { 
  CheckCircleOutlined, 
  ClockCircleOutlined,
  UserOutlined,
  TeamOutlined
} from "@ant-design/icons"

interface HRKPIStatsProps {
  stats: {
    pendingApprovals: number
    approvedToday: number
    onLeaveToday: number
    totalEmployees: number
  }
  onPendingApprovalsClick?: () => void
  onApprovedTodayClick?: () => void
  onOnLeaveTodayClick?: () => void
  onTotalEmployeesClick?: () => void
}

export function HRKPIStats({
  stats,
  onPendingApprovalsClick,
  onApprovedTodayClick,
  onOnLeaveTodayClick,
  onTotalEmployeesClick,
}: HRKPIStatsProps) {
  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} sm={12} lg={6}>
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={onPendingApprovalsClick}>
          <Statistic
            title="Pending Approvals"
            value={stats.pendingApprovals}
            styles={{content: { color: '#f59e0b' }}}
            prefix={<ClockCircleOutlined />}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={onApprovedTodayClick}>
          <Statistic
            title="Approved Today"
            value={stats.approvedToday}
            styles={{content: { color: '#10b981' }}}
            prefix={<CheckCircleOutlined />}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={onOnLeaveTodayClick}>
          <Statistic
            title="On Leave Today"
            value={stats.onLeaveToday}
            styles={{content: { color: '#3b82f6' }}}
            prefix={<UserOutlined />}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={onTotalEmployeesClick}>
          <Statistic
            title="Total Employees"
            value={stats.totalEmployees}
            styles={{content: { color: '#8b5cf6' }}}
            prefix={<TeamOutlined />}
          />
        </Card>
      </Col>
    </Row>
  )
}
