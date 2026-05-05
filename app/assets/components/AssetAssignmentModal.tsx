"use client"

import { useState, useEffect } from 'react';
import { Modal, Form, Select, DatePicker, Input, Switch, Alert, Button, Divider , Spin } from 'antd';
import { SalesforceAsset, AssignmentHistory } from '../types';
import { updateAssetAssignment, getAllEmployeesForSelect, getAssetById } from '../actions';
import dayjs from 'dayjs';
import { UserOutlined, ClockCircleOutlined, SwapOutlined } from '@ant-design/icons';
import { Timeline } from 'antd';
import { showToast } from './toast';

interface AssetAssignmentModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  asset: SalesforceAsset | null;
  currentAssignment?: AssignmentHistory | null; // The active assignment if any
}

export function AssetAssignmentModal({ visible, onCancel, onSuccess, asset, currentAssignment }: AssetAssignmentModalProps) {
  const [form] = Form.useForm();
  const [isAssigning, setIsAssigning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [history, setHistory] = useState<AssignmentHistory[]>([]);

  useEffect(() => {
    async function fetchData(){
        if (visible) {
            form.resetFields();
            await loadEmployees();
            if (asset) loadHistory(asset.Id);
            
            // Default state
            if (!currentAssignment) {
              setIsAssigning(true); // If Un-Assigned, assume we want to assign
              form.setFieldsValue({
                  assignToNewPerson: true
              })
            } else {
              setIsAssigning(false); // If assigned, default to "just return" or "idle"
               form.setFieldsValue({
                  assignToNewPerson: false
              })
            }
          }
    }
    try{
        setLoading(true);
        fetchData();
    }catch(e){
        console.error("Failed to load data", e);
    }finally{
        setLoading(false);
    }
  }, [visible, asset, currentAssignment]);

  const loadEmployees = async () => {
    try {
      const data = await getAllEmployeesForSelect();
      setEmployees(data);
    } catch (e) {
      console.error("Failed to load employees", e);
    }
  };

  const loadHistory = async (assetId: string) => {
      try {
          const data = await getAssetById(assetId);
          if (data && data.history) {
              setHistory(data.history);
          }
      } catch (e) {
          console.error("Failed to load history", e);
      }
  }

  const handleFinish = async (values: any) => {
    if (!asset) return;

    // Logic Check: If AssingToNewPerson is FALSE and NOT assigned, nothing to do
    if (!values.assignToNewPerson && !currentAssignment) {
        showToast.info("No Changes", { description: "No changes to make." });
        return;
    }

    setLoading(true);
    try {
        await updateAssetAssignment({
            assetId: asset.Id,
            assignToNewPerson: values.assignToNewPerson,
            newAssigneeId: values.assignedPerson,
            assignedDate: values.assignedDate ? values.assignedDate.format('YYYY-MM-DD') : undefined,
            remarks: values.remarks,
            conditionOnAssignment: values.conditionOnAssignment,
            
            // Return logic
            currentAssignmentId: currentAssignment?.Id,
            conditionOnReturn: values.conditionOnReturn, // For the OLD assignment
        });
        showToast.success("Updated Successfully", { description: "Asset assignment updated successfully!" });
        onSuccess();
    } catch (err: any) {
        showToast.error("Update Failed", { description: err.message });
    } finally {
        setLoading(false);
    }
  };
  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "—"; // fallback UI
  
    const date = new Date(dateString);
  
    if (isNaN(date.getTime())) return "—"; // invalid date safeguard
  
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };
  return (
    <Modal
      title={`Manage Assignment: ${asset?.Name}`}
      open={visible}
      onCancel={onCancel}
      footer={null}
      destroyOnClose
      width="100%"
      style={{ maxHeight: 'calc(100vh - 120px)', top: 20 , overflowY : 'auto' , maxWidth : '80vw' , borderRadius : '10px' , scrollbarWidth : 'none'}}
      className="mobile-modal"
    >
    <Spin spinning={loading} size="large" tip="Loading...">
      <div className="mb-4">
          <p className="text-sm text-gray-500 break-words">Asset: <b>{asset?.AMS_Product__r?.Name || asset?.AMS_Category__c}</b> ({asset?.AMS_Asset_Serial_Number__c})</p>
          <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="text-gray-600">Current Status:</span> 
              <Tag color={currentAssignment ? "blue" : "green"}>
                  {currentAssignment ? `Assigned to ${asset?.AMS_Assigned_To__r?.Employee_Name__c || 'Unknown'}` : "Un-Assigned"}
              </Tag>
          </div>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        initialValues={{
            assignedDate: dayjs(),
            conditionOnAssignment: 'New',
            conditionOnReturn: 'Good' // Default
        }}
      >
        {/* RETURN SECTION (Only if currently assigned) */}
        {currentAssignment && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4 border border-gray-200">
                <h4 className="font-semibold text-gray-700 mb-2">Return Current Assignment</h4>
                <p className="text-xs text-gray-500 mb-3">
                    Assigned to: {asset?.AMS_Assigned_To__r?.Employee_Name__c} since {formatDate(currentAssignment.AMS_Assigned_Date__c)}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Form.Item 
                        name="conditionOnReturn" 
                        label="Condition on Return" 
                        rules={[{ required: true, message: 'Condition is required to close assignment' }]}
                    >
                        <Select>
                            <Select.Option value="New">New</Select.Option>
                            <Select.Option value="Good">Good</Select.Option>
                            <Select.Option value="Used">Used</Select.Option>
                            <Select.Option value="Damaged">Damaged</Select.Option>
                            <Select.Option value="Needs Repair">Needs Repair</Select.Option>
                        </Select>
                    </Form.Item>
                    {/* Return Date could be here, strict req says "Populate Returned Date", implied logic is "Today" or specific. Adding field for precision. */}
                </div>
            </div>
        )}

        <Divider />

        {/* ASSIGNMENT SWITCH */}
        <Form.Item name="assignToNewPerson" valuePropName="checked">
            <Switch     
                checkedChildren="Assign to New Person" 
                unCheckedChildren="Do Not Reassign" 
                onChange={(checked) => setIsAssigning(checked)}
            />
        </Form.Item>

        {/* NEW ASSIGNMENT SECTION */}
        {isAssigning && (
            <div className="animate-fade-in">
                <Form.Item 
                    name="assignedPerson" 
                    label="Assigned Person" 
                    rules={[{ required: true, message: 'Required' }]}
                >
                    <Select 
                        className="w-full"
                        showSearch = {{filterOption : (input, option: any) =>  String(option?.children).toLowerCase().includes(input.toLowerCase()) ,optionFilterProp : 'children'}} 
                        placeholder="Select Employee"
                    >
                        {employees.map(emp => (
                            <Select.Option key={emp.Id} value={emp.Id}>
                                {emp.Employee_Name__c} ({emp.Department__c || 'No Dept'})
                            </Select.Option>
                        ))}
                    </Select>
                </Form.Item>

                <div className="grid grid-cols-2 gap-4">
                    <Form.Item 
                        name="assignedDate" 
                        label="Assigned Date" 
                        rules={[{ required: true, message: 'Date required' }]}
                    >
                        <DatePicker className="w-full h-11" size='middle'/>
                    </Form.Item>

                     <Form.Item 
                        name="conditionOnAssignment" 
                        label="Condition" 
                    >
                         <Select className='h-11'>
                            <Select.Option value="New">New</Select.Option>
                            <Select.Option value="Second-hand">Second hand</Select.Option>
                        </Select>
                    </Form.Item>
                </div>

                <Form.Item name="remarks" label="Remarks">
                    <Input.TextArea rows={2} placeholder='Enter Remarks'/>
                </Form.Item>
            </div>
        )}

         <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
            <Button onClick={onCancel}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={loading}>
                {isAssigning ? 'Save Assignment' : (currentAssignment ? 'Return Asset' : 'Close')}
            </Button>
        </div>
      </Form>

      {history.length > 0 && (
          <>
            <Divider orientation="horizontal" className="text-gray-500 text-sm">Assignment History</Divider>
            <div className="max-h-60 overflow-y-auto px-2 sm:px-4">
                <Timeline
                    items={history.map(h => ({
                        color: h.AMS_Returned_Date__c ? 'gray' : 'green',
                        dot: h.AMS_Returned_Date__c ? <ClockCircleOutlined /> : <UserOutlined />,
                        children: (
                            <div className="mb-4 break-words">
                                <div className="font-semibold text-gray-800">
                                    {h.AMS_Assigned_Person__r?.Employee_Name__c || 'Unknown Employee'}
                                </div>
                                <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                                    <span>{new Date(h.AMS_Assigned_Date__c).toLocaleDateString()}</span>
                                    <SwapOutlined className="text-gray-300"/>
                                    <span>{h.AMS_Returned_Date__c ? new Date(h.AMS_Returned_Date__c).toLocaleDateString() : 'Present'}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 mt-2 text-xs bg-gray-50 p-2 rounded">
                                    <div>
                                        <span className="text-gray-400 block">Condition (Start)</span>
                                        <span className="font-medium text-gray-700">{h.AMS_Condition_on_Assignment__c || '-'}</span>
                                    </div>
                                    {h.AMS_Returned_Date__c && (
                                        <div>
                                            <span className="text-gray-400 block">Condition (End)</span>
                                            <span className="font-medium text-gray-700">{h.AMS_Condition_on_Return__c || '-'}</span>
                                        </div>
                                    )}
                                </div>
                                {h.AMS_Remark__c && (
                                    <div className="text-xs text-gray-500 mt-1 italic">
                                        "{h.AMS_Remark__c}"
                                    </div>
                                )}
                            </div>
                        )
                    }))}
                />
            </div>
          </>
      )}
    </Spin>
    </Modal>
  );
}

const colorMap: Record<string, string> = {
  blue: 'bg-blue-100 text-blue-800',
  green: 'bg-green-100 text-green-800',
  gray: 'bg-gray-100 text-gray-800',
};

function Tag({ children, color }: { children: React.ReactNode, color: string }) {
  return (
    <span className={`px-2 py-1 rounded text-xs font-semibold ${colorMap[color] || 'bg-gray-100 text-gray-800'}`}>
      {children}
    </span>
  );
}
