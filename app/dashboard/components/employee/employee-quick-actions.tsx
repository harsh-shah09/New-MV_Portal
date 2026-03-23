"use client"

import { Card, Button } from "antd"
import { 
  CalendarOutlined,
  FileTextOutlined,
  UserOutlined,
  PlusOutlined,
  HomeOutlined
} from "@ant-design/icons"
import { useRouter } from "next/navigation"

interface EmployeeQuickActionsProps {
  employeeId?: string
}

export function EmployeeQuickActions({ employeeId }: EmployeeQuickActionsProps) {
  const router = useRouter()

  return (
    <Card 
      title={
        <span className="flex items-center gap-2">
          <PlusOutlined />
          Quick Actions
        </span>
      }
      className="h-full"
    >
      <div className="space-y-3">
        <Button 
          type="primary" 
          block 
          size="large"
          icon={<CalendarOutlined />}
          onClick={() => router.push('/leaves?openRequest=true')}
        >
          Request Leave
        </Button>
        {/* <Button 
          block 
          size="large"
          icon={<FileTextOutlined />}
          onClick={() => router.push('/documents')}
        >
          View Documents
        </Button> */}
        <Button 
          block 
          size="large"
          icon={<UserOutlined />}
          onClick={() => router.push('/employees/' + employeeId)}
        >
          My Profile
        </Button>
        <Button 
          block 
          size="large"
          icon={<HomeOutlined />}
          onClick={() => router.push('/holidays')}
        >
          View Holidays
        </Button>
      </div>
    </Card>
  )
}
