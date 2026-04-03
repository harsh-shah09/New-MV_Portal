"use client"

import { Card, Button, Table, Badge, message, Tooltip, Modal, Input, Checkbox } from "antd"
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
  canUseLeaveRulesPopup?: boolean
}

export function PendingApprovalsQueue({
  initialPendingApprovals = [],
  dashboardView = "default",
  canUseLeaveRulesPopup = false,
}: PendingApprovalsQueueProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [pendingApprovals, setPendingApprovals] = useState<any[]>(initialPendingApprovals)
  const [isLoading, setIsLoading] = useState(false)
  const [rejectModalVisible, setRejectModalVisible] = useState(false)
  const [rejectingLeaveId, setRejectingLeaveId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const [ruleChoiceModalVisible, setRuleChoiceModalVisible] = useState(false)
  const [ruleChoiceLeave, setRuleChoiceLeave] = useState<any | null>(null)
  const [applySandwichSelection, setApplySandwichSelection] = useState(false)
  const [applyOnePlusTwoSelection, setApplyOnePlusTwoSelection] = useState(false)

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
    setIsLoading(false)
  }, [initialPendingApprovals])

  const handleApprove = async (
    leaveId: string,
    ruleOptions: { applySandwichRule: boolean; applyOnePlusTwoRule: boolean }
  ) => {
    setLoading(leaveId)
    try {
      const response = await fetch('/api/leave-management', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leaveId,
          action: 'approve',
          applySandwichRule: ruleOptions.applySandwichRule,
          applyOnePlusTwoRule: ruleOptions.applyOnePlusTwoRule,
        })
      })

      const result = await response.json()

      if (response.ok) {
        message.success(
          dashboardView === 'hr'
            ? `Leave approved successfully${ruleOptions.applySandwichRule || ruleOptions.applyOnePlusTwoRule ? ' with selected rules.' : ' without rules.'}`
            : 'Leave approved successfully'
        )
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

  const markLeaveAsDoubtful = async (leaveId: string): Promise<boolean> => {
    setLoading(leaveId)
    try {
      const response = await fetch('/api/leave-management', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leaveId,
          action: 'mark_doubtful_case',
        })
      })

      const result = await response.json()

      if (response.ok) {
        message.success('Leave marked as doubtful case.')
        await fetchPendingApprovals()
        return true
      }

      message.error(result.error || 'Failed to mark doubtful case')
      return false
    } catch (error) {
      console.error('Error marking doubtful case:', error)
      message.error('Failed to mark doubtful case')
      return false
    } finally {
      setLoading(null)
    }
  }

  const closeRuleChoiceModal = () => {
    setRuleChoiceModalVisible(false)
    setRuleChoiceLeave(null)
    setApplySandwichSelection(false)
    setApplyOnePlusTwoSelection(false)
  }

  const handleApproveFromRuleChoice = async () => {
    if (!ruleChoiceLeave?.id) return
    await handleApprove(ruleChoiceLeave.id, {
      applySandwichRule: ruleChoiceLeave.sandwichRuleApplicable === true ? applySandwichSelection : false,
      applyOnePlusTwoRule: ruleChoiceLeave.onePlusTwoRuleApplicable === true ? applyOnePlusTwoSelection : false,
    })
    closeRuleChoiceModal()
  }

  const shouldShowRulesPopup = (record: any): boolean => {
    return (
      canUseLeaveRulesPopup &&
      record?.leaveType === 'Planned Leave' &&
      (record?.sandwichRuleApplicable === true || record?.onePlusTwoRuleApplicable === true)
    )
  }

  const openApproveConfirmation = (record: any) => {
    const isHRUser = dashboardView === 'hr' && canUseLeaveRulesPopup === false
    let confirmModalRef: { destroy: () => void } | null = null

    const handleMarkDoubtfulCaseClick = async () => {
      if (!record?.id) return
      const success = await markLeaveAsDoubtful(record.id)
      if (success) {
        confirmModalRef?.destroy()
      }
    }

    confirmModalRef = Modal.confirm({
      title: 'Approve Leave Request',
      content: record ? (
        <div>
          <p className="mb-3">Are you sure you want to approve this leave request?</p>
          <div className="p-3 bg-green-50 border border-green-200 rounded">
            <div className="text-sm space-y-1">
              <div><strong>Employee:</strong> {record.employeeName}</div>
              <div><strong>Type:</strong> {record.leaveType || record.leaveCategory}</div>
              <div><strong>Dates:</strong> {record.startDate} to {record.endDate}</div>
              <div><strong>Duration:</strong> {record.duration} day(s)</div>
              {record.reason && (
                <div className="mt-2 pt-2 border-t border-green-300">
                  <strong>Reason:</strong>
                  <p className="mt-1 text-gray-700">{record.reason}</p>
                </div>
              )}
            </div>
          </div>
          <p className="mt-3 text-sm text-green-700">✓ Email notification will be sent to the employee</p>
          {isHRUser && (
            <div className="mt-4 pt-3 border-t border-amber-200">
              <Button danger type="default" onClick={handleMarkDoubtfulCaseClick}>
                Mark as Doubtful Case
              </Button>
            </div>
          )}
        </div>
      ) : 'Are you sure you want to approve this leave request?',
      okText: 'Approve',
      cancelText: 'Cancel',
      okButtonProps: { style: { backgroundColor: '#10b981' } },
      onOk: async () => {
        if (shouldShowRulesPopup(record)) {
          setRuleChoiceLeave(record)
          setApplySandwichSelection(record?.sandwichRuleApplicable === true)
          setApplyOnePlusTwoSelection(record?.onePlusTwoRuleApplicable === true)
          setRuleChoiceModalVisible(true)
          return
        }

        const shouldAutoApplyRulesForHr = dashboardView === 'hr' && canUseLeaveRulesPopup === false

        await handleApprove(record.id, {
          applySandwichRule: shouldAutoApplyRulesForHr ? record?.sandwichRuleApplicable === true : false,
          applyOnePlusTwoRule: shouldAutoApplyRulesForHr ? record?.onePlusTwoRuleApplicable === true : false,
        })
      },
    })
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
      width: 180,
      render: (text, record) => (
        <div>
          <div className="font-medium">{text}</div>
          {canUseLeaveRulesPopup && record?.doubtfullCase === true && (
            <div className="text-xs text-red-600 font-medium">Doubtful Case</div>
          )}
          {/* <div className="text-xs text-gray-500">{record.employeeId}</div> */}
        </div>
      )
    },
    {
      title: 'Leave Type',
      dataIndex: 'leaveType',
      key: 'leaveType',
      width: 150,
      render: (text, record) => <span className="capitalize">{text || record.leaveCategory}</span>
    },
    {
      title: 'Duration',
      dataIndex: 'duration',
      key: 'duration',
      width: 110,
      render: (duration) => `${duration} day(s)`
    },
    {
      title: 'Start Date',
      dataIndex: 'startDate',
      key: 'startDate',
      width: 130,
      render: (date) => dayjs(date).format('MMM DD, YYYY')
    },
    {
      title: 'TL Status',
      dataIndex: 'tlApproved',
      key: 'tlApproved',
      width: 120,
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
      width: 220,
      render: (_, record) => (
        <div className="flex flex-wrap gap-2">
          <Button 
            type="primary" 
            size="small" 
            icon={<CheckCircleOutlined />}
            loading={loading === record.id}
            disabled={loading !== null}
            onClick={() => openApproveConfirmation(record)}
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
              size="small"
              scroll={{ x: 980 }}
              rowClassName={(record) =>
                canUseLeaveRulesPopup && record?.doubtfullCase === true
                  ? 'bg-red-50/70'
                  : ''
              }
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
        title="Apply Leave Rules?"
        open={ruleChoiceModalVisible}
        onCancel={closeRuleChoiceModal}
        footer={[
          <Button key="cancel" onClick={closeRuleChoiceModal} disabled={loading !== null}>
            Cancel
          </Button>,
          <Button
            key="approve"
            type="primary"
            style={{ backgroundColor: '#10b981' }}
            onClick={handleApproveFromRuleChoice}
            loading={ruleChoiceLeave?.id ? loading === ruleChoiceLeave.id : false}
            disabled={loading !== null}
          >
            Approve
          </Button>,
        ]}
      >
        <div className="space-y-3">
          <p className="mb-1 font-medium text-gray-800">Select which rules to apply before approval.</p>
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 space-y-2">
          {ruleChoiceLeave?.sandwichRuleApplicable === true && (
            <div className="flex items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-2">
              <span className="text-sm font-medium text-gray-700">Apply Sandwich Rule</span>
              <Checkbox checked={applySandwichSelection} onChange={(e) => setApplySandwichSelection(e.target.checked)} />
            </div>
          )}
          {ruleChoiceLeave?.onePlusTwoRuleApplicable === true && (
            <div className="flex items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-2">
              <span className="text-sm font-medium text-gray-700">Apply 1+2 Rule</span>
              <Checkbox checked={applyOnePlusTwoSelection} onChange={(e) => setApplyOnePlusTwoSelection(e.target.checked)} />
            </div>
          )}
          </div>
          <p className="text-sm text-gray-600">Only applicable rules are shown.</p>
        </div>
      </Modal>

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
