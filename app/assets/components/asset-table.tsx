"use client"

import { Table, Button, Tag, Space, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { EyeOutlined, EditOutlined, DeleteOutlined, UserAddOutlined } from '@ant-design/icons';
import type { Asset } from "@/types"

interface AssetTableProps {
  assets: Asset[]
  onAssign: (asset: Asset) => void
  onEdit: (asset: Asset) => void
  onDelete: (id: string) => void
}

export function AssetTable({ assets, onAssign, onEdit, onDelete }: AssetTableProps) {
  const columns: ColumnsType<Asset> = [
    {
      title: 'Asset Tag',
      dataIndex: 'assetTag',
      key: 'assetTag',
      render: (text) => <span className="font-medium">{text}</span>,
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (text) => <span className="capitalize">{text}</span>,
      filters: [
        { text: 'Laptop', value: 'laptop' },
        { text: 'Phone', value: 'phone' },
        { text: 'Monitor', value: 'monitor' },
        { text: 'Tablet', value: 'tablet' },
      ],
      onFilter: (value: any, record) => record.type === value,
    },
    {
      title: 'Current Value',
      dataIndex: 'currentValue',
      key: 'currentValue',
      render: (value) => `$${Number(value).toLocaleString()}`,
      sorter: (a, b) => a.currentValue - b.currentValue,
    },
    {
      title: 'Assigned To',
      dataIndex: 'assignedTo',
      key: 'assignedTo',
      render: (text) => text || <span className="text-gray-400">-</span>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        let color = 'default';
        if (status === 'available') color = 'success';
        if (status === 'assigned') color = 'blue';
        if (status === 'in_repair') color = 'warning';
        if (status === 'broken' || status === 'lost' || status === 'damaged') color = 'error';
        
        return (
          <Tag color={color} className="capitalize">
            {status ? status.replace('_', ' ') : 'Unknown'}
          </Tag>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'center',
      render: (_, record) => (
        <Space size="small">
          {record.status === 'available' && (
            <Tooltip title="Assign Asset">
              <Button
                type="text"
                icon={<UserAddOutlined className="text-blue-600" />}
                onClick={() => onAssign(record)}
              />
            </Tooltip>
          )}
          <Tooltip title="Edit">
            <Button
              type="text"
              icon={<EditOutlined className="text-green-600" />}
              onClick={() => onEdit(record)}
            />
          </Tooltip>
          <Tooltip title="Delete">
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => onDelete(record.id)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <Table
        columns={columns}
        dataSource={assets}
        rowKey="id"
        pagination={{ pageSize: 10 }}
        scroll={{ x: 900 }}
      />
    </div>
  )
}
