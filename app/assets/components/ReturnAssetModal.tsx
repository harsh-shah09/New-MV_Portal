"use client"

import { useState, useEffect } from 'react';
import { Modal, Form, Select, Input, Alert, Spin } from 'antd';
import { UndoOutlined } from '@ant-design/icons';
import { getEmployeeAssignedAssets, submitAssetReturnRequest } from '../actions';
import { showToast } from './toast';

interface ReturnAssetModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
}

export function ReturnAssetModal({
  visible,
  onCancel,
  onSuccess,
  employeeId,
  employeeName,
  employeeEmail,
}: ReturnAssetModalProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [assignedAssets, setAssignedAssets] = useState<any[]>([]);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!visible) return;
    form.resetFields();
    setSubmitted(false);
    fetchAssignedAssets();
  }, [visible]);

  const fetchAssignedAssets = async () => {
    if (!employeeId) return;
    setLoading(true);
    try {
      const data = await getEmployeeAssignedAssets(employeeId);
      setAssignedAssets(data);
    } catch (e) {
      console.error('Failed to load assigned assets', e);
      showToast.error('Could not load assigned assets');
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = async (values: any) => {
    const record = assignedAssets.find(a => a.AMS_Asset__c === values.assetId);
    if (!record) return;

    const assetName =
      record.AMS_Asset__r?.AMS_Product__r?.Name ||
      record.AMS_Asset__r?.Name ||
      'Asset';
    const assetCode = record.AMS_Asset__r?.Internal_Serial_Number__c || record.AMS_Asset__r?.AMS_Asset_Serial_Number__c || record.Name;

    setSubmitting(true);
    try {
      await submitAssetReturnRequest({
        assetId: values.assetId,
        assetName,
        assetCode,
        employeeName,
        employeeEmail,
        remarks: values.remarks?.trim() || undefined,
      });
      setSubmitted(true);
      showToast.success('Return Request Submitted', {
        description: 'HR has been notified. You will be contacted to hand over the asset.',
      });
      onSuccess();
    } catch (e: any) {
      showToast.error('Submission Failed', { description: e.message || 'Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  const assetOptions = assignedAssets.map(a => {
    const productName = a.AMS_Asset__r?.AMS_Product__r?.Name || a.AMS_Asset__r?.Name || 'Asset';
    const code = a.AMS_Asset__r?.Internal_Serial_Number__c || a.AMS_Asset__r?.AMS_Asset_Serial_Number__c || a.Name;
    const category = a.AMS_Asset__r?.AMS_Category__c || '';
    return {
      label: `${productName}${code ? ` · ${code}` : ''}${category ? ` (${category})` : ''}`,
      value: a.AMS_Asset__c,
    };
  });

  return (
    <Modal
      title={
        <span className="flex items-center gap-2 text-base font-semibold">
          <UndoOutlined className="text-blue-600" />
          Return Asset
        </span>
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      destroyOnClose
      width={520}
      centered
      style={{ maxWidth: '95vw' }}
    >
      <Spin spinning={loading} tip="Loading your assigned assets…">
        <div className="py-2">
          {!loading && assignedAssets.length === 0 ? (
            <Alert
              type="info"
              showIcon
              message="No Active Assignments"
              description="You don't have any assets currently assigned to you."
              className="mb-4"
            />
          ) : (
            <>
              <p className="text-sm text-slate-500 mb-5">
                Select an asset you wish to return. HR will be notified and will coordinate the physical handover with you.
              </p>

              <Form
                form={form}
                layout="vertical"
                onFinish={handleFinish}
              >
                <Form.Item
                  name="assetId"
                  label="Asset to Return"
                  rules={[{ required: true, message: 'Please select an asset to return' }]}
                >
                  <Select
                    placeholder="Select an asset"
                    showSearch
                    filterOption={(input, option: any) =>
                      String(option?.label || '').toLowerCase().includes(input.toLowerCase())
                    }
                    options={assetOptions}
                    className="w-full"
                    size="large"
                  />
                </Form.Item>

                <Form.Item name="remarks" label="Remarks (Optional)">
                  <Input.TextArea
                    rows={3}
                    placeholder="e.g. Device has a minor scratch on the back panel"
                    maxLength={500}
                    showCount
                  />
                </Form.Item>

                <Alert
                  type="warning"
                  showIcon
                  message="HR will process this return in the Asset Management system. No changes are made automatically."
                  className="mb-5"
                />

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onCancel}
                    className="px-5 py-2 rounded-lg text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition flex items-center gap-2"
                  >
                    {submitting ? (
                      <><Spin size="small" /> Submitting…</>
                    ) : (
                      <><UndoOutlined /> Submit Return Request</>
                    )}
                  </button>
                </div>
              </Form>
            </>
          )}
        </div>
      </Spin>
    </Modal>
  );
}
