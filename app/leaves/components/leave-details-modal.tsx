"use client"

import { Modal, Row, Col, Card, Tag, Descriptions, Space, Badge, Spin } from "antd"
import { CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined, ExclamationCircleOutlined } from "@ant-design/icons"
import type { LeaveRequest } from "@/types"
import { formatDate } from "@/lib/utils"
import dayjs from "dayjs"

interface LeaveDetailsModalProps {
  leave: LeaveRequest | null
  visible: boolean
  loading?: boolean
  onClose: () => void
}

export function LeaveDetailsModal({ leave, visible, loading = false, onClose }: LeaveDetailsModalProps) {
  if (!visible) return null

  if (!leave && !loading) return null

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "approved":
        return "success"
      case "rejected":
        return "error"
      case "pending":
      case "applied":
        return "warning"
      case "withdrawn":
      case "withdrawal pending":
        return "default"
      default:
        return "default"
    }
  }

  const getApprovalStatusIcon = (status?: string) => {
    if (status === "Approved" || status === "approved") {
      return <CheckCircleOutlined style={{ color: "#10b981", fontSize: "16px" }} />
    }
    if (status === "Rejected" || status === "rejected") {
      return <CloseCircleOutlined style={{ color: "#ef4444", fontSize: "16px" }} />
    }
    return <ClockCircleOutlined style={{ color: "#f59e0b", fontSize: "16px" }} />
  }

  const isWithdrawalRequest = leave?.isWithdrawalRequest
  const displayStartDate = isWithdrawalRequest ? leave?.withdrawalStartDate : leave?.startDate
  const displayEndDate = isWithdrawalRequest ? leave?.withdrawalEndDate : leave?.endDate
  const safeDisplayStartDate = displayStartDate || leave?.startDate || ""
  const safeDisplayEndDate = displayEndDate || leave?.endDate || ""
  const displayType = leave?.leaveCategory === "Extra Day Pay" ? "Extra Day Pay" : leave?.leaveType
  const sessionStartLabel = leave?.sessionStart === "Session-1" ? "Session 1" : leave?.sessionStart === "Session-2" ? "Session 2" : leave?.sessionStart
  const sessionEndLabel = leave?.sessionEnd === "Session-1" ? "Session 1" : leave?.sessionEnd === "Session-2" ? "Session 2" : leave?.sessionEnd
  const isHalfDaySession = leave?.sessionStart === leave?.sessionEnd && (leave?.sessionStart === "Session-1" || leave?.sessionStart === "Session-2")
  const sessionLabel = leave?.sessionStart && leave?.sessionEnd
    ? leave.sessionStart === leave.sessionEnd
      ? sessionStartLabel
      : `${sessionStartLabel} → ${sessionEndLabel}`
    : leave?.session || undefined

  // Calculate days between dates
  const calculatedDays = displayStartDate && displayEndDate
    ? dayjs(displayEndDate).diff(dayjs(displayStartDate), "day") + 1
    : leave?.duration || 0

  return (
    <Modal
      title={
        <div className="flex flex-wrap items-center gap-2 pr-6">
          <span className="text-base font-semibold text-gray-900">Leave Details</span>
          <Tag color="blue" className="capitalize">{displayType || "N/A"}</Tag>
          <Tag color={getStatusColor(leave?.status || "pending")} className="capitalize">
            {isWithdrawalRequest ? "Withdrawal Request" : leave?.status}
          </Tag>
        </div>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={900}
      centered
      bodyStyle={{ maxHeight: "85vh", overflowY: "auto", overscrollBehavior: "contain" }}
    >
      <Spin spinning={loading}>
      <div className="flex flex-col gap-6 py-1">
        {/* Employee Info Section */}
        <Card className="border border-blue-200 bg-gradient-to-br from-blue-50 to-white shadow-sm" bodyStyle={{ padding: "18px" }}>
          <Row gutter={[24, 16]}>
            <Col xs={24} sm={12}>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Employee Name</p>
                  <p className="text-xl font-semibold text-gray-900">{leave?.employeeName || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Employee Record Name</p>
                  <p className="text-base font-medium text-gray-700">{leave?.employeeRecordName || "N/A"}</p>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Tag color="purple" className="rounded-full px-2.5 py-0.5">{leave?.leaveCategory || "N/A"}</Tag>
                  <Tag color="geekblue" className="rounded-full px-2.5 py-0.5">{calculatedDays} day(s)</Tag>
                  {(leave?.sessionStart || leave?.sessionEnd || leave?.session) && <Tag color="cyan" className="rounded-full px-2.5 py-0.5">{sessionLabel}</Tag>}
                </div>
              </div>
            </Col>
            <Col xs={24} sm={12}>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Current Status</p>
                  <Tag color={getStatusColor(leave?.status || "pending")} className="capitalize text-base px-3 py-1">
                    {isWithdrawalRequest ? "Withdrawal Request" : leave?.status}
                  </Tag>
                </div>
                {leave?.teamLeadName && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">Team Lead</p>
                    <p className="text-base font-medium text-gray-700">{leave?.teamLeadName}</p>
                  </div>
                )}
              </div>
            </Col>
          </Row>
        </Card>

        {/* Leave Type & Category Section */}
        <Card className="border border-purple-200 shadow-sm" bodyStyle={{ padding: "16px" }}>
          <Row gutter={[24, 16]}>
            <Col xs={24} sm={12}>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Leave Type</p>
                <p className="text-lg font-semibold text-gray-900 capitalize">{displayType}</p>
              </div>
            </Col>
            <Col xs={24} sm={12}>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Leave Category</p>
                <p className="text-lg font-semibold text-gray-900 capitalize">
                  {leave?.leaveCategory || "N/A"}
                </p>
              </div>
            </Col>
          </Row>
        </Card>

        <Card className="border border-indigo-200 shadow-sm" bodyStyle={{ padding: "16px" }}>
          <p className="text-sm font-semibold text-gray-900 mb-4">Leave Metrics</p>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Days</p>
                <p className="text-lg font-semibold text-gray-900">{leave?.duration ?? 0}</p>
              </div>
            </Col>
            <Col xs={24} sm={12}>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Days After Rule</p>
                <p className="text-lg font-semibold text-gray-900">{leave?.totalDaysAfterRule ?? leave?.duration ?? 0}</p>
              </div>
            </Col>
          </Row>
        </Card>

        {/* Date & Duration Section */}
        <Card className="border border-green-200 shadow-sm" bodyStyle={{ padding: "16px" }}>
          <Row gutter={[24, 16]}>
            <Col xs={24} sm={8}>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                  {isWithdrawalRequest ? "Requested Start Date" : "Start Date"}
                </p>
                <p className="text-lg font-semibold text-gray-900">{formatDate(safeDisplayStartDate)}</p>
                {isWithdrawalRequest && (
                  <p className="text-xs text-gray-500 mt-1">
                    Original: {formatDate(leave?.startDate || "")}
                  </p>
                )}
              </div>
            </Col>
            <Col xs={24} sm={8}>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                  {isWithdrawalRequest ? "Requested End Date" : "End Date"}
                </p>
                <p className="text-lg font-semibold text-gray-900">{formatDate(safeDisplayEndDate)}</p>
                {isWithdrawalRequest && (
                  <p className="text-xs text-gray-500 mt-1">
                    Original: {formatDate(leave?.endDate || "")}
                  </p>
                )}
              </div>
            </Col>
            <Col xs={24} sm={8}>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Days</p>
                <p className="text-lg font-semibold text-gray-900">{calculatedDays} day(s)</p>
                {isHalfDaySession && (
                  <p className="text-xs text-gray-600 mt-1">{sessionLabel}</p>
                )}
              </div>
            </Col>
          </Row>
        </Card>

        {/* Rules Applied Section */}
        {(leave?.sandwichRuleApplicable || leave?.onePlusTwoRuleApplicable) && (
          <Card className="border border-orange-200 shadow-sm" bodyStyle={{ padding: "16px" }}>
            <p className="text-sm font-semibold text-gray-900 mb-3">Rules Applied</p>
            <Space direction="vertical" className="w-full" size={8}>
              {leave?.sandwichRuleApplicable && (
                <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <ExclamationCircleOutlined className="text-orange-600 text-lg flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-orange-900">Sandwich Rule Applied</p>
                    <p className="text-sm text-orange-800">
                      Non-working days (weekends/holidays) between or adjacent to leave dates are counted as leave days
                    </p>
                  </div>
                </div>
              )}
              {leave?.onePlusTwoRuleApplicable && (
                <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                  <ExclamationCircleOutlined className="text-red-600 text-lg flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-900">1+2 Rule (Less than 5 days notice)</p>
                    <p className="text-sm text-red-800">
                      Additional penalty days applied due to insufficient advance notice (less than 5 working days)
                    </p>
                  </div>
                </div>
              )}
            </Space>
          </Card>
        )}

        {/* Rejection/Cancellation Reason Section */}
        {(leave?.status === "rejected" || leave?.status === "cancelled") && (
          <Card className="border border-red-200 shadow-sm" bodyStyle={{ padding: "16px" }}>
            <p className="text-sm font-semibold text-gray-900 mb-4">Rejection Details</p>
            <Space direction="vertical" className="w-full" size={3}>
              {leave?.tlRejectionReason && (
                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-2">Team Lead Rejection Reason</p>
                  <p className="text-gray-700 whitespace-pre-wrap">{leave?.tlRejectionReason}</p>
                </div>
              )}
              {leave?.hrRejectionReason && (
                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-2">HR Rejection Reason</p>
                  <p className="text-gray-700 whitespace-pre-wrap">{leave?.hrRejectionReason}</p>
                </div>
              )}
            </Space>
          </Card>
        )}

        {/* Approval Status Section */}
        <Card className="border border-blue-200 shadow-sm" bodyStyle={{ padding: "16px" }}>
          <p className="text-sm font-semibold text-gray-900 mb-4">Approval Status</p>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-blue-900">Team Lead Approval</p>
                  {getApprovalStatusIcon(leave?.tlApproved)}
                </div>
                <Badge
                  status={
                    leave?.tlApproved === "Approved"
                      ? "success"
                      : leave?.tlApproved === "Rejected"
                        ? "error"
                        : "processing"
                  }
                  text={
                    <span className="text-blue-800 font-medium">
                      {leave?.tlApproved || "Pending"}
                    </span>
                  }
                />
              </div>
            </Col>
            <Col xs={24} sm={12}>
              <div className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg border border-emerald-200">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-emerald-900">HR Approval</p>
                  {getApprovalStatusIcon(leave?.hrApproval)}
                </div>
                <Badge
                  status={
                    leave?.hrApproval === "Approved"
                      ? "success"
                      : leave?.hrApproval === "Rejected"
                        ? "error"
                        : "processing"
                  }
                  text={
                    <span className="text-emerald-800 font-medium">
                      {leave?.hrApproval || "Pending"}
                    </span>
                  }
                />
              </div>
            </Col>
          </Row>
        </Card>

        {/* Reason Section */}
        {leave?.reason && (
          <Card className="border border-cyan-200 shadow-sm" bodyStyle={{ padding: "16px" }}>
            <p className="text-sm font-semibold text-gray-900 mb-3">Reason</p>
            <div className="p-4 bg-cyan-50 rounded-lg border border-cyan-200">
              <p className="text-gray-700 whitespace-pre-wrap">{leave?.reason}</p>
            </div>
          </Card>
        )}

        {/* Additional Info Section */}
        <Card className="border border-gray-200 shadow-sm" bodyStyle={{ padding: "16px" }}>
          <p className="text-sm font-semibold text-gray-900 mb-4">Additional Information</p>
          <Descriptions column={1} size="small">
            <Descriptions.Item label="Start Date">
              <span className="font-medium text-gray-700">{formatDate(leave?.startDate || "")}</span>
            </Descriptions.Item>
            <Descriptions.Item label="End Date">
              <span className="font-medium text-gray-700">{formatDate(leave?.endDate || "")}</span>
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <span className="font-medium text-gray-700 capitalize">{leave?.status || "N/A"}</span>
            </Descriptions.Item>
            <Descriptions.Item label="TL Approval">
              <span className="font-medium text-gray-700">{leave?.tlApproved || "Pending"}</span>
            </Descriptions.Item>
            <Descriptions.Item label="HR Approval">
              <span className="font-medium text-gray-700">{leave?.hrApproval || "Pending"}</span>
            </Descriptions.Item>
            <Descriptions.Item label="One+Two Rule">
              <span className="font-medium text-gray-700">{leave?.onePlusTwoRuleApplicable ? "Yes" : "No"}</span>
            </Descriptions.Item>
            <Descriptions.Item label="Sandwich Rule">
              <span className="font-medium text-gray-700">{leave?.sandwichRuleApplicable ? "Yes" : "No"}</span>
            </Descriptions.Item>
            {(leave?.sessionStart || leave?.sessionEnd || leave?.session) && (
              <Descriptions.Item label="Session">
                <span className="font-medium text-gray-700">
                  {sessionLabel}
                </span>
              </Descriptions.Item>
            )}
            {leave?.approvalDate && (
              <Descriptions.Item label="Approved Date">
                <span className="font-medium text-gray-700">{formatDate(leave?.approvalDate)}</span>
              </Descriptions.Item>
            )}
            {leave?.tlRejectionReason && (
              <Descriptions.Item label="Cancellation Reason TL">
                <span className="font-medium text-gray-700">{leave?.tlRejectionReason}</span>
              </Descriptions.Item>
            )}
            {leave?.hrRejectionReason && (
              <Descriptions.Item label="Cancellation Reason HR">
                <span className="font-medium text-gray-700">{leave?.hrRejectionReason}</span>
              </Descriptions.Item>
            )}
            {leave?.approvedBy && (
              <Descriptions.Item label="Approved By">
                <span className="font-medium text-gray-700">{leave?.approvedBy}</span>
              </Descriptions.Item>
            )}
            
            {leave?.mergeExistingLeaveId && (
              <Descriptions.Item label="Merged With Leave ID">
                <span className="font-mono text-gray-600 text-sm">{leave?.mergeExistingLeaveId}</span>
              </Descriptions.Item>
            )}
          </Descriptions>
        </Card>
      </div>
      </Spin>
    </Modal>
  )
}
