"use client"

import { useState } from 'react';
import { Button, Input, Modal } from 'antd';
import { PlusOutlined, SearchOutlined, ReloadOutlined, AppstoreOutlined, FileAddOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { AssetTable } from './AssetTable';
import { AssetAssignmentModal } from './AssetAssignmentModal';
import { CreateAssetModal } from './CreateAssetModal';
import { SalesforceAsset, AssignmentHistory } from '../types';
import { getAssetById, getAssets, updateAssetStatus } from '../actions';
import { showToast } from './toast';

// ... (existing modalWidth)

interface AssetManagerProps {
  initialAssets: SalesforceAsset[];
}

export function AssetManager({ initialAssets }: AssetManagerProps) {
  const router = useRouter();
  const [assets, setAssets] = useState<SalesforceAsset[]>(initialAssets);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  
  // Modal States
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [currentAssignment, setCurrentAssignment] = useState<AssignmentHistory | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<SalesforceAsset | null>(null);

  const refreshAssets = async () => {
    setLoading(true);
    try {
      const data = await getAssets();
      setAssets(data);
    } catch (e) {
      showToast.error("Failed to refresh assets");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSuccess = () => {
      setIsCreateModalVisible(false);
      refreshAssets();
  }

  const handleManageAssignment = async (asset: SalesforceAsset) => {
    setSelectedAsset(asset);
    try {
        const details = await getAssetById(asset.Id);
        if (details && details.history) {
            const active = details.history.find(h => !h.AMS_Returned_Date__c);
            setCurrentAssignment(active || null);
        } else {
             setCurrentAssignment(null);
        }
        setIsModalVisible(true);
    } catch (e) {
        showToast.error("Failed to fetch assignment details");
    }
  };
  
  const handleDiscard = async (asset: SalesforceAsset) => {
    if (asset.AMS_Status__c === 'Discarded') {
        showToast.warning("Asset Already Discarded", { 
            description: "This asset has already been marked as discarded. No further action is required." 
        });
        return;
    }

    try {
        const details = await getAssetById(asset.Id);
        const active = details?.history?.find(h => !h.AMS_Returned_Date__c);

        if (active) {
            const assigneeName = active.AMS_Assigned_Person__r?.Employee_Name__c || active.AMS_Assigned_Person__r?.Name || 'Unknown';
            showToast.warning("Active Assignment Found", {
                description: `This asset has an active assignment record (${active.Name} with ${assigneeName}). Please ensure the asset is returned before proceeding.`
            });
            return;
        }

        Modal.confirm({
            title: 'Confirm Discard',
            icon: <ExclamationCircleOutlined />,
            content: 'Consent Given to Discard? This action updates the status to Discarded.',
            okText: 'Yes, Discard',
            okType: 'danger',
            cancelText: 'No',
            onOk: async () => {
                try {
                    setLoading(true);
                    await updateAssetStatus(asset.Id, 'Discarded');
                    showToast.success('Asset Discarded', { description: 'The asset status has been updated to Discarded.' });
                    await refreshAssets();
                } catch (e: any) {
                    showToast.error('Discard Failed', { description: e.message || 'Failed to discard asset' });
                    setLoading(false);
                }
            }
        });
    } catch (e) {
        console.error("Check Discard Error", e);
        showToast.error("Verification Failed", { description: "Failed to verify asset details" });
    }
  };

  const handleModalSuccess = () => {
    setIsModalVisible(false);
    refreshAssets();
  };

  // Filter
  const filteredAssets = assets.filter(a => 
    a.Name.toLowerCase().includes(searchText.toLowerCase()) || 
    (a.AMS_Product__r?.Name || '').toLowerCase().includes(searchText.toLowerCase()) ||
    (a.AMS_Assigned_To__r?.Employee_Name__c || '').toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center">
        <div className="relative w-full lg:w-96">
            <Input 
                prefix={<SearchOutlined className="text-gray-400" />} 
                placeholder="Search assets..." 
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                className="rounded-lg py-2.5 shadow-sm text-base"
                size="large"
            />
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto items-center">
            {/* Mobile: Grid of actions */}
            <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full">
                <Button 
                    icon={<ReloadOutlined />} 
                    onClick={refreshAssets} 
                    loading={loading}
                    className="w-full sm:w-auto h-10"
                >
                    Refresh
                </Button>
                
                <Button 
                    icon={<AppstoreOutlined />} 
                    onClick={() => router.push('/assets/products')}
                    className="w-full sm:w-auto h-10"
                >
                    Catalog
                </Button>
            </div>
            
            <Button 
                type="primary" 
                icon={<PlusOutlined />} 
                onClick={() => setIsCreateModalVisible(true)}
                className="w-full sm:w-auto h-10 shadow-md"
            >
                New Asset
            </Button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <StatCard title="Total Assets" value={assets.length} color="blue" />
          <StatCard title="Assigned" value={assets.filter(a => a.AMS_Status__c === 'Assigned').length} color="purple" />
          <StatCard title="In Stock" value={assets.filter(a => a.AMS_Status__c === 'Un-Assigned').length} color="green" />
          <StatCard title="Discarded" value={assets.filter(a => a.AMS_Status__c === 'Discarded').length} color="gray" />
      </div>

      {/* Table */}
      <AssetTable 
        assets={filteredAssets} 
        loading={loading} 
        onManageAssignment={handleManageAssignment} 
        onDiscard={handleDiscard}
      />

      {/* Assignment Modal */}
      <AssetAssignmentModal 
        visible={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        onSuccess={handleModalSuccess}
        asset={selectedAsset}
        currentAssignment={currentAssignment}
      />

      {/* Create Asset Modal */}
      <CreateAssetModal
        visible={isCreateModalVisible}
        onCancel={() => setIsCreateModalVisible(false)}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
}

function StatCard({ title, value, color }: { title: string, value: number, color: string }) {
    // Map colors to theme-aware classes if needed, or keeping it simple for now
    return (
        <div className="p-4 rounded-xl bg-card border border-border shadow-sm flex flex-col items-center justify-center">
            <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">{title}</span>
            <span className="text-2xl font-bold text-foreground">{value}</span>
        </div>
    )
}
