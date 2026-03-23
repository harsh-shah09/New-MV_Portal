"use client"

import { Card, Statistic, Row, Col } from "antd"
import { 
  CalendarOutlined, 
  ClockCircleOutlined
} from "@ant-design/icons"
import { useRouter } from "next/navigation"

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
  const router = useRouter()

  const handleViewAll = (leaveType: string, status: string = 'approved') => {
    if (leaveType === 'All') {
      router.push(`/leaves?status=${status}`)
    } else {
      router.push(`/leaves?type=${leaveType}&status=${status}`)
    }
  }

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} sm={12} lg={6}>
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleViewAll('All', 'approved')}>
          <Statistic
            title="Annual Leaves"
            value={leaveBalanceData.annualLeaveRemaining}
            suffix={`/ ${totalAllowance}`}
            styles={{content: { color: '#3b82f6' }}}
            prefix={<CalendarOutlined />}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleViewAll('Sick Leave')}>
          <Statistic
            title="Sick Leave"
            value={leaveBalanceData.sickLeaveCount}
            styles={{content: { color: '#ef4444' }}}
            prefix={<ClockCircleOutlined />}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleViewAll('Emergency Leave')}>
          <Statistic
            title="Emergency Leave"
            value={leaveBalanceData.emergencyLeaveCount}
            styles={{content: { color: '#f59e0b' }}}
            prefix={<ClockCircleOutlined />}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleViewAll('Planned Leave')}>
          <Statistic
            title="Planned Leave"
            value={leaveBalanceData.plannedLeaveCount}
            styles={{content: { color: '#10b981' }}}
            prefix={<ClockCircleOutlined />}
          />
        </Card>
      </Col>
    </Row>
  )
}
