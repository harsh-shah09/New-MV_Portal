"use client"

import { Card, Progress, Statistic, Row, Col } from "antd"
import { 
  CalendarOutlined, 
  ClockCircleOutlined
} from "@ant-design/icons"

interface LeaveBalanceCardsProps {
  leaveBalanceData: {
    annualLeaveRemaining: number
    sickLeaveCount: number
    emergencyLeaveCount: number
    plannedLeaveCount: number
  }
  totalAllowance: number
}

export function LeaveBalanceCards({ leaveBalanceData, totalAllowance }: LeaveBalanceCardsProps) {
  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} sm={12} lg={6}>
        <Card className="hover:shadow-lg transition-shadow">
          <Statistic
            title="Annual Leave Remaining"
            value={leaveBalanceData.annualLeaveRemaining}
            suffix={`/ ${totalAllowance}`}
            styles={{ value: { color: '#3b82f6' } }}
            prefix={<CalendarOutlined />}
          />
          <Progress 
            percent={Math.round((leaveBalanceData.annualLeaveRemaining / totalAllowance) * 100)} 
            strokeColor="#3b82f6"
            size="small"
            className="mt-2"
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card className="hover:shadow-lg transition-shadow">
          <Statistic
            title="Sick Leave Taken"
            value={leaveBalanceData.sickLeaveCount}
            styles={{ value: { color: '#ef4444' } }}
            prefix={<ClockCircleOutlined />}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card className="hover:shadow-lg transition-shadow">
          <Statistic
            title="Emergency Leave Taken"
            value={leaveBalanceData.emergencyLeaveCount}
            styles={{ value: { color: '#f59e0b' } }}
            prefix={<ClockCircleOutlined />}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card className="hover:shadow-lg transition-shadow">
          <Statistic
            title="Planned Leave Taken"
            value={leaveBalanceData.plannedLeaveCount}
            styles={{ value: { color: '#10b981' } }}
            prefix={<ClockCircleOutlined />}
          />
        </Card>
      </Col>
    </Row>
  )
}
