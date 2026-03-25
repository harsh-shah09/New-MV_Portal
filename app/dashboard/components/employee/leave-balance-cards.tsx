"use client"

import { Card, Statistic, Row, Col, Tooltip } from "antd"
import { 
  CalendarOutlined, 
  ClockCircleOutlined,
  InfoCircleOutlined
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

  const renderTooltipTitle = (label: string, message: string) => (
    <span className="inline-flex items-center gap-1">
      <span>{label}</span>
      <Tooltip title={message} placement="top">
        <InfoCircleOutlined className="text-slate-400 hover:text-slate-600" onClick={(e) => e.stopPropagation()} />
      </Tooltip>
    </span>
  )

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
            title={renderTooltipTitle("Annual Leaves", "Approved annual leaves and remaining balance will be shown here.")}
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
            title={renderTooltipTitle("Sick Leave", "Approved sick leaves will be shown here.")}
            value={leaveBalanceData.sickLeaveCount}
            styles={{content: { color: '#ef4444' }}}
            prefix={<ClockCircleOutlined />}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleViewAll('Emergency Leave')}>
          <Statistic
            title={renderTooltipTitle("Emergency Leave", "Approved emergency leaves will be shown here.")}
            value={leaveBalanceData.emergencyLeaveCount}
            styles={{content: { color: '#f59e0b' }}}
            prefix={<ClockCircleOutlined />}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleViewAll('Planned Leave')}>
          <Statistic
            title={renderTooltipTitle("Planned Leave", "Approved planned leaves will be shown here.")}
            value={leaveBalanceData.plannedLeaveCount}
            styles={{content: { color: '#10b981' }}}
            prefix={<ClockCircleOutlined />}
          />
        </Card>
      </Col>
    </Row>
  )
}
