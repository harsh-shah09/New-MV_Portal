"use client"

import { Button } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SalesforceProduct } from '../types';
import { EditProductModal } from './EditProductModal';

export function ProductDetailActions({ product }: { product: SalesforceProduct }) {
  const router = useRouter();
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);

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
