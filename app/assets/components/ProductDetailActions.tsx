"use client"

import { Button, Popconfirm } from 'antd';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SalesforceProduct } from '../types';
import { EditProductModal } from './EditProductModal';
import { deleteProduct } from '../actions';
import { showToast } from './toast';

export function ProductDetailActions({ product }: { product: SalesforceProduct }) {
  const router = useRouter();
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteProduct(product.Id);
      showToast.success('Product Deleted', { description: 'Product deleted successfully.' });
      window.location.href = '/assets/products';
    } catch (error: any) {
      showToast.error('Delete Failed', { description: 'Cannot delete product. This record cannot be deleted because it is already associated with inventory items.' });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col justify-between items-center gap-3">
      <Button 
        icon={<EditOutlined />}   
        type="default" 
        onClick={() => setIsEditModalVisible(true)}
        className="flex items-center gap-1.5 h-10 px-4 rounded-xl border-gray-500 hover:border-blue-400 hover:text-blue-500 font-semibold transition"
      >
      </Button>

      <Popconfirm
        title="Delete Product"
        description="Are you sure you want to delete this product? This action cannot be undone."
        onConfirm={handleDelete}
        okText="Delete"
        cancelText="Cancel"
        okButtonProps={{ danger: true, loading: isDeleting, className: "rounded-lg" }}
        cancelButtonProps={{ className: "rounded-lg" }}
        placement="bottomRight"
      >
        <Button 
          danger
          type="default"
          icon={<DeleteOutlined />} 
          className="flex items-center gap-1.5 h-10 px-4 rounded-xl border-red-200 hover:border-red-400 hover:text-red-500 font-semibold transition"
        >
        </Button>
      </Popconfirm>

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
