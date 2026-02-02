"use client"

import { Table, Button, Tag, Space, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { EyeOutlined, EditOutlined, SwapOutlined } from '@ant-design/icons';
import { SalesforceAsset } from '../types';
import Link from 'next/link';

interface AssetTableProps {
  assets: SalesforceAsset[];
  loading?: boolean;
  onManageAssignment?: (asset: SalesforceAsset) => void;
  onViewDetails?: (asset: SalesforceAsset) => void;
}

export function AssetTable({ assets, loading, onManageAssignment, onViewDetails }: AssetTableProps) {
  const columns: ColumnsType<SalesforceAsset> = [
    {
      title: 'Asset ID',
      dataIndex: 'Name',
      key: 'Name',
      render: (text) => <span className="font-semibold text-primary">{text}</span>,
      sorter: (a, b) => a.Name.localeCompare(b.Name),
    },
    {
        title: 'Product',
        key: 'Product',
        render: (_, r) => {
            const name = r.AMS_Product__r?.Name || r.AMS_Product__c || '-';
            const id = r.AMS_Product__r?.Id || r.AMS_Product__c;
            return id ? <Link href={`/assets/products/${id}`} className="text-blue-600 hover:underline">{name}</Link> : name;
        },
        responsive: ['md'],
    },
    {
      title: 'Category',
      dataIndex: 'AMS_Category__c',
      key: 'AMS_Category__c',
      responsive: ['md'],
    },
    {
      title: 'Serial No.',
      dataIndex: 'AMS_Asset_Serial_Number__c',
      key: 'AMS_Asset_Serial_Number__c',
    },
    {
      title: 'Assignee',
      key: 'Assigned',
      ellipsis: true,
      render: (_, r) => (
        r.AMS_Assigned_To__r?.Employee_Name__c || r.AMS_Assigned_To__r?.Name || <span className="text-gray-400">Un-Assigned</span>
      )
    },
    {
      title: 'Status',
      dataIndex: 'AMS_Status__c',
      key: 'AMS_Status__c',
      width: 100,
      render: (status) => {
        let color = 'default';
        if (status === 'Assigned') color = 'processing'; // Blue
        if (status === 'Un-Assigned') color = 'success'; // Green
        if (status === 'Discarded') color = 'error'; // Red
        return <Tag color={color}>{status}</Tag>;
      }
    },
    {
      title: 'Action',
      key: 'actions',
      width: 80,
      render: (_, record) => (
          <Tooltip title="Manage Assignment">
            <Button 
                icon={<SwapOutlined />} 
                type="primary" 
                ghost 
                size="small"
                onClick={() => onManageAssignment?.(record)}
            />
          </Tooltip>
      )
    }
  ];

  return (
    <div className="bg-white rounded-lg shadow border border-gray-100 overflow-hidden">
        <Table 
            rowKey="Id"
            columns={columns} 
            dataSource={assets} 
            loading={loading}
            pagination={{ pageSize: 10, simple: true, className: "px-4" }}
            scroll={{ x: 800 }}
            size="middle"
        />
    </div>
  );
}
