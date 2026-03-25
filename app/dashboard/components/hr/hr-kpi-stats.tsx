"use client"

import { Card, Statistic, Row, Col, Tooltip } from "antd"
import { 
  CheckCircleOutlined, 
  ClockCircleOutlined,
  UserOutlined,
  TeamOutlined,
  InfoCircleOutlined
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
  const renderTooltipTitle = (label: string, message: string) => (
    <span className="inline-flex items-center gap-1">
      <span>{label}</span>
      <Tooltip title={message} placement="top">
        <InfoCircleOutlined className="text-slate-400 hover:text-slate-600" onClick={(e) => e.stopPropagation()} />
      </Tooltip>
    </span>
  )

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} sm={12} lg={6}>
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={onPendingApprovalsClick}>
          <Statistic
            title={renderTooltipTitle("Pending Approvals", "Leave requests waiting for HR/Admin action are shown here.")}
            value={stats.pendingApprovals}
            styles={{content: { color: '#f59e0b' }}}
            prefix={<ClockCircleOutlined />}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={onApprovedTodayClick}>
          <Statistic
            title={renderTooltipTitle("Approved Today", "Leave requests approved today are shown here.")}
            value={stats.approvedToday}
            styles={{content: { color: '#10b981' }}}
            prefix={<CheckCircleOutlined />}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={onOnLeaveTodayClick}>
          <Statistic
            title={renderTooltipTitle("On Leave Today", "Employees with approved leave for today are shown here.")}
            value={stats.onLeaveToday}
            styles={{content: { color: '#3b82f6' }}}
            prefix={<UserOutlined />}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={onTotalEmployeesClick}>
          <Statistic
            title={renderTooltipTitle("Total Employees", "Total active employees in the organization are shown here.")}
            value={stats.totalEmployees}
            styles={{content: { color: '#8b5cf6' }}}
            prefix={<TeamOutlined />}
          />
        </Card>
      </Col>
    </Row>
  )
}
