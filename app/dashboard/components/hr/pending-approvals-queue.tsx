"use client"

import { Card, Button, Table, Badge, message, Tooltip, Modal, Input } from "antd"
import { 
  CheckCircleOutlined, 
  CloseCircleOutlined,
  ClockCircleOutlined,
  InfoCircleOutlined
} from "@ant-design/icons"
import { useRouter } from "next/navigation"
import type { ColumnsType } from 'antd/es/table'
import dayjs from "dayjs"
import { useState, useEffect } from "react"

interface PendingApprovalsQueueProps {
  initialPendingApprovals?: any[]
  dashboardView?: "default" | "hr"
}

export function PendingApprovalsQueue({ initialPendingApprovals = [], dashboardView = "default" }: PendingApprovalsQueueProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [pendingApprovals, setPendingApprovals] = useState<any[]>(initialPendingApprovals)
  const [isLoading, setIsLoading] = useState(true)
  const [rejectModalVisible, setRejectModalVisible] = useState(false)
  const [rejectingLeaveId, setRejectingLeaveId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState("")

  const fetchPendingApprovals = async () => {
    try {
      setIsLoading(true)
      const query = dashboardView === 'hr' ? '?view=hr' : ''
      const response = await fetch(`/api/dashboard${query}`)
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
    setPendingApprovals(initialPendingApprovals)
  }, [initialPendingApprovals])

  useEffect(() => {
    fetchPendingApprovals()
  }, [dashboardView])

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

  const handleReject = async (leaveId: string, reason: string): Promise<boolean> => {
    setLoading(leaveId)
    try {
      const response = await fetch('/api/leave-management', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leaveId,
          action: 'reject',
          reason
        })
      })

      const result = await response.json()

      if (response.ok) {
        message.success('Leave rejected successfully')
        // Refresh only this component's data
        await fetchPendingApprovals()
        return true
      } else {
        message.error(result.error || 'Failed to reject leave')
        return false
      }
    } catch (error) {
      console.error('Error rejecting leave:', error)
      message.error('Failed to reject leave')
      return false
    } finally {
      setLoading(null)
    }
  }

  const openRejectModal = (leaveId: string) => {
    setRejectingLeaveId(leaveId)
    setRejectReason("")
    setRejectModalVisible(true)
  }

  const handleRejectConfirm = async () => {
    const trimmedReason = rejectReason.trim()

    if (!trimmedReason) {
      message.warning('Please provide cancellation reason before rejecting')
      return
    }

    if (!rejectingLeaveId) {
      return
    }

    const success = await handleReject(rejectingLeaveId, trimmedReason)
    if (success) {
      setRejectModalVisible(false)
      setRejectingLeaveId(null)
      setRejectReason("")
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
          {/* <div className="text-xs text-gray-500">{record.employeeId}</div> */}
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
            onClick={() => openRejectModal(record.id)}
          >
            Reject
          </Button>
        </div>
      )
    }
  ]

  return (
    <>
      <Card 
        title={
          <span className="flex items-center gap-2">
            <ClockCircleOutlined />
            Pending Approvals Queue
            <Tooltip title="Leave requests awaiting HR/Admin review are shown here." placement="top">
              <InfoCircleOutlined className="text-slate-400 hover:text-slate-600" />
            </Tooltip>
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

      <Modal
        title="Reject Leave Request"
        open={rejectModalVisible}
        onCancel={() => {
          setRejectModalVisible(false)
          setRejectingLeaveId(null)
          setRejectReason("")
        }}
        onOk={handleRejectConfirm}
        okText="Confirm Rejection"
        cancelText="Cancel"
        okButtonProps={{
          danger: true,
          loading: rejectingLeaveId ? loading === rejectingLeaveId : false,
          disabled: !rejectReason.trim(),
        }}
      >
        <div className="pt-2">
          <p className="text-sm text-gray-600 mb-3">Please provide the cancellation reason for rejecting this leave request.</p>
          <Input.TextArea
            rows={4}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Enter cancellation reason"
          />
        </div>
      </Modal>
    </>
  )
}
