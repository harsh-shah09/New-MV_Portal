"use client"

import { Card, Button } from "antd"
import { 
  CheckCircleOutlined,
  PlusOutlined,
  HomeOutlined,
  FileTextOutlined,
  TeamOutlined,
  DownloadOutlined
} from "@ant-design/icons"
import { useRouter } from "next/navigation"

export function HRQuickActions() {
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
          icon={<CheckCircleOutlined />}
          onClick={() => router.push('/leaves?tab=approvals')}
        >
          Review Approvals
        </Button>
        <Button 
          block 
          size="large"
          icon={<HomeOutlined />}
          onClick={() => router.push('/holidays')}
        >
          Manage Holidays
        </Button>
        {/* <Button 
          block 
          size="large"
          icon={<FileTextOutlined />}
          onClick={() => router.push('/documents')}
        >
          Document Templates
        </Button> */}
        <Button 
          block 
          size="large"
          icon={<TeamOutlined />}
          onClick={() => router.push('/employees')}
        >
          View Employees
        </Button>
        {/* <Button 
          block 
          size="large"
          icon={<DownloadOutlined />}
          onClick={() => console.log('Generate report')}
        >
          Generate Report
        </Button> */}
      </div>
    </Card>
  )
}
