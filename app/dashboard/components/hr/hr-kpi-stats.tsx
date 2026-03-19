"use client"

import { Card, Button, Statistic, Row, Col } from "antd"
import { 
  CheckCircleOutlined, 
  ClockCircleOutlined,
  UserOutlined,
  TeamOutlined
} from "@ant-design/icons"
import { useRouter } from "next/navigation"
import { color } from "framer-motion"

interface HRKPIStatsProps {
  stats: {
    pendingApprovals: number
    approvedToday: number
    onLeaveToday: number
    totalEmployees: number
  }
}

export function HRKPIStats({ stats }: HRKPIStatsProps) {
  const router = useRouter()
  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} sm={12} lg={6}>
        <Card className="hover:shadow-lg transition-shadow">
          <Statistic
            title="Pending Approvals"
            value={stats.pendingApprovals}
            styles={{content: { color: '#f59e0b' }}}
            prefix={<ClockCircleOutlined />}
          />
          {/* <Button 
            type="link" 
            size="small" 
            className="mt-2 p-0"
            onClick={() => router.push('/leaves?tab=approvals&status=applied')}
          >
            View All
          </Button> */}
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card className="hover:shadow-lg transition-shadow">
          <Statistic
            title="Approved Today"
            value={stats.approvedToday}
            styles={{content: { color: '#10b981' }}}
            prefix={<CheckCircleOutlined />}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card className="hover:shadow-lg transition-shadow">
          <Statistic
            title="On Leave Today"
            value={stats.onLeaveToday}
            styles={{content: { color: '#3b82f6' }}}
            prefix={<UserOutlined />}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card className="hover:shadow-lg transition-shadow">
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
