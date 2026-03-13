"use client"

import { Card, Progress, Statistic, Row, Col, Button } from "antd"
import { 
  CalendarOutlined, 
  ClockCircleOutlined,
  EyeOutlined
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
        <Card className="hover:shadow-lg transition-shadow">
          <Statistic
            title="Annual Leave Remaining"
            value={leaveBalanceData.annualLeaveRemaining}
            suffix={`/ ${totalAllowance}`}
            styles={{content: { color: '#3b82f6' }}}
            prefix={<CalendarOutlined />}
          />
          <Progress 
            percent={Math.round((leaveBalanceData.annualLeaveRemaining / totalAllowance) * 100)} 
            strokeColor="#3b82f6"
            size="small"
            className="mt-2"
          />
          <Button 
            type="link" 
            size="small" 
            icon={<EyeOutlined />}
            onClick={() => handleViewAll('All', 'approved')}
            className="mt-2 px-0"
          >
            View All
          </Button>
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card className="hover:shadow-lg transition-shadow">
          <Statistic
            title="Sick Leave Taken"
            value={leaveBalanceData.sickLeaveCount}
            styles={{content: { color: '#ef4444' }}}
            prefix={<ClockCircleOutlined />}
          />
          <Button 
            type="link" 
            size="small" 
            icon={<EyeOutlined />}
            onClick={() => handleViewAll('Sick Leave')}
            className="mt-2 px-0"
          >
            View All
          </Button>
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card className="hover:shadow-lg transition-shadow">
          <Statistic
            title="Emergency Leave Taken"
            value={leaveBalanceData.emergencyLeaveCount}
            styles={{content: { color: '#f59e0b' }}}
            prefix={<ClockCircleOutlined />}
          />
          <Button 
            type="link" 
            size="small" 
            icon={<EyeOutlined />}
            onClick={() => handleViewAll('Emergency Leave')}
            className="mt-2 px-0"
          >
            View All
          </Button>
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card className="hover:shadow-lg transition-shadow">
          <Statistic
            title="Planned Leave Taken"
            value={leaveBalanceData.plannedLeaveCount}
            styles={{content: { color: '#10b981' }}}
            prefix={<ClockCircleOutlined />}
          />
          <Button 
            type="link" 
            size="small" 
            icon={<EyeOutlined />}
            onClick={() => handleViewAll('Planned Leave')}
            className="mt-2 px-0"
          >
            View All
          </Button>
        </Card>
      </Col>
    </Row>
  )
}
