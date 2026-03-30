"use client"

import { Card, Statistic, Row, Col, Tooltip } from "antd"
import { TeamOutlined, InfoCircleOutlined } from "@ant-design/icons"

interface EmployeeStatsProps {
  stats: {
    totalEmployees: number
    onLeaveToday: number
    newJoinersThisMonth: number
    pendingDocuments: number
  }
}

export function EmployeeStats({ stats }: EmployeeStatsProps) {
  const renderTooltipTitle = (label: string, message: string) => (
    <span className="inline-flex items-center gap-1">
      <span>{label}</span>
      <Tooltip title={message} placement="top">
        <InfoCircleOutlined className="text-slate-400 hover:text-slate-600" />
      </Tooltip>
    </span>
  )

  return (
    <Card 
      title={
        <span className="flex items-center gap-2">
          <TeamOutlined />
          Employee Stats
        </span>
      }
      className="h-full"
    >
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12}>
          <Card className="bg-blue-50 border-blue-200">
            <Statistic
              title={renderTooltipTitle("Active Employees", "Employees currently active and not on leave are shown here.")}
              value={stats.totalEmployees - stats.onLeaveToday}
              styles={{content: { color: '#3b82f6', fontSize: '20px' }}}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card className="bg-green-50 border-green-200">
            <Statistic
              title={renderTooltipTitle("New Joiners (Month)", "Employees joined in the current month are shown here.")}
              value={stats.newJoinersThisMonth}
              styles={{content: { color: '#10b981', fontSize: '20px' }}}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card className="bg-orange-50 border-orange-200">
            <Statistic
              title={renderTooltipTitle("Pending Documents", "Employee documents pending review or completion are shown here.")}
              value={stats.pendingDocuments}
              styles={{content: { color: '#f59e0b', fontSize: '20px' }}}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card className="bg-purple-50 border-purple-200">
            <Statistic
              title={renderTooltipTitle("On Leave", "Employees with approved leave today are shown here.")}
              value={stats.onLeaveToday}
              styles={{content: { color: '#8b5cf6', fontSize: '20px' }}}
            />
          </Card>
        </Col>
      </Row>
    </Card>
  )
}
