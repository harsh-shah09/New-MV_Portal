"use client"

import { Table, Button, Tag, Space, Tooltip, Card, Row, Col, Divider , Grid } from 'antd';
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
  const { useBreakpoint } = Grid;
  const screens = useBreakpoint();
  const isMobile = !screens.md;   // true on xs and sm screens

  // ==================== DESKTOP / TABLET TABLE ====================
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
      align: 'center',
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

  // ==================== MOBILE CARD LAYOUT ====================
  const renderMobileCard = (record: LeaveRequest) => {
    const displayType = record.leaveCategory === 'Extra Day Pay' 
      ? 'Extra Day Pay' 
      : record.leaveType;

    return (
      <Card 
        key={record.id}
        className="mb-4 shadow-sm"
        bordered
        styles={{ body: { padding: 16 } }}
        style={{ marginBottom :  16 }}
      >
        <div className="flex justify-between items-start">
          <div>
            <div className="font-semibold text-base">{record.employeeName}</div>
            <div className="text-sm text-gray-500 capitalize">{displayType}</div>
          </div>
          <Tag color={
            record.status === 'approved' ? 'success' :
            record.status === 'pending' ? 'warning' :
            record.status === 'rejected' ? 'error' : 'default'
          } className="capitalize">
            {record.status}
          </Tag>
        </div>

        <Divider className="my-3" />

        <Row gutter={[16, 12]}>
          <Col span={8}>
            <div className="text-xs text-gray-500">From</div>
            <div className="font-medium">{formatDate(record.startDate)}</div>
          </Col>
          <Col span={8}>
            <div className="text-xs text-gray-500">To</div>
            <div className="font-medium">{formatDate(record.endDate)}</div>
          </Col>
          <Col span={8}>
            <div className="text-xs text-gray-500">Days</div>
            <div className="font-semibold text-lg">{record.duration}</div>
          </Col>
        </Row>

        {showActions && record.status === 'approved' && onWithdraw && (
          <div className="mt-4 pt-3 border-t">
            <Button 
              type="primary" 
              danger 
              block
              icon={<CloseOutlined />}
              onClick={() => onWithdraw(record.id)}
            >
              Withdraw Request
            </Button>
          </div>
        )}
      </Card>
    );
  };

  return (
    <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
      {isMobile ? (
        // ==================== MOBILE VIEW ====================
        <div className="p-4">
          {leaves.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No leave requests found
            </div>
          ) : (
            leaves.map(renderMobileCard)
          )}
        </div>
      ) : (
        // ==================== DESKTOP / TABLET VIEW ====================
        <Table
          columns={columns}
          dataSource={leaves}
          rowKey="id"
          pagination={{ pageSize: 10}}
          scroll={{ x: 900 }}
          className="ant-table-responsive"
        />
      )}
    </div>
  );
}