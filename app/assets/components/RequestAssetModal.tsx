"use client"

import { useState, useEffect } from 'react';
import { Modal, Form, Select, Input, Alert, Spin } from 'antd';
import { SendOutlined } from '@ant-design/icons';
import { getAssetCategories, submitAssetRequest } from '../actions';
import { showToast } from './toast';

interface RequestAssetModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  employeeName: string;
  employeeEmail: string;
}

export function RequestAssetModal({
  visible,
  onCancel,
  onSuccess,
  employeeName,
  employeeEmail,
}: RequestAssetModalProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    if (!visible) return;
    form.resetFields();
    fetchCategories();
  }, [visible]);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const data = await getAssetCategories();
      setCategories(data);
    } catch (e) {
      console.error('Failed to load asset categories', e);
      showToast.error('Could not load asset categories');
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = async (values: any) => {
    setSubmitting(true);
    try {
      await submitAssetRequest({
        category: values.category,
        reason: values.reason?.trim() || undefined,
        employeeName,
        employeeEmail,
      });
      showToast.success('Request Submitted', {
        description: "HR has been notified and will process your request within 5 working days.",
      });
      onSuccess();
    } catch (e: any) {
      showToast.error('Submission Failed', { description: e.message || 'Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={
        <span className="flex items-center gap-2 text-base font-semibold">
          <SendOutlined className="text-green-600" />
          Request Asset
        </span>
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      destroyOnClose
      width={500}
      centered
      style={{ maxWidth: '95vw' }}
    >
      <Spin spinning={loading} tip="Loading categories…">
        <div className="py-2">
          {!loading && categories.length === 0 ? (
            <Alert
              type="info"
              showIcon
              message="No Categories Available"
              description="There are currently no available asset categories. Please contact HR directly."
              className="mb-4"
            />
          ) : (
            <>
              <p className="text-sm text-slate-500 mb-5">
                Select the asset category you need. HR will review and arrange the asset within 5 working days.
              </p>

              <Form form={form} layout="vertical" onFinish={handleFinish}>
                <Form.Item
                  name="category"
                  label="Asset Category"
                  rules={[{ required: true, message: 'Please select an asset category' }]}
                >
                  <Select
                    placeholder="Select a category"
                    showSearch
                    size="large"
                    filterOption={(input, option: any) =>
                      String(option?.label || '').toLowerCase().includes(input.toLowerCase())
                    }
                    options={categories.map(c => ({ label: c, value: c }))}
                    className="w-full"
                  />
                </Form.Item>

                <Form.Item name="reason" label="Reason for Request (Optional)">
                  <Input.TextArea
                    rows={3}
                    placeholder="e.g. Required for remote work setup, my current device is being repaired"
                    maxLength={500}
                    showCount
                  />
                </Form.Item>

                {/* Approval workflow callout */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-5">
                  <p className="text-sm font-semibold text-emerald-800 mb-1.5">⏱ Approval Workflow</p>
                  <ul className="text-sm text-emerald-700 space-y-1 list-disc list-inside">
                    <li>Your request will be reviewed by the HR team.</li>
                    <li>Once approved, the asset will be assigned within <strong>5 working days</strong>.</li>
                    <li>You will receive an email confirmation of this submission.</li>
                  </ul>
                </div>

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
                    className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed transition flex items-center gap-2"
                  >
                    {submitting ? (
                      <><Spin size="small" /> Submitting…</>
                    ) : (
                      <><SendOutlined /> Submit Request</>
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
