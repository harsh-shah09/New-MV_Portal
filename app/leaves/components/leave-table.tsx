"use client"

import { Table, Button, Tag, Space, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { CloseOutlined } from '@ant-design/icons';
import type { LeaveRequest } from "@/types"
import { formatDate } from "@/lib/utils"

interface LeaveTableProps {
  leaves: LeaveRequest[]
  onCancel: (id: string) => void
  showActions?: boolean
}

export function LeaveTable({ leaves, onCancel, showActions = true }: LeaveTableProps) {
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
      render: (text) => <span className="capitalize">{text}</span>,
      filters: [
        { text: 'Annual', value: 'annual' },
        { text: 'Sick', value: 'sick' },
        { text: 'Personal', value: 'personal' },
        { text: 'Maternity', value: 'maternity' },
        { text: 'Sabbatical', value: 'sabbatical' },
      ],
      onFilter: (value: any, record) => record.leaveType === value,
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
          {record.status === 'pending' && (
            <Tooltip title="Cancel Request">
              <Button
                type="text"
                danger
                icon={<CloseOutlined />}
                onClick={() => onCancel(record.id)}
              >
                Cancel
              </Button>
            </Tooltip>
          )}
        </Space>
      ),
    });
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
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
