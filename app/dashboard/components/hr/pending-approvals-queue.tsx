"use client"

import { Button, Table, Badge, message, Tooltip, Avatar } from "antd"
import { 
  CheckOutlined, 
  CloseOutlined,
  ClockCircleOutlined,
  UserOutlined,
  CalendarOutlined,
  ArrowRightOutlined
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
        <div className="flex items-center gap-3">
           <Avatar size="small" icon={<UserOutlined />} className="bg-orange-100 text-orange-600" />
           <div>
              <div className="font-semibold text-slate-800">{text}</div>
              <div className="text-[10px] text-slate-400 font-mono">{record.employeeId}</div>
           </div>
        </div>
      )
    },
    {
      title: 'Type',
      dataIndex: 'leaveType',
      key: 'leaveType',
      render: (text, record) => (
          <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs font-medium">
             {text || record.leaveCategory}
          </span>
      )
    },
    {
      title: 'Date',
      dataIndex: 'startDate',
      key: 'startDate',
      render: (date) => (
          <div className="flex items-center gap-1.5 text-slate-600 text-xs font-medium">
             <CalendarOutlined className="text-slate-400" />
             {dayjs(date).format('MMM DD')}
          </div>
      )
    },
    {
      title: 'Days',
      dataIndex: 'duration',
      key: 'duration',
       render: (days) => <span className="font-bold text-slate-700">{days}d</span>
    },
    {
      title: '',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <div className="flex justify-end gap-1">
          <Tooltip title="Approve">
              <Button 
                type="text" 
                size="small" 
                className="text-green-500 bg-green-50 hover:bg-green-100 border border-green-200"
                icon={<CheckOutlined />}
                loading={loading === record.id}
                disabled={loading !== null}
                onClick={() => handleApprove(record.id)}
              />
          </Tooltip>
          <Tooltip title="Reject">
              <Button 
                type="text" 
                size="small" 
                className="text-red-500 bg-red-50 hover:bg-red-100 border border-red-200"
                icon={<CloseOutlined />}
                loading={loading === record.id}
                disabled={loading !== null}
                onClick={() => handleReject(record.id)}
              />
          </Tooltip>
        </div>
      )
    }
  ]

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-50">
         <div className="flex items-center gap-3">
             <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
                <ClockCircleOutlined className="text-xl" />
             </div>
             <div>
                <h3 className="text-lg font-bold text-slate-800">Pending Approvals</h3>
                <p className="text-xs text-slate-500 font-medium">Requests awaiting actions</p>
             </div>
         </div>
         {pendingApprovals.length > 0 && (
            <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold border border-amber-200">
                {pendingApprovals.length} Pending
            </span>
         )}
      </div>

      <div className="overflow-hidden">
        {pendingApprovals.length > 0 ? (
          <>
            <Table 
              dataSource={pendingApprovals.slice(0, 5)}
              columns={approvalColumns}
              pagination={false}
              rowKey="id"
              size="middle"
              className="custom-table"
              scroll={{ x: true }}
            />
            {pendingApprovals.length > 5 && (
              <div className="text-center mt-6 pt-2 border-t border-slate-50">
                <Button type="link" onClick={() => router.push('/leaves?tab=approvals')} className="text-indigo-600 font-medium flex items-center gap-1 mx-auto">
                  View All Requests <ArrowRightOutlined />
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <div className="mx-auto w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-3">
                 <CheckOutlined className="text-2xl text-green-500" />
            </div>
            <p className="text-slate-800 font-semibold">All Caught Up!</p>
            <p className="text-slate-500 text-sm">No pending approvals at the moment.</p>
          </div>
        )}
      </div>
    </div>
  )
}
