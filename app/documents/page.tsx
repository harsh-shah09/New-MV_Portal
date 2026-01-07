
"use client"
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Table, Tag, Modal, Input, Select, message, Tabs, Form, Typography } from 'antd';
import { Plus, FileText, Clock, FileCheck, CheckCircle, Loader2 } from 'lucide-react';

const { Title, Text } = Typography;
const { TextArea } = Input;

export default function DocumentsPage() {
    const queryClient = useQueryClient();
    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
    const [form] = Form.useForm();
    const [submitting, setSubmitting] = useState(false);

    // Fetch My Documents
    const { data: documents = [], isLoading } = useQuery({
        queryKey: ['myDocuments'],
        queryFn: async () => {
            const res = await fetch('/api/documents/my-documents');
            if (!res.ok) throw new Error("Failed");
            return res.json();
        }
    });

    // Submit Request
    const handleRequestSubmit = async (values: any) => {
        setSubmitting(true);
        try {
            const res = await fetch('/api/documents/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    documentType: values.documentType,
                    comment: values.comment
                })
            });
            const data = await res.json();
            if (data.success) {
                message.success("Request submitted successfully");
                setIsRequestModalOpen(false);
                form.resetFields();
                queryClient.invalidateQueries({ queryKey: ['myDocuments'] });
            } else {
                message.error(data.error || "Failed");
            }
        } catch(e) {
            message.error("Failed to submit request");
        } finally {
            setSubmitting(false);
        }
    };

    const pendingDocs = documents.filter((d: any) => d.Status__c === 'Pending' || d.Status__c === 'Requested');
    const uploadedDocs = documents.filter((d: any) => d.Status__c === 'Uploaded');

    const commonColumns = [
        { 
            title: 'Document', 
            dataIndex: 'Name', 
            key: 'name',
            render: (text: string, record: any) => (
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${record.Status__c === 'Uploaded' ? 'bg-green-50' : 'bg-blue-50'}`}>
                        {record.Status__c === 'Uploaded' ? (
                            <FileCheck className={`w-5 h-5 ${record.Status__c === 'Uploaded' ? 'text-green-600' : 'text-blue-600'}`} />
                        ) : (
                            <FileText className="w-5 h-5 text-blue-600" />
                        )}
                    </div>
                    <div>
                        <div className="font-medium text-slate-700">{record.Document_Type__c || text}</div>
                        <div className="text-xs text-slate-400">{text}</div>
                    </div>
                </div>
            )
        },
        { 
            title: 'Requested Date', 
            dataIndex: 'CreatedDate', 
            key: 'date', 
            width: 200,
            render: (d: string) => (
                <div className="flex items-center gap-2 text-slate-500">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                </div>
            )
        }
    ];

    const pendingColumns = [
        ...commonColumns,
        { 
            title: 'Status', 
            dataIndex: 'Status__c', 
            key: 'status',
            width: 150,
            render: (text: string) => (
                <Tag color="orange" className="px-3 py-1 rounded-full border-0 bg-orange-50 text-orange-600 font-medium">
                    <div className="flex items-center gap-1.5">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        {text || 'Pending'}
                    </div>
                </Tag>
            )
        },
        {
            title: 'Action',
            key: 'action',
            render: () => <span className="text-slate-400 text-sm italic">Processing...</span>
        }
    ];

    const uploadedColumns = [
        ...commonColumns,
        { 
            title: 'Status', 
            dataIndex: 'Status__c', 
            key: 'status', 
            width: 150,
            render: (text: string) => (
                <Tag color="success" className="px-3 py-1 rounded-full border-0 bg-green-50 text-green-600 font-medium">
                    <div className="flex items-center gap-1.5">
                        <CheckCircle className="w-3 h-3" />
                        {text}
                    </div>
                </Tag>
            )
        },
        {
            title: 'Action',
            key: 'action',
            render: (_: any, record: any) => (
                record.File_URL__c ? (
                    <Button 
                        type="primary" 
                        ghost 
                        href={record.File_URL__c} 
                        target="_blank" 
                        icon={<FileCheck className="w-4 h-4" />}
                        className="flex items-center gap-2"
                    >
                        View Document
                    </Button>
                ) : <span className="text-slate-400 text-xs">Not available</span>
            )
        }
    ];

    const renderTable = (data: any[], columns: any[], emptyMessage: string, emptyIcon: any) => (
        <Table 
            dataSource={data} 
            columns={columns} 
            loading={isLoading} 
            rowKey="Id"
            pagination={{ pageSize: 5 }}
            className="border border-slate-100 rounded-lg overflow-hidden"
            locale={{
                emptyText: (
                    <div className="flex flex-col items-center py-12">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                            {emptyIcon}
                        </div>
                        <p className="text-slate-500 font-medium">{emptyMessage}</p>
                    </div>
                )
            }}
        />
    );

    const items = [
        {
            key: 'pending',
            label: (
                <div className="flex items-center gap-2 px-2 py-1">
                    <Clock className="w-4 h-4" />
                    <span>Pending Requests</span>
                    <span className="ml-2 bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full">{pendingDocs.length}</span>
                </div>
            ),
            children: renderTable(
                pendingDocs, 
                pendingColumns, 
                "No pending document requests", 
                <Loader2 className="w-8 h-8 text-slate-300" />
            )
        },
        {
            key: 'uploaded',
            label: (
                <div className="flex items-center gap-2 px-2 py-1">
                    <FileCheck className="w-4 h-4" />
                    <span>Uploaded Documents</span>
                    <span className="ml-2 bg-green-50 text-green-600 text-xs px-2 py-0.5 rounded-full">{uploadedDocs.length}</span>
                </div>
            ),
            children: renderTable(
                uploadedDocs, 
                uploadedColumns, 
                "No uploaded documents yet", 
                <FileCheck className="w-8 h-8 text-green-300" />
            )
        }
    ];

    return (
        <div className="min-h-screen bg-slate-50/50 p-6 lg:p-10">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <Title level={2} className="!mb-1 !text-slate-800">My Documents</Title>
                        <Text className="text-slate-500 text-lg">Manage and access your official employment documents</Text>
                    </div>
                    <Button 
                        type="primary" 
                        size="large" 
                        icon={<Plus className="w-5 h-5" />} 
                        onClick={() => setIsRequestModalOpen(true)}
                        className="bg-blue-600 hover:bg-blue-700 h-12 px-6 rounded-xl shadow-md hover:shadow-lg transition-all"
                    >
                        Request Document
                    </Button>
                </div>

                {/* Content Section */}
                <Card className="shadow-sm border-slate-100 rounded-2xl overflow-hidden" bodyStyle={{ padding: '0' }}>
                    <div className="px-6 pt-4 bg-white border-b border-slate-100">
                        <Tabs 
                            defaultActiveKey="pending" 
                            items={items} 
                            className="custom-tabs"
                            size="large"
                            tabBarStyle={{ marginBottom: 0 }}
                        />
                    </div>
                    <div className="p-6 bg-white min-h-[400px]">
                         {/* Content is handled by Tabs children */}
                    </div>
                </Card>

                <Modal
                    title={<span className="text-xl font-semibold">Request a Document</span>}
                    open={isRequestModalOpen}
                    onCancel={() => setIsRequestModalOpen(false)}
                    footer={null}
                    centered
                    className="rounded-2xl overflow-hidden"
                >
                    <Form form={form} layout="vertical" onFinish={handleRequestSubmit} className="pt-6">
                        <Form.Item name="documentType" label="Document Type" rules={[{ required: true, message: 'Please select a type' }]}>
                             <Select size="large" placeholder="Select type" className="w-full">
                                 <Select.Option value="Salary Slip">Salary Slip</Select.Option>
                                 <Select.Option value="Experience Letter">Experience Letter</Select.Option>
                                 <Select.Option value="Relieving Letter">Relieving Letter</Select.Option>
                                 <Select.Option value="NDA">NDA</Select.Option>
                                 <Select.Option value="Bonafide Certificate">Bonafide Certificate</Select.Option>
                                 <Select.Option value="Other">Other</Select.Option>
                             </Select>
                        </Form.Item>
                        <Form.Item name="comment" label="Comments (Optional)">
                            <TextArea rows={4} className="resize-none" placeholder="Add any specific details (e.g., month/year for salary slips)..." />
                        </Form.Item>
                        <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 mt-6">
                            <Button size="large" onClick={() => setIsRequestModalOpen(false)} className="rounded-lg">Cancel</Button>
                            <Button type="primary" size="large" htmlType="submit" loading={submitting} className="rounded-lg bg-blue-600">Submit Request</Button>
                        </div>
                    </Form>
                </Modal>
            </div>
        </div>
    )
}
