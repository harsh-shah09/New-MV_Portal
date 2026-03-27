"use client"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Table, Button, Tag, Space, Tooltip, Grid, Spin } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { EyeOutlined, EditOutlined, SwapOutlined, DeleteOutlined } from '@ant-design/icons';
import { SalesforceAsset } from '../types';
const { useBreakpoint } = Grid;
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
  const screens = useBreakpoint();
  const isMobile = !screens.md; // < 768px = mobile 
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
                className="inline-flex items-center gap-1.5 text-blue-600 hover:underline disabled:opacity-70 disabled:cursor-wait bg-transparent border-none p-0 cursor-pointer"
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
      // filters: Array.from(new Set(assets.map(a => a.AMS_Category__c).filter(Boolean))).map(c => ({ text: c, value: c })),
      // onFilter: (value: any, record) => record.AMS_Category__c === value,
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
      // filters: [
      //     { text: 'Assigned', value: 'Assigned' },
      //     { text: 'Un-Assigned', value: 'Un-Assigned' },
      //     { text: 'Discarded', value: 'Discarded' },
      // ],
      // onFilter: (value: any, record) => record.AMS_Status__c === value,
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
  if (isMobile) {
  return (
    <div className="flex flex-col gap-4 px-1">
      {assets.map((asset) => {
        const productName =
          asset.AMS_Product__r?.Name || asset.AMS_Product__c || '-';

        const productId =
          asset.AMS_Product__r?.Id || asset.AMS_Product__c;

        const assignee =
          asset.AMS_Assigned_To__r?.Employee_Name__c ||
          asset.AMS_Assigned_To__r?.Name ||
          'Unassigned';

        const serial = asset.AMS_Asset_Serial_Number__c || '-';
        const category = asset.AMS_Category__c || '-';

        let statusColor = 'default';
        let statusText = asset.AMS_Status__c;

        if (asset.AMS_Status__c === 'Assigned') {
          statusColor = 'blue';
        } else if (asset.AMS_Status__c === 'Un-Assigned') {
          statusColor = 'green';
        } else if (asset.AMS_Status__c === 'Discarded') {
          statusColor = 'red';
        }

        const isNavigating = navigatingId === productId;

        return (
          <div
            key={asset.Id}
            className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md active:shadow transition-all duration-200 cursor-pointer"          >
            {/* Header: Product Name + Status */}
            <div className="flex justify-between items-start gap-3">
              <button
                onClick={() => productId && handleProductClick(productId)}
                disabled={!!navigatingId}
                className="flex-1 text-left group focus:outline-none"
              >
                <div className="flex items-center gap-2">
                  <span 
                    className={`
                      text-base font-semibold text-blue-600 
                      group-hover:text-blue-700 
                      group-active:text-blue-800 
                      transition-colors duration-200
                      ${isNavigating ? 'opacity-70' : ''}
                    `}
                  >
                    {productName}
                  </span>
                  
                  {!isNavigating && (
                    <span className="text-blue-400 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                      →
                    </span>
                  )}
                  
                  {isNavigating && <Spin size="small" />}
                </div>
                
                {/* Subtle underline on hover */}
                <div className="h-px bg-blue-200 w-0 group-hover:w-full transition-all duration-300 mt-0.5" />
              </button>

              <Tag
                color={statusColor}
                className="text-xs font-medium px-3 py-1 rounded-full flex-shrink-0"
              >
                {statusText}
              </Tag>
            </div>

            {/* Details Grid */}
            <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div>
                <div className="text-gray-500 text-xs tracking-widest">SERIAL</div>
                <div className="font-medium text-gray-800 mt-0.5">{serial}</div>
              </div>

              <div>
                <div className="text-gray-500 text-xs tracking-widest">CATEGORY</div>
                <div className="font-medium text-gray-800 mt-0.5">{category}</div>
              </div>

              <div className="col-span-2">
                <div className="text-gray-500 text-xs tracking-widest">ASSIGNED TO</div>
                <div className="font-medium text-gray-800 mt-0.5 flex items-center gap-1.5">
                  {assignee === 'Unassigned' ? (
                    <span className="text-amber-600">Unassigned</span>
                  ) : (
                    assignee
                  )}
                </div>
              </div>
            </div>

            {/* Actions - Only show if not Discarded */}
            {asset.AMS_Status__c !== 'Discarded' && (
              <div className="mt-6 flex gap-3">
                <Button
                  icon={<SwapOutlined />}
                  size="middle"
                  className="flex-1 h-11 text-sm font-medium shadow-sm hover:shadow"
                  onClick={() => onManageAssignment?.(asset)}
                >
                  Manage 
                </Button>

                <Button
                  icon={<DeleteOutlined />}
                  danger
                  size="middle"
                  className="flex-1 h-11 text-sm font-medium shadow-sm hover:shadow"
                  onClick={() => onDiscard?.(asset)}
                >
                  Discard Asset
                </Button>
              </div>
            )}
          </div>
        );
      })}

      {assets.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          No assets found
        </div>
      )}
    </div>
  );
}
  return (
    <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
        <Table 
            rowKey="Id"
            columns={columns} 
            dataSource={assets} 
            loading={loading}
            pagination={{ pageSize: 10 }}
            scroll={{ x: 'max-content' }}
        />
    </div>
  );
}
