"use client"

import { Card, Button, Table, Badge, message } from "antd"
import { 
  CheckCircleOutlined, 
  CloseCircleOutlined,
  ClockCircleOutlined
} from "@ant-design/icons"
import { useRouter } from "next/navigation"
import type { ColumnsType } from 'antd/es/table'
import dayjs from "dayjs"
import { useState, useEffect } from "react"

export function PendingApprovalsQueue() {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchPendingApprovals = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/dashboard')
      if (response.ok) {
        const data = await response.json()
        setPendingApprovals(data?.pendingApprovals || [])
      }
    } catch (error) {
      console.error('Error fetching pending approvals:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchPendingApprovals()
  }, [])

  const handleApprove = async (leaveId: string) => {
    setLoading(leaveId)
    try {
      const response = await fetch('/api/leave-management', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leaveId,
          action: 'approve'
        })
      })

      const result = await response.json()

      if (response.ok) {
        message.success('Leave approved successfully')
        // Refresh only this component's data
        await fetchPendingApprovals()
      } else {
        message.error(result.error || 'Failed to approve leave')
      }
    } catch (error) {
      console.error('Error approving leave:', error)
      message.error('Failed to approve leave')
    } finally {
      setLoading(null)
    }
  }

  const handleReject = async (leaveId: string) => {
    setLoading(leaveId)
    try {
      const response = await fetch('/api/leave-management', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leaveId,
          action: 'reject'
        })
      })

      const result = await response.json()

      if (response.ok) {
        message.success('Leave rejected successfully')
        // Refresh only this component's data
        await fetchPendingApprovals()
      } else {
        message.error(result.error || 'Failed to reject leave')
      }
    } catch (error) {
      console.error('Error rejecting leave:', error)
      message.error('Failed to reject leave')
    } finally {
      setLoading(null)
    }
  }

  const approvalColumns: ColumnsType<any> = [
    {
      title: 'Employee',
      dataIndex: 'employeeName',
      key: 'employeeName',
      render: (text, record) => (
        <div>
          <div className="font-medium">{text}</div>
          <div className="text-xs text-gray-500">{record.employeeId}</div>
        </div>
      )
    },
    {
      title: 'Leave Type',
      dataIndex: 'leaveType',
      key: 'leaveType',
      render: (text, record) => <span className="capitalize">{text || record.leaveCategory}</span>
    },
    {
      title: 'Duration',
      dataIndex: 'duration',
      key: 'duration',
      render: (duration) => `${duration} day(s)`
    },
    {
      title: 'Start Date',
      dataIndex: 'startDate',
      key: 'startDate',
      render: (date) => dayjs(date).format('MMM DD, YYYY')
    },
    {
      title: 'TL Status',
      dataIndex: 'tlApproved',
      key: 'tlApproved',
      render: (status) => {
        if (!status) return <Badge status="default" text="N/A" />
        return status === 'Approved' 
          ? <Badge status="success" text="Approved" />
          : <Badge status="error" text="Rejected" />
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <div className="flex gap-2">
          <Button 
            type="primary" 
            size="small" 
            icon={<CheckCircleOutlined />}
            loading={loading === record.id}
            disabled={loading !== null}
            onClick={() => handleApprove(record.id)}
          >
            Approve
          </Button>
          <Button 
            danger 
            size="small" 
            icon={<CloseCircleOutlined />}
            loading={loading === record.id}
            disabled={loading !== null}
            onClick={() => handleReject(record.id)}
          >
            Reject
          </Button>
        </div>
      )
    }
  ]

  return (
    <Card 
      title={
        <span className="flex items-center gap-2">
          <ClockCircleOutlined />
          Pending Approvals Queue
        </span>
      }
      extra={
        pendingApprovals.length > 0 && (
          <Badge count={pendingApprovals.length} style={{ backgroundColor: '#f59e0b' }} />
        )
      }
      loading={isLoading}
    >
      {pendingApprovals.length > 0 ? (
        <>
          <Table 
            dataSource={pendingApprovals.slice(0, 5)}
            columns={approvalColumns}
            pagination={false}
            rowKey="id"
            scroll={{ x: 800 }}
          />
          {pendingApprovals.length > 5 && (
            <div className="text-center mt-4">
              <Button type="primary" onClick={() => router.push('/leaves?tab=approvals&status=applied')}>
                View All {pendingApprovals.length} Pending Requests
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12 text-gray-500">
          <CheckCircleOutlined style={{ fontSize: 64, opacity: 0.3 }} />
          <p className="mt-4 text-lg">All caught up! No pending approvals.</p>
        </div>
      )}
    </Card>
  )
}
