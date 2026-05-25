"use client"

import { Table, Input, Tag, Button, Card, Tooltip, Modal } from 'antd';
import { SearchOutlined, PlusOutlined, DatabaseOutlined, ReloadOutlined, EditOutlined, DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useState } from 'react';
import Link from 'next/link';
import { SalesforceProduct } from '../types';
import { CreateProductModal } from '../components/CreateProductModal';
import { EditProductModal } from '../components/EditProductModal';
import { deleteProduct } from '../actions';
import { showToast } from '../components/toast';
import { useRouter } from 'next/navigation';
import { RefreshButton } from '@/components/refresh-button';

export function ProductList({ products: initialProducts }: { products: SalesforceProduct[] }) {
    const router = useRouter();
    const [searchText, setSearchText] = useState('');
    const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<SalesforceProduct | null>(null);
    
    // Simple filter
    const filtered = initialProducts.filter(p => 
        p.Name.toLowerCase().includes(searchText.toLowerCase()) || 
        (p.AMS_Model_Number__c || '').toLowerCase().includes(searchText.toLowerCase()) ||
        (p.AMS_Category__c || '').toLowerCase().includes(searchText.toLowerCase())
    );

    const handleDelete = (product: SalesforceProduct) => {
        Modal.confirm({
            title: 'Confirm Delete',
            icon: <ExclamationCircleOutlined className="text-red-500" />,
            content: `Are you sure you want to delete product "${product.Name}"? This action cannot be undone.`,
            okText: 'Yes, Delete',
            okType: 'danger',
            cancelText: 'No',
            onOk: async () => {
                try {
                    await deleteProduct(product.Id);
                    showToast.success('Product Deleted', {
                        description: `Product "${product.Name}" deleted successfully.`
                    });
                    router.refresh();
                } catch (err: any) {
                    showToast.error('Delete Failed', { 
                        description: err.message || 'Failed to delete product' 
                    });
                }
            }
        });
    }

    const columns = [
        {
            title: 'Product Name',
            dataIndex: 'Name',
            key: 'Name',
            className: 'font-semibold text-gray-700',
            render: (text: string, r: SalesforceProduct) => (
                <Link href={`/assets/products/${r.Id}`} className="hover:text-blue-600 transition-colors flex items-center gap-2">
                    <DatabaseOutlined className="text-gray-400" />
                    {text}
                </Link>
            )
        },
        {
            title: 'Model',
            dataIndex: 'AMS_Model_Number__c',
            key: 'AMS_Model_Number__c',
            render: (text: string) => <span className="font-mono text-xs bg-gray-50 px-2 py-1 rounded text-gray-600">{text}</span>
        },
        {
            title: 'Category',
            dataIndex: 'AMS_Category__c',
            key: 'AMS_Category__c',
            render: (c: string) => <Tag color="blue">{c}</Tag>
        },
        {
            title: 'Status',
            dataIndex: 'IsActive',
            key: 'IsActive',
            render: (active: boolean) => active ? <Tag color="success">Active</Tag> : <Tag color="error">Inactive</Tag>
        },
        {
            title: 'Description',
            dataIndex: 'AMS_Description__c',
            key: 'AMS_Description__c',
            responsive: ['lg'] as any,
            render: (text: string) => <span className="text-gray-500 truncate block max-w-xs">{text}</span>
        },
        {
            title: 'Action',
            key: 'action',
            width: 120,
            render: (_: any, r: SalesforceProduct) => (
                <div className="flex gap-2">
                    <Tooltip title="Edit Product">
                        <Button 
                            icon={<EditOutlined />} 
                            type="primary" 
                            ghost 
                            size="small"
                            onClick={() => {
                                setSelectedProduct(r);
                                setIsEditModalVisible(true);
                            }}
                        />
                    </Tooltip>
                    <Tooltip title="Delete Product">
                        <Button 
                            icon={<DeleteOutlined />} 
                            danger
                            size="small"
                            onClick={() => handleDelete(r)}
                        />
                    </Tooltip>
                </div>
            )
        }
    ];

    return (
        <div className="space-y-6">
            {/* Toolbar */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <div className="w-full md:w-96 relative">
                    <Input 
                        prefix={<SearchOutlined className="text-gray-400" />} 
                        placeholder="Search products..." 
                        value={searchText}
                        onChange={e => setSearchText(e.target.value)}
                        className="py-2.5 rounded-lg border-gray-200 hover:border-blue-300 focus:border-blue-500 transition-all shadow-sm"
                        allowClear
                    />
                </div>
                
                <div className="flex items-center gap-3 w-full md:w-auto">
                     <Tooltip title="Refresh List">
                        <RefreshButton 
                            label = ''
                            onClick={() => router.refresh()} 
                            className="bg-gray-50 text-gray-500 border-gray-200 hover:text-blue-600 hover:border-blue-200"
                        />
                    </Tooltip>
                    <Button 
                        type="primary" 
                        icon={<PlusOutlined />}
                        onClick={() => setIsCreateModalVisible(true)}
                        className="bg-blue-600 hover:bg-blue-500 h-10 px-6 font-medium rounded-lg shadow-blue-100 shadow-xl"
                    >
                        Add Product
                    </Button>
                </div>
            </div>

            {/* Content */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <Table 
                    rowKey="Id" 
                    dataSource={filtered} 
                    columns={columns} 
                    pagination={{ 
                        position: ['bottomRight'],
                        defaultPageSize: 10,
                    }}
                    scroll={{ x: 800 }}
                    size='large'
                    className="overflow-hidden"
                />
            </div>

            <CreateProductModal 
                visible={isCreateModalVisible} 
                onCancel={() => setIsCreateModalVisible(false)} 
                onSuccess={() => {
                    setIsCreateModalVisible(false);
                    router.refresh();
                }} 
            />

            <EditProductModal
                visible={isEditModalVisible}
                onCancel={() => {
                    setIsEditModalVisible(false);
                    setSelectedProduct(null);
                }}
                onSuccess={() => {
                    setIsEditModalVisible(false);
                    setSelectedProduct(null);
                    router.refresh();
                }}
                product={selectedProduct}
            />
        </div>
    )
}
