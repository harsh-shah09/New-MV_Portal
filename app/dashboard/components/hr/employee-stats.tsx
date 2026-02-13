"use client"

import { Card, Statistic, Row, Col } from "antd"
import { TeamOutlined } from "@ant-design/icons"

interface EmployeeStatsProps {
  stats: {
    totalEmployees: number
    onLeaveToday: number
    newJoinersThisMonth: number
    pendingDocuments: number
  }
}

export function EmployeeStats({ stats }: EmployeeStatsProps) {
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
        <Col span={12}>
          <Card className="bg-blue-50 border-blue-200">
            <Statistic
              title="Active Employees"
              value={stats.totalEmployees - stats.onLeaveToday}
              styles={{content: { color: '#3b82f6', fontSize: '24px' }}}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card className="bg-green-50 border-green-200">
            <Statistic
              title="New Joiners (Month)"
              value={stats.newJoinersThisMonth}
              styles={{content: { color: '#10b981', fontSize: '24px' }}}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card className="bg-orange-50 border-orange-200">
            <Statistic
              title="Pending Documents"
              value={stats.pendingDocuments}
              styles={{content: { color: '#f59e0b', fontSize: '24px' }}}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card className="bg-purple-50 border-purple-200">
            <Statistic
              title="On Leave"
              value={stats.onLeaveToday}
              styles={{content: { color: '#8b5cf6', fontSize: '24px' }}}
            />
          </Card>
        </Col>
      </Row>
    </Card>
  )
}
