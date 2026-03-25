"use client"
import Link from "next/link"

import { useState, useEffect, useRef } from "react"
import { useQuery } from "@tanstack/react-query"
import { Select, Button, Spin, message, Card, Tabs, Empty, Input, Table, Tag, Modal, Upload, Form } from "antd"
import { Download, FileText, User, Search, Printer, FileCheck, UploadCloud, RefreshCw } from "lucide-react"
import { UploadOutlined } from '@ant-design/icons'
import { generateNDAPDF } from "./actions"
import { RoleGuard } from "@/components/role-guard"
import { PageHeader } from "@/components/page-header"

// Keys that are always auto-filled from employee data — never shown as manual inputs
const AUTO_REPLACED_KEYS = new Set([
    'FirstName', 'LastName', 'Employee_Name__c', 'Company_Name', 'Name',
    'Employee_Role__c', 'Department__c', 'employee_Id', 'EmployeeId',
    'Joining_Date__c', 'joining_date', 'Base_Salary__c', 'Salary_CTC__c',
    'Seperation_Date__c', 'Employee_Title__c', 'Employee_ID__c',
    'Employment_Duration__c', 'Email', 'Phone', 'Employee_Address',
    'Father_Name',
]);

/** Extract all {{KEY}} placeholders from an HTML template string */
function extractTemplateKeys(html: string): string[] {
    const matches = [...html.matchAll(/\{\{([^}]+)\}\}/g)];
    return [...new Set(matches.map(m => m[1].trim()))];
}

/** Make a human-readable label from a key like "Register_No" → "Register No" */
function toLabel(key: string): string {
    return key.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2');
}

export default function NDAPage() {
    const [selectedEmpId, setSelectedEmpId] = useState<string | null>(null)
    const [selectedPartitionKey, setSelectedPartitionKey] = useState<string | null>(null)
    const [selectedTemplateFile, setSelectedTemplateFile] = useState<string | null>(null) // Filename
    const [templateContent, setTemplateContent] = useState<string>("")
    const [previewContent, setPreviewContent] = useState<string>("")
    const [loadingTemplate, setLoadingTemplate] = useState(false)

    // Manual Fields State — keys populated dynamically from template
    const [manualValues, setManualValues] = useState<Record<string, string>>({});
    const [dynamicManualKeys, setDynamicManualKeys] = useState<string[]>([]);
    // Pending Requests State
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<any>(null);
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);

    // Fetch Employees
    const { data: employees, isLoading: loadingEmployees } = useQuery({
        queryKey: ['employees'],
        queryFn: async () => {
            const res = await fetch('/api/employees');
            if (!res.ok) throw new Error("Failed to fetch employees");
            return res.json();
        }
    })

    // Fetch Templates List
    const { data: templates, isLoading: loadingTemplates } = useQuery({
        queryKey: ['templates'],
        queryFn: async () => {
            const res = await fetch('/api/templates');
            if (!res.ok) throw new Error("Failed to fetch templates");
            return res.json();
        }
    })

    // Fetch Pending Documents
    const { data: pendingDocs, isLoading: loadingPending, refetch: refetchPending } = useQuery({
        queryKey: ['pendingDocuments'],
        queryFn: async () => {
            const res = await fetch('/api/documents/pending');
            if (!res.ok) throw new Error("Failed to fetch pending documents");
            return res.json();
        }
    })

    // Fetch Template Content
    useEffect(() => {
        const fetchTemplate = async () => {
            if (!selectedTemplateFile) return;
            setLoadingTemplate(true)
            try {
                const res = await fetch(`/templates/${selectedTemplateFile}`);
                const text = await res.text();
                setTemplateContent(text);
            } catch (e) {
                message.error("Failed to load template");
            } finally {
                setLoadingTemplate(false)
            }
        }
        fetchTemplate();
    }, [selectedTemplateFile])

    // Derive dynamic manual fields whenever template changes
    useEffect(() => {
        if (!templateContent) {
            setDynamicManualKeys([]);
            return;
        }
        const allKeys = extractTemplateKeys(templateContent);
        const manualKeys = allKeys.filter(k => !AUTO_REPLACED_KEYS.has(k));
        setDynamicManualKeys(manualKeys);
        // Seed missing keys with smart defaults; preserve existing user input
        setManualValues(prev => {
            const next = { ...prev };
            manualKeys.forEach(k => {
                if (!(k in next)) {
                    // Default Date to today, everything else to empty string
                    next[k] = k === 'Date'
                        ? new Date().toISOString().split('T')[0]
                        : '';
                }
            });
            return next;
        });
    }, [templateContent])

    // Handle Employee Selection & Preview Generation
    useEffect(() => {
        if (!selectedEmpId || !employees || !templateContent) {
            setPreviewContent("");
            return;
        }

        const emp = employees.find((e: any) => e.Id === selectedEmpId);
        if (emp) {
            // store partition key / Employee Id for display and templates
            const pk = emp.Employee_Id || emp.PartitionKey || emp.EmployeeId || emp.Id || null;
            setSelectedPartitionKey(pk);
            const contact = emp || {};
            const address = JSON.parse(emp.Employee_Current_Address__c) || {};

            let html = templateContent;

            // Helper to safe replace
            const replace = (key: string, value: any) => {
                const regex = new RegExp(`{{${key}}}`, 'g');
                html = html.replace(regex, value || `<span style="color:red; background:#fee; padding: 0 4px; border-radius: 4px;">[${key} Missing]</span>`);
            }
            replace('Register_No', manualValues.Register_No)
            replace('FirstName', contact.Employee_Name__c?.split(' ')[0]);
            replace('LastName', contact.Employee_Name__c?.split(' ').slice(1).join(' '));
            replace('Employee_Name__c' , emp.Employee_Name__c);
            replace('Company_Name' , 'MV Clouds')
            replace('Name', contact.Employee_Name__c)
            replace('Employee_Role__c', contact.Role__c);
            replace('Department__c', contact.Department__c);
            // expose partition / employee id into templates
            replace('employee_Id', emp.Name || emp.Id);
            replace('EmployeeId', emp.Employee_Id || emp.PartitionKey || emp.Id);
            replace('Joining_Date__c', emp.Joining_Date__c);
            replace('joining_date', emp.Joining_Date__c);
            replace('Base_Salary__c', emp.Base_Salary__c);
            replace('Salary_CTC__c', emp.Salary_CTC__c);
            replace('Date', manualValues.Date || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }));
            replace('Seperation_Date__c', emp.Seperation_Date__c || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }));
            replace('Employee_Title__c' , emp.Title__c + ' ' + emp.Role__c);
            replace('Employee_ID__c' , emp.Name);
            replace('Employment_Duration__c' , ( emp.Seperation_Date__c - emp.Joining_Date__c ) / 365);
            replace('Email' , emp.Employee_Email__c);
            replace('Phone' , emp.Employee_Phone__c);
            
            // Manual Fields
            Object.keys(manualValues).forEach(key => {
                replace(key, manualValues[key]);
            });


            // Address handling (Salesforce Composite Field)
            replace('Employee_Address', address.street + ', ' + address.city + ', ' + address.state + ' - ' + address.postalCode + ', ' + address.country);

            setPreviewContent(html);
        }
    }, [selectedEmpId, employees, templateContent, manualValues])

    const handleDownload = () => {
        if (!selectedEmpId) return;

        // Validate: warn for any dynamic manual field that is empty
        const missingFields = dynamicManualKeys.filter(k => !manualValues[k]?.trim());
        if (missingFields.length > 0) {
            missingFields.forEach(k => {
                message.warning({
                    content: `"${toLabel(k)}" is empty. Fill it in for best results.`,
                    duration: 3,
                    style: { marginTop: '10px' }
                });
            });
        }

        const emp = employees.find((e: any) => e.Id === selectedEmpId);
        const name = emp ? `${emp.Employee_Name__c || 'Employee'}`.replace(/ /g, '_') : "Employee";
        const tmplName = selectedTemplateFile?.replace('.html', '') || 'Doc';
        generatePDF('nda-preview-content', `${tmplName}_${name}.pdf`);
    }

    const generatePDF = async (elementId: string, fileName: string) => {
        try {
            if (!previewContent) {
                message.error("No content to generate");
                return;
            }
            setLoadingTemplate(true);

            const base64Pdf = await generateNDAPDF(previewContent);
            const binaryString = window.atob(base64Pdf as any);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            const blob = new Blob([bytes], { type: 'application/pdf' });

            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            message.success("PDF generated successfully");
        } catch (err) {
            console.error('PDF Generation Error', err);
            message.error('Failed to generate PDF');
        } finally {
            setLoadingTemplate(false);
        }
    }

    const handleUploadClick = (record: any) => {
        console.log(record)
        setSelectedRequest(record);
        setIsUploadModalOpen(true);
    }

    const handleUploadSubmit = async () => {
        if (!uploadFile || !selectedRequest) return;
        setUploading(true);
        const formData = new FormData();
        formData.append('file', uploadFile);
        formData.append('documentId', selectedRequest.Id);

        try {
            const res = await fetch('/api/documents/upload', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (data.success) {
                message.success("Document uploaded successfully");
                setIsUploadModalOpen(false);
                setUploadFile(null);
                setSelectedRequest(null);
                refetchPending();
            } else {
                message.error(data.error || "Upload failed");
            }
        } catch (e) {
            message.error("Upload failed");
        } finally {
            setUploading(false);
        }
    }

    const requestColumns = [
        {
            title: 'Employee',
            dataIndex: ['Employee__r', 'Employee_Name__c'],
            key: 'empName',
            render: (text: string, record: any) => text || record.Employee__r?.Employee_Name__c
        },
        { title: 'Document Type', dataIndex: 'Document_Type__c', key: 'type' },
        { title: 'Status', dataIndex: 'Status__c', key: 'status', render: (text: string) => <Tag color={text === 'Pending' ? 'orange' : 'green'}>{text}</Tag> },
        { title: 'Date Requested', dataIndex: 'CreatedDate', key: 'date', render: (d: string) => new Date(d).toLocaleDateString() },
        {
            title: 'Action',
            key: 'action',
            render: (_: any, record: any) => (
                <div className="flex gap-2">
                    <Link href={`/employees/${record.Employee__c}`} target="_blank">
                        <Button size="small" icon={<User className="w-3 h-3" />}>View</Button>
                    </Link>
                    <Button size="small" type="primary" icon={<UploadOutlined />} onClick={() => handleUploadClick(record)}>
                        Upload
                    </Button>
                </div>
            )
        }
    ];


    const selectedEmployee = employees?.find((e: any) => e.Id === selectedEmpId);
    const selectedTemplateName = templates?.find((t: any) => t.id === selectedTemplateFile)?.name || 'Select Template';

    return (
        <RoleGuard>
            <div className="min-h-screen bg-background p-2 md:p-4 lg:p-6 flex flex-col">
                <div className="w-full mx-auto flex-1 flex flex-col bg-white p-3 rounded-xl">

                    {/* Header */}
                    <PageHeader 
                        title="Document Manager"
                        subtitle="Generate, preview, and download agreements and letters."
                        className="mb-0"
                    />

                    <Tabs
                        defaultActiveKey="1"
                        items={[
                            {
                                key: '1',
                                label: (
                                    <span className="">
                                        {/* <FileText className="w-4 h-4" /> Generator */}
                                    </span>
                                ),
                                children: (
                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 flex-1">

                                        {/* Left Sidebar: Controls */}
                                        <div className="lg:col-span-4 space-y-4 h-fit sticky top-6">

                                            {/* Employee Selector Card */}
                                            <div className="bg-card rounded-2xl shadow-sm border border-border p-6 transition-all hover:shadow-md">
                                                <h2 className="text-lg font-bold text-card-foreground mb-4 flex items-center gap-2">
                                                    <User className="w-5 h-5 text-primary" /> Select Employee
                                                </h2>

                                                {loadingEmployees ? (
                                                    <div className="flex justify-center py-4"><Spin /></div>
                                                ) : (
                                                    <Select
                                                        className="w-full"
                                                        showSearch
                                                        allowClear
                                                        placeholder="Search employee..."
                                                        optionFilterProp="children"
                                                        onChange={(value: any) => {
                                                            setSelectedEmpId(value);
                                                            if (!value) {
                                                                setSelectedPartitionKey(null);
                                                                return;
                                                            }
                                                            const emp = employees?.find((e: any) => e.Id === value);
                                                            const pk = emp?.PartitionKey || emp?.Employee_Id || emp?.EmployeeId || null;
                                                            setSelectedPartitionKey(pk);
                                                        }}
                                                        loading={loadingEmployees}
                                                        filterOption={(input, option: any) =>
                                                            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                                                        }
                                                        options={employees?.map((emp: any) => ({
                                                            value: emp.Id,
                                                            label: `${emp.Employee_Name__c} (${emp.Role__c || 'No Role'})`
                                                        }))}
                                                    />
                                                )}

                                                {selectedEmployee && (
                                                    <div className="mt-6 p-4 bg-primary/5 rounded-xl border border-primary/20 shadow-sm animate-in fade-in slide-in-from-top-2">
                                                        <div className="flex items-start gap-4">
                                                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg shrink-0 border-2 border-background shadow-sm">
                                                                {selectedEmployee.Employee_Name__c?.[0]}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <h3 className="font-bold text-card-foreground truncate text-base">{selectedEmployee.Employee_Name__c}</h3>
                                                                <p className="text-xs text-muted-foreground truncate mb-2">{selectedEmployee.Employee_Email__c}</p>

                                                                <div className="flex flex-col gap-1.5 mt-2 pt-2 border-t border-primary/20">
                                                                    <div className="flex justify-between items-center text-xs group">
                                                                        <span className="text-muted-foreground font-medium">Role</span>
                                                                        <span className="font-semibold text-card-foreground bg-background px-2 py-0.5 rounded border border-border group-hover:border-primary/30 transition-colors">
                                                                            {selectedEmployee.Role__c || '-'}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex justify-between items-center text-xs group">
                                                                        <span className="text-muted-foreground font-medium">Department</span>
                                                                        <span className="font-semibold text-card-foreground bg-background px-2 py-0.5 rounded border border-border group-hover:border-primary/30 transition-colors">
                                                                            {selectedEmployee.Department__c || '-'}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex justify-between items-center text-xs group">
                                                                        <span className="text-muted-foreground font-medium">Employee Id</span>
                                                                        <span className="font-semibold text-card-foreground bg-background px-2 py-0.5 rounded border border-border group-hover:border-primary/30 transition-colors">
                                                                            {selectedEmployee.Name || '-'}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Manual Inputs Card — dynamic per template */}
                                            {dynamicManualKeys.length > 0 && (
                                                <div className="bg-card rounded-2xl shadow-sm border border-border p-6 transition-all hover:shadow-md">
                                                    <h2 className="text-lg font-bold text-card-foreground mb-1 flex items-center gap-2">
                                                        <Printer className="w-5 h-5 text-green-500" /> Manual Fields
                                                    </h2>
                                                    <p className="text-xs text-muted-foreground mb-4">
                                                        {dynamicManualKeys.length} field{dynamicManualKeys.length !== 1 ? 's' : ''} required by this template
                                                    </p>
                                                    <div className="space-y-3">
                                                        {dynamicManualKeys.map(key => (
                                                            <div key={key}>
                                                                <label className="text-xs font-semibold text-muted-foreground">
                                                                    {toLabel(key)}
                                                                </label>
                                                                <Input
                                                                    id={`manual-${key}`}
                                                                    type={key === 'Date' ? 'date' : 'text'}
                                                                    value={manualValues[key] ?? ''}
                                                                    onChange={e => setManualValues(prev => ({ ...prev, [key]: e.target.value }))}
                                                                    placeholder={toLabel(key)}
                                                                    status={!manualValues[key]?.trim() ? 'warning' : ''}
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Template Selector */}
                                            <div className="bg-card rounded-2xl shadow-sm border border-border p-6 transition-all hover:shadow-md">
                                                <h2 className="text-lg font-bold text-card-foreground mb-4 flex items-center gap-2">
                                                    <FileText className="w-5 h-5 text-purple-500" /> Select Template
                                                </h2>

                                                {loadingTemplates ? (
                                                    <div className="flex justify-center py-4"><Spin /></div>
                                                ) : (
                                                    <div className="space-y-3">
                                                        <Select
                                                            className="w-full"
                                                            placeholder="Choose a template..."
                                                            value={selectedTemplateFile}
                                                            onChange={setSelectedTemplateFile}
                                                            options={templates?.map((t: any) => ({
                                                                value: t.id,
                                                                label: t.name
                                                            }))}
                                                        />

                                                    {/* {selectedTemplateFile && (
                                                            <div className="p-3 border rounded-xl bg-purple-50/30 flex items-center gap-3 border-purple-200 animate-in fade-in slide-in-from-left-2">
                                                                <FileCheck className="w-5 h-5 text-purple-600" />
                                                                <div className="flex-1">
                                                                    <p className="text-sm font-semibold text-purple-900">{selectedTemplateName}</p>
                                                                    <p className="text-xs text-purple-500">HTML Template</p>
                                                                </div>
                                                            </div>
                                                        )} */}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Actions */}
                                            <Button
                                                type="primary"
                                                size="large"
                                                icon={<Download className="w-4 h-4" />}
                                                className="w-full h-12 rounded-xl text-base font-semibold shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transition-all active:scale-[0.98]"
                                                disabled={!previewContent}
                                                onClick={handleDownload}
                                                loading={loadingTemplate}
                                            >
                                                {loadingTemplate ? 'Loading Template...' : 'Download PDF'}
                                            </Button>

                                        </div>

                                        {/* Right Main: Preview */}
                                        <div className="lg:col-span-8 flex flex-col h-[600px] lg:h-[calc(100vh-140px)] sticky top-6">
                                            <div className="bg-muted/30 rounded-2xl p-4 lg:p-8 flex-1 overflow-auto shadow-inner border border-border relative group">
                                                {previewContent ? (
                                                    <div className="w-full min-w-[210mm] lg:min-w-0 max-w-[210mm] bg-white shadow-2xl animate-in zoom-in-95 duration-500 origin-top flex flex-col mx-auto transition-transform">
                                                        {/* Print Header/Toolbar could go here */}
                                                        <div id="nda-preview-content"
                                                            contentEditable
                                                            className="text-slate-900 text-sm md:text-base leading-relaxed flex-1 font-serif"
                                                            dangerouslySetInnerHTML={{ __html: previewContent }}
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-60">
                                                        <FileText className="w-24 h-24 mb-4 stroke-1" />
                                                        <p className="text-lg font-medium">Select an employee & template to preview</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )
                            },
                            // {
                            //     key: '2',
                            //     label: (
                            //         <span className="flex items-center gap-2">
                            //             <UploadCloud className="w-4 h-4" /> Requests & Uploads
                            //         </span>
                            //     ),
                            //     children: (
                            //         <div className="space-y-4">
                            //             {/* Mobile Header & Actions */}
                            //             <div className="md:hidden flex justify-between items-center pt-2">
                            //                  <span className="text-sm font-semibold text-muted-foreground">Manage Documents</span>
                            //                  <Button size="small" icon={<RefreshCw className="w-3 h-3" />} onClick={() => refetchPending()}>Refresh</Button>
                            //             </div>

                            //             <Tabs 
                            //                 type="card"
                            //                 tabBarExtraContent={
                            //                    <div className="hidden md:flex items-center">
                            //                      <Button icon={<RefreshCw className="w-4 h-4" />} onClick={() => refetchPending()}>
                            //                         Refresh Data
                            //                     </Button>
                            //                    </div>
                            //                 }
                            //                 items={[
                            //                     {
                            //                         key: 'pending',
                            //                         label: (
                            //                             <span className="flex items-center gap-2">
                            //                                 <RefreshCw className="w-3 h-3 animate-spin-slow" /> Pending Requests
                            //                                 <span className="bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded-full ml-1">
                            //                                     {(pendingDocs || []).filter((d: any) => d.Status__c === 'Pending').length}
                            //                                 </span>
                            //                             </span>
                            //                         ),
                            //                         children: (
                            //                             <Card className="shadow-sm border-border bg-card rounded-b-2xl rounded-tr-2xl border-t-0" bodyStyle={{ padding: 0 }}>
                            //                                 {/* Desktop Table */}
                            //                                 <div className="hidden md:block">
                            //                                     <Table 
                            //                                         dataSource={(pendingDocs || []).filter((d: any) => d.Status__c === 'Pending')} 
                            //                                         columns={requestColumns} 
                            //                                         loading={loadingPending}
                            //                                         rowKey="Id"
                            //                                         pagination={{ pageSize: 8 }}
                            //                                         locale={{ emptyText: <Empty description="No pending requests" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
                            //                                     />
                            //                                 </div>
                            //                                 {/* Mobile List */}
                            //                                 <div className="md:hidden p-4 space-y-4">
                            //                                     {(pendingDocs || []).filter((d: any) => d.Status__c === 'Pending').map((record: any) => (
                            //                                         <div key={record.Id} className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3 shadow-sm">
                            //                                             <div className="flex justify-between items-start">
                            //                                                 <div>
                            //                                                      <p className="font-semibold text-foreground">{record.Employee__r?.Name || 'Unknown Employee'}</p>
                            //                                                      <p className="text-xs text-muted-foreground">{new Date(record.CreatedDate).toLocaleDateString()}</p>
                            //                                                 </div>
                            //                                                 <Tag color="orange">Pending</Tag>
                            //                                             </div>
                            //                                             <div className="text-sm">
                            //                                                 <span className="text-muted-foreground">Type: </span>
                            //                                                 <span className="font-medium text-foreground">{record.Document_Type__c}</span>
                            //                                             </div>
                            //                                             <div className="flex gap-2 pt-2 border-t border-border">
                            //                                                 <Link href={`/employees/${record.Employee__c}`} target="_blank" className="flex-1">
                            //                                                     <Button block size="small" icon={<User className="w-3 h-3" />}>View</Button>
                            //                                                 </Link>
                            //                                                 <Button className="flex-1" size="small" type="primary" icon={<UploadOutlined />} onClick={() => handleUploadClick(record)}>
                            //                                                     Upload
                            //                                                 </Button>
                            //                                             </div>
                            //                                         </div>
                            //                                     ))}
                            //                                     {(pendingDocs || []).filter((d: any) => d.Status__c === 'Pending').length === 0 && (
                            //                                         <div className="py-12 flex flex-col items-center justify-center text-center opacity-80">
                            //                                             <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mb-4">
                            //                                                 <RefreshCw className="w-8 h-8 text-muted-foreground opacity-50" />
                            //                                             </div>
                            //                                             <p className="font-medium text-foreground">No pending requests</p>
                            //                                             <p className="text-sm text-muted-foreground mt-1">New document requests will appear here</p>
                            //                                         </div>
                            //                                     )}
                            //                                 </div>
                            //                             </Card>
                            //                         )
                            //                     },
                            //                     {
                            //                         key: 'uploaded',
                            //                         label: (
                            //                             <span className="flex items-center gap-2">
                            //                                 <FileCheck className="w-3 h-3 text-green-500" /> Uploaded Documents
                            //                                 <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full ml-1">
                            //                                     {(pendingDocs || []).filter((d: any) => d.Status__c === 'Uploaded').length}
                            //                                 </span>
                            //                             </span>
                            //                         ),
                            //                         children: (
                            //                             <Card className="shadow-sm border-border bg-card rounded-b-2xl rounded-tl-2xl border-t-0" bodyStyle={{ padding: 0 }}>
                            //                                 {/* Desktop Table */}
                            //                                 <div className="hidden md:block">
                            //                                     <Table 
                            //                                         dataSource={(pendingDocs || []).filter((d: any) => d.Status__c === 'Uploaded')} 
                            //                                         columns={[
                            //                                             {                                                                  title: 'Employee', 
                            //                                                 dataIndex: ['Employee__r', 'Employee_Name__c'], 
                            //                                                 key: 'empName',
                            //                                                 render: (text: string, record: any) => (
                            //                                                     <div className="flex items-center gap-2">
                            //                                                         <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                            //                                                             {(text || record.Employee__r?.Employee_Name__c)?.[0]}
                            //                                                         </div>
                            //                                                         <span className="font-medium">{text || record.Employee__r?.Employee_Name__c}</span>
                            //                                                     </div>
                            //                                                 )
                            //                                             },
                            //                                             { 
                            //                                                 title: 'Document Type', 
                            //                                                 dataIndex: 'Document_Type__c', 
                            //                                                 key: 'type',
                            //                                                 render: (text) => <span className="text-muted-foreground">{text}</span>
                            //                                             },
                            //                                             { 
                            //                                                 title: 'Uploaded Date', 
                            //                                                 dataIndex: 'CreatedDate', 
                            //                                                 key: 'date', 
                            //                                                 render: (d: string) => <span className="text-muted-foreground">{new Date(d).toLocaleDateString()}</span> 
                            //                                             },
                            //                                             {
                            //                                                 title: 'Action',
                            //                                                 key: 'action',
                            //                                                 render: (_: any, record: any) => (
                            //                                                     <Link href={record.File_URL__c || '#'} target="_blank">
                            //                                                         <Button size="small" type="default" icon={<FileText className="w-3 h-3" />}>
                            //                                                             View File
                            //                                                         </Button>
                            //                                                     </Link>
                            //                                                 )
                            //                                             }
                            //                                         ]} 
                            //                                         loading={loadingPending}
                            //                                         rowKey="Id"
                            //                                         locale={{ emptyText: <Empty description="No uploaded documents" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
                            //                                     />
                            //                                 </div>
                            //                                 {/* Mobile View */}
                            //                                 <div className="md:hidden p-4 space-y-4">
                            //                                     {(pendingDocs || []).filter((d: any) => d.Status__c === 'Uploaded').map((record: any) => (
                            //                                         <div key={record.Id} className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3 shadow-sm">
                            //                                             <div className="flex justify-between items-start">
                            //                                                 <div className="flex items-center gap-2">
                            //                                                     <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                            //                                                         {(record.Employee__r?.Employee_Name__c)?.[0]}
                            //                                                     </div>
                            //                                                     <div>
                            //                                                         <p className="font-semibold text-foreground">{record.Employee__r?.Employee_Name__c || 'Unknown'}</p>
                            //                                                         <p className="text-xs text-muted-foreground">{new Date(record.CreatedDate).toLocaleDateString()}</p>
                            //                                                     </div>
                            //                                                 </div>
                            //                                                 <Tag color="green">Uploaded</Tag>
                            //                                             </div>
                            //                                             <div className="text-sm border-t border-border pt-2 mt-1">
                            //                                                 <span className="text-muted-foreground text-xs uppercase tracking-wide">Document Type</span>
                            //                                                 <p className="font-medium text-foreground">{record.Document_Type__c}</p>
                            //                                             </div>
                            //                                             <div className="pt-2">
                            //                                                 <Link href={record.File_URL__c || '#'} target="_blank">
                            //                                                     <Button block icon={<FileText className="w-3 h-3" />}>
                            //                                                         View File
                            //                                                     </Button>
                            //                                                 </Link>
                            //                                             </div>
                            //                                         </div>
                            //                                     ))}
                            //                                     {(pendingDocs || []).filter((d: any) => d.Status__c === 'Uploaded').length === 0 && (
                            //                                          <div className="py-12 flex flex-col items-center justify-center text-center opacity-80">
                            //                                             <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mb-4">
                            //                                                 <FileCheck className="w-8 h-8 text-muted-foreground opacity-50" />
                            //                                             </div>
                            //                                             <p className="font-medium text-foreground">No uploaded documents</p>
                            //                                             <p className="text-sm text-muted-foreground mt-1">Completed uploads will appear here</p>
                            //                                         </div>
                            //                                     )}
                            //                                 </div>
                            //                             </Card>
                            //                         )
                            //                     }
                            //                 ]}
                            //             />
                            //         </div>
                            //     )
                            // }
                        ]}
                    />

                    <Modal
                        title="Upload Document"
                        open={isUploadModalOpen}
                        onCancel={() => setIsUploadModalOpen(false)}
                        onOk={handleUploadSubmit}
                        confirmLoading={uploading}
                    >
                        <div className="space-y-4 pt-4">
                            <div className="p-4 bg-slate-50 border rounded-lg">
                                <p className="text-sm font-semibold text-slate-700">Request: {selectedRequest?.Document_Type__c}</p>
                                <p className="text-xs text-slate-500">Employee: {selectedRequest?.Employee__r?.Employee_Name__c}</p>
                            </div>
                            <Upload.Dragger
                                beforeUpload={(file) => {
                                    setUploadFile(file);
                                    return false;
                                }}
                                fileList={uploadFile ? [{
                                    uid: '-1',
                                    name: uploadFile.name,
                                    status: 'done',
                                    originFileObj: uploadFile as any
                                }] : []}
                                onRemove={() => setUploadFile(null)}
                            >
                                <p className="ant-upload-drag-icon">
                                    <UploadCloud className="w-10 h-10 text-blue-500 mx-auto" />
                                </p>
                                <p className="ant-upload-text">Click or drag file to this area to upload</p>
                            </Upload.Dragger>
                        </div>
                    </Modal>

                </div>
            </div>
        </RoleGuard>
    )
}


