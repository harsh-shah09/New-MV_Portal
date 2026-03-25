"use client"

import { Table, Button, Tag, Space, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { CloseOutlined } from '@ant-design/icons';
import type { LeaveRequest } from "@/types"
import { formatDate } from "@/lib/utils"

interface LeaveTableProps {
  leaves: LeaveRequest[]
  onWithdraw?: (id: string) => void
  showActions?: boolean
}

export function LeaveTable({ leaves, onWithdraw, showActions = true }: LeaveTableProps) {
  const columns: ColumnsType<LeaveRequest> = [
    {
      title: 'Employee',
      dataIndex: 'employeeName',
      key: 'employeeName',
    },
    {
      title: 'Leave Type',
      dataIndex: 'leaveType',
      key: 'leaveType',
      render: (text, record) => {
        const displayText = record.leaveCategory === 'Extra Day Pay' ? 'Extra Day Pay' : text;
        return <span className="capitalize">{displayText || 'N/A'}</span>;
      },
    },
    {
      title: 'From',
      dataIndex: 'startDate',
      key: 'startDate',
      render: (date) => formatDate(date),
      sorter: (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
    },
    {
      title: 'To',
      dataIndex: 'endDate',
      key: 'endDate',
      render: (date) => formatDate(date),
    },
    {
      title: 'Days',
      dataIndex: 'duration',
      key: 'duration',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        let color = 'default';
        if (status === 'approved') color = 'success';
        if (status === 'pending') color = 'warning';
        if (status === 'rejected') color = 'error';
        if (status === 'cancelled') color = 'default';

        return (
          <Tag color={color} className="capitalize">
            {status}
          </Tag>
        );
      },
    },
  ];

  if (showActions) {
    columns.push({
      title: 'Actions',
      key: 'actions',
      align: 'center',
      render: (_, record) => (
        <Space size="small">
          {record.status === 'approved' && onWithdraw && (
            <Tooltip title="Withdraw Request">
              <Button
                type="text"
                danger
                icon={<CloseOutlined />}
                onClick={() => onWithdraw(record.id)}
              >
                Withdraw
              </Button>
            </Tooltip>
          )}
        </Space>
      ),
    });
  }

  return (
    <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
      <Table
        columns={columns}
        dataSource={leaves}
        rowKey="id"
        pagination={{ pageSize: 10 }}
        scroll={{ x: 800 }}
      />
    </div>
  )
}