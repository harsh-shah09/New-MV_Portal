"use client"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Table, Button, Tag, Space, Tooltip, Spin } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { EyeOutlined, EditOutlined, SwapOutlined, DeleteOutlined } from '@ant-design/icons';
import { SalesforceAsset } from '../types';

interface AssetTableProps {
  assets: SalesforceAsset[];
  loading?: boolean;
  onManageAssignment?: (asset: SalesforceAsset) => void;
  onViewDetails?: (asset: SalesforceAsset) => void;
  onDiscard?: (asset: SalesforceAsset) => void;
}

export function AssetTable({ assets, loading, onManageAssignment, onViewDetails, onDiscard }: AssetTableProps) {
  const router = useRouter()
  const [navigatingId, setNavigatingId] = useState<string | null>(null)

  const handleProductClick = (id: string) => {
    if (navigatingId) return // prevent double-click
    setNavigatingId(id)
    router.push(`/assets/products/${id}`)
  }

  const columns: ColumnsType<SalesforceAsset> = [
    // {
    //   title: 'Asset ID',
    //   dataIndex: 'Name',
    //   key: 'Name',
    //   render: (text) => <span className="font-semibold text-primary">{text}</span>,
    //   sorter: (a, b) => a.Name.localeCompare(b.Name),
    // },
    {
        title: 'Product',
        key: 'Product',
        render: (_, r) => {
            const name = r.AMS_Product__r?.Name || r.AMS_Product__c || '-';
            const id = r.AMS_Product__r?.Id || r.AMS_Product__c;
            if (!id) return <span>{name}</span>;
            const isNavigating = navigatingId === id;
            return (
              <button
                onClick={() => handleProductClick(id)}
                disabled={!!navigatingId}
                className="inline-flex items-center gap-1.5 text-blue-600 hover:underline disabled:opacity-70 disabled:cursor-wait bg-transparent border-none p-0"
              >
                {name}
              </button>
            );
        },
        responsive: ['md'],
    },
    {
      title: 'Category',
      dataIndex: 'AMS_Category__c',
      key: 'AMS_Category__c',
      responsive: ['md'],
      filters: Array.from(new Set(assets.map(a => a.AMS_Category__c).filter(Boolean))).map(c => ({ text: c, value: c })),
      onFilter: (value: any, record) => record.AMS_Category__c === value,
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
      width: 120,
      filters: [
          { text: 'Assigned', value: 'Assigned' },
          { text: 'Un-Assigned', value: 'Un-Assigned' },
          { text: 'Discarded', value: 'Discarded' },
      ],
      onFilter: (value: any, record) => record.AMS_Status__c === value,
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
      width: 120,
      render: (_, record) => {
          if (record.AMS_Status__c === 'Discarded') {
              return <span className="text-gray-400 text-xs italic">No actions available</span>;
          }
          return (
            <div className="flex gap-2">
                <Tooltip title="Manage Assignment">
                    <Button 
                        icon={<SwapOutlined />} 
                        type="primary" 
                        ghost 
                        size="small"
                        onClick={() => onManageAssignment?.(record)}
                    />
                </Tooltip>
                <Tooltip title="Discard Asset">
                    <Button 
                        icon={<DeleteOutlined />} 
                        danger
                        size="small"
                        onClick={() => onDiscard?.(record)}
                    />
                </Tooltip>
            </div>
          );
      }
    }
  ];

  return (
    <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
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
