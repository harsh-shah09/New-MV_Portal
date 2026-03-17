"use client"

import { useState, useMemo } from 'react';
import { Input, Button, Card, Modal, Row, Col, Select } from 'antd';
import { PlusOutlined, SearchOutlined, AppstoreOutlined, ExclamationCircleOutlined, FilterOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { AssetTable } from './AssetTable';
import { AssetAssignmentModal } from './AssetAssignmentModal';
import { CreateAssetModal } from './CreateAssetModal';
import { SalesforceAsset, AssignmentHistory } from '../types';
import { getAssetById, getAssets, updateAssetStatus } from '../actions';
import { showToast } from './toast';
import { RefreshButton } from '@/components/refresh-button';
import { PageHeader } from '@/components/page-header';

interface AssetManagerProps {
  initialAssets: SalesforceAsset[];
}

const STATUS_OPTIONS = [
  { label: 'All Status', value: '' },
  { label: 'Assigned', value: 'Assigned' },
  { label: 'Un-Assigned', value: 'Un-Assigned' },
  { label: 'Discarded', value: 'Discarded' },
];

export function AssetManager({ initialAssets }: AssetManagerProps) {
  const router = useRouter();
  const [assets, setAssets] = useState<SalesforceAsset[]>(initialAssets);
  const [loading, setLoading] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal States
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [currentAssignment, setCurrentAssignment] = useState<AssignmentHistory | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<SalesforceAsset | null>(null);

  // Derive unique categories from loaded assets
  const categoryOptions = useMemo(() => {
    const unique = Array.from(new Set(assets.map(a => a.AMS_Category__c).filter(Boolean)));
    return [
      { label: 'All Categories', value: '' },
      ...unique.map(c => ({ label: c, value: c })),
    ];
  }, [assets]);

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
  };

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
        description: "This asset has already been marked as discarded. No further action is required.",
      });
      return;
    }

    try {
      const details = await getAssetById(asset.Id);
      const active = details?.history?.find(h => !h.AMS_Returned_Date__c);

      if (active) {
        const assigneeName =
          active.AMS_Assigned_Person__r?.Employee_Name__c ||
          active.AMS_Assigned_Person__r?.Name ||
          'Unknown';
        showToast.warning("Active Assignment Found", {
          description: `This asset has an active assignment record (${active.Name} with ${assigneeName}). Please ensure the asset is returned before proceeding.`,
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
            showToast.success('Asset Discarded', {
              description: 'The asset status has been updated to Discarded.',
            });
            await refreshAssets();
          } catch (e: any) {
            showToast.error('Discard Failed', { description: e.message || 'Failed to discard asset' });
            setLoading(false);
          }
        },
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

  // Combined filter
  const filteredAssets = assets.filter(a => {
    const search = searchText.toLowerCase();
    const matchesSearch =
      a.Name.toLowerCase().includes(search) ||
      (a.AMS_Product__r?.Name || '').toLowerCase().includes(search) ||
      (a.AMS_Assigned_To__r?.Employee_Name__c || '').toLowerCase().includes(search);
    const matchesCategory = !categoryFilter || a.AMS_Category__c === categoryFilter;
    const matchesStatus = !statusFilter || a.AMS_Status__c === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="space-y-4">

      {/* ── Page Header with New Asset CTA ── */}
      <PageHeader
        title="Asset Management"
        subtitle="Manage company assets, assignments, and returns."
      >
        <Button
          type="primary"
          size='large'
          icon={<PlusOutlined size={16}/>}
          onClick={() => setIsCreateModalVisible(true)}
          className="h-10 shadow-md flex items-center"
        >
          New Asset
        </Button>
      </PageHeader>

      {/* ── Filter / Action Bar ── */}
      <Card
        className="rounded-xl shadow-sm border-border bg-card text-card-foreground"
        styles={{ body: { padding: '14px 16px' } }}
        style={{ marginBottom: '10px' }}
      >
        <Row gutter={[12, 12]} align="middle" wrap>

          {/* 🔍 Search — takes remaining space */}
          <Col xs={24} sm={24} md={8} lg={9} xl={10}>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Search</label>
            <Input
              prefix={<SearchOutlined className="text-gray-400" />}
              placeholder="Search by Product or Assignee..."
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              allowClear
              className="rounded-lg w-full"
            />
          </Col>

          {/* 🗂 Category Filter */}
          <Col xs={12} sm={8} md={5} lg={5} xl={5}>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Category</label>
            <Select
              options={categoryOptions}
              value={categoryFilter}
              onChange={setCategoryFilter}
              placeholder="All Categories"
              className="w-full"
              suffixIcon={<FilterOutlined className="text-gray-400" />}
            />
          </Col>

          {/* 🔖 Status Filter */}
          <Col xs={12} sm={8} md={4} lg={4} xl={4}>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Status</label>
            <Select
              options={STATUS_OPTIONS}
              value={statusFilter}
              onChange={setStatusFilter}
              placeholder="All Status"
              className="w-full"
            />
          </Col>

          {/* 🔘 Right-side action buttons */}
          <Col xs={24} sm={8} md={7} lg={6} xl={5}>
            {/* Spacer matches the label height in other columns */}
            <label className="block text-xs font-medium text-muted-foreground mb-1 invisible select-none">
              &nbsp;
            </label>
            <div className="flex gap-3 justify-end items-center">
              <RefreshButton
                label=""
                onClick={refreshAssets}
                loading={loading}
                className="h-9"
              />
              <Button
                icon={<AppstoreOutlined />}
                loading={catalogLoading}
                onClick={() => {
                  setCatalogLoading(true);
                  router.push('/assets/products');
                }}
                className="h-9 flex items-center"
              >
                Catalog
              </Button>
            </div>
          </Col>

        </Row>
      </Card>

      {/* ── Table ── */}
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
