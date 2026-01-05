
"use client"
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Table, Tag, Modal, Input, Select, message, Tabs, Form, Typography } from 'antd';
import { Plus, FileText, Clock, FileCheck } from 'lucide-react';

const { Title, Text } = Typography;
const { TextArea } = Input;

export default function DocumentsPage() {
    const queryClient = useQueryClient();
    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
    const [form] = Form.useForm();
    const [submitting, setSubmitting] = useState(false);

    // Fetch My Documents
    const { data: documents, isLoading } = useQuery({
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

    const columns = [
        { 
            title: 'Document', 
            dataIndex: 'Name', 
            key: 'name',
            render: (text: string, record: any) => (
                <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-500" />
                    <span>{record.Document_Type__c || text}</span>
                </div>
            )
        },
        { 
            title: 'Status', 
            dataIndex: 'Status__c', 
            key: 'status', 
            render: (text: string) => {
                let color = 'default';
                if (text === 'Pending') color = 'orange';
                if (text === 'Uploaded') color = 'green';
                return <Tag color={color}>{text}</Tag>
            }
        },
        { 
            title: 'Requested Date', 
            dataIndex: 'CreatedDate', 
            key: 'date', 
            render: (d: string) => new Date(d).toLocaleDateString() 
        },
        {
            title: 'Action',
            key: 'action',
            render: (_: any, record: any) => (
                record.File_URL__c ? (
                    <Button type="link" href={record.File_URL__c} target="_blank" icon={<FileCheck className="w-4 h-4" />}>
                        View Document
                    </Button>
                ) : <span className="text-slate-400 text-xs">Waiting for HR</span>
            )
        }
    ];

    return (
        <div className="min-h-screen bg-slate-50 p-6 lg:p-10">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <Title level={2} className="!mb-0">My Documents</Title>
                        <Text type="secondary">Request and view your official documents</Text>
                    </div>
                     <Button type="primary" size="large" icon={<Plus className="w-4 h-4" />} onClick={() => setIsRequestModalOpen(true)}>
                        Request Document
                    </Button>
                </div>

                <Card className="shadow-sm border-slate-100 rounded-2xl">
                     <Table 
                        dataSource={documents} 
                        columns={columns} 
                        loading={isLoading} 
                        rowKey="Id"
                        locale={{
                            emptyText: (
                                <div className="flex flex-col items-center py-10">
                                    <FileText className="w-12 h-12 text-slate-300 mb-4" />
                                    <p className="text-slate-500">No documents requested yet.</p>
                                </div>
                            )
                        }}
                    />
                </Card>

                <Modal
                    title="Request a Document"
                    open={isRequestModalOpen}
                    onCancel={() => setIsRequestModalOpen(false)}
                    footer={null}
                >
                    <Form form={form} layout="vertical" onFinish={handleRequestSubmit} className="pt-4">
                        <Form.Item name="documentType" label="Document Type" rules={[{ required: true, message: 'Please select a type' }]}>
                             <Select placeholder="Select type">
                                 <Select.Option value="Salary Slip">Salary Slip</Select.Option>
                                 <Select.Option value="Experience Letter">Experience Letter</Select.Option>
                                 <Select.Option value="Relieving Letter">Relieving Letter</Select.Option>
                                 <Select.Option value="NDA">NDA</Select.Option>
                                 <Select.Option value="Bonafide Certificate">Bonafide Certificate</Select.Option>
                                 <Select.Option value="Other">Other</Select.Option>
                             </Select>
                        </Form.Item>
                        <Form.Item name="comment" label="Comments (Optional)">
                            <TextArea rows={3} placeholder="Any specific details? e.g. For which month?" />
                        </Form.Item>
                        <div className="flex justify-end gap-2 pt-4">
                            <Button onClick={() => setIsRequestModalOpen(false)}>Cancel</Button>
                            <Button type="primary" htmlType="submit" loading={submitting}>Submit Request</Button>
                        </div>
                    </Form>
                </Modal>
            </div>
        </div>
    )
}
