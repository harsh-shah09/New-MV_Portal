"use client"

import { Button, Modal } from 'antd';
import { EditOutlined, DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SalesforceProduct } from '../types';
import { deleteProduct } from '../actions';
import { EditProductModal } from './EditProductModal';
import { showToast } from './toast';

export function ProductDetailActions({ product }: { product: SalesforceProduct }) {
  const router = useRouter();
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);

  const handleDelete = () => {
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
          router.push('/assets/products');
        } catch (err: any) {
          showToast.error('Delete Failed', { 
            description: err.message || 'Failed to delete product' 
          });
        }
      }
    });
  };

  return (
    <div className="flex gap-2">
      <Button 
        icon={<EditOutlined />} 
        type="default" 
        onClick={() => setIsEditModalVisible(true)}
        className="flex items-center"
      >
        Edit Product
      </Button>
      <Button 
        icon={<DeleteOutlined />} 
        danger
        onClick={handleDelete}
        className="flex items-center"
      >
        Delete Product
      </Button>
      <EditProductModal 
        visible={isEditModalVisible}
        onCancel={() => setIsEditModalVisible(false)}
        onSuccess={() => {
          setIsEditModalVisible(false);
          router.refresh();
        }}
        product={product}
      />
    </div>
  );
}
