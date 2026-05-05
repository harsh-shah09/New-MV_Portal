"use client"
import Link from "next/link"

import { useState, useEffect, useRef } from "react"
import { useQuery } from "@tanstack/react-query"
import { Select, Button, Spin, message, Card, Tabs, Empty, Input, Table, Tag, Modal, Upload, Form } from "antd"
import { Download, FileText, User, Search, Printer, FileCheck, UploadCloud, RefreshCw, Maximize2, Minimize2, X, Settings2, Edit3, Check } from "lucide-react"
import { UploadOutlined } from '@ant-design/icons'
import { generateNDAPDF } from "./actions"
import { RoleGuard } from "@/components/role-guard"
import { PageHeader } from "@/components/page-header"

// Keys that are always auto-filled from employee data — never shown as manual inputs
const AUTO_REPLACED_KEYS = new Set([
    'FirstName', 'LastName', 'Employee_Name__c', 'Company_Name', 'Name',
    'Employee_Role__c', 'Department__c', 'employee_Id', 'EmployeeId',
    'Joining_Date__c', 'joining_date', 'Salary_CTC__c',
    'Seperation_Date__c', 'Employee_Title__c', 'Employee_ID__c',
     'Email', 'Phone', 'Employee_Address','salary_per_month','CTC', 'Date','Employment_Duration__c' ,'Enrollment_Number__c','Technology__c'
]);

/** Extract all {{KEY}} placeholders from an HTML template string */
function extractTemplateKeys(html: string): string[] {
    const matches = [...html.matchAll(/\{\{([^}]+)\}\}/g)];
    return [...new Set(matches.map(m => m[1].trim()))];
}

/** Make a human-readable label from a key like "Register_Number" → "Register_Number" */
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
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isControlsOpen, setIsControlsOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

    // Fetch Employees
    const { data: employees, isLoading: loadingEmployees } = useQuery({
        queryKey: ['employees'],
        queryFn: async () => {
            const res = await fetch('/api/employees');
            if (!res.ok) throw new Error("Failed to fetch employees");
            return res.json();
        }
    })

    const { data: employeeDetails } = useQuery({
        queryKey: ['employeeDetails', selectedEmpId],
        queryFn: async () => {
            if (!selectedEmpId) return null;
            const res = await fetch(`/api/employees/${selectedEmpId}`);
            if (!res.ok) throw new Error("Failed to fetch employee details");
            return res.json();
        },
        enabled: !!selectedEmpId,
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
                if (k === 'Model Number' && employeeDetails?.assetHistory?.length > 0) {
                    let activeAsset;
                    if (selectedAssetId) {
                        activeAsset = employeeDetails.assetHistory.find((a:any) => a.Id === selectedAssetId);
                    } else {
                        activeAsset = employeeDetails.assetHistory.find((a:any) => !a.AMS_Unassigned_Date__c) || employeeDetails.assetHistory[0];
                    }
                    next[k] = activeAsset?.AMS_Asset__r?.AMS_Asset_Serial_Number__c || '';
                } else if (!(k in next) || !next[k]) {
                    // Default Date to today, everything else to empty string
                    if (k === 'Date') {
                        next[k] = new Date().toISOString().split('T')[0];
                    } else {
                        next[k] = '';
                    }
                }
            });
            return next;
        });
    }, [templateContent, employeeDetails, selectedAssetId])
    function formatToDDMMYYYY(dateInput: any) {
        const d = new Date(dateInput);
        if (isNaN(d.getTime())) return ''; // handle invalid date
      
        return String(d.getDate()).padStart(2, '0') + '/' +
               String(d.getMonth() + 1).padStart(2, '0') + '/' +
               d.getFullYear();
      }
      
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
            replace('Register_Number', manualValues.Register_Number)
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
            replace('Joining_Date__c', formatToDDMMYYYY(emp.Joining_Date__c));
            replace('joining_date', formatToDDMMYYYY(emp.Joining_Date__c));
            replace('salary_per_month', emp.Salary_CTC__c);
            replace('CTC', emp.Salary_CTC__c);
            replace(
            'Date',
            manualValues.Date
                ? formatToDDMMYYYY(manualValues.Date)
                : formatToDDMMYYYY(new Date())
            );
            replace('Seperation_Date__c', formatToDDMMYYYY(emp.Seperation_Date__c || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })));
            replace('Employee_Title__c' , emp.Title__c + ' ' + emp.Role__c);
            replace('Employee_ID__c' , emp.Name);
            replace('Email' , emp.Company_Email__c);
            replace('Phone' , emp.Employee_Phone__c);
            replace('Employment_Duration__c' , formatToDDMMYYYY(emp.Joining_Date__c) + ' - ' + formatToDDMMYYYY(emp.Seperation_Date__c))
            replace('Enrollment_Number__c' , emp.Enrollment_Number__c);
            replace('Technology__c' , emp.Technology__c)
            // Manual Fields
            Object.keys(manualValues).forEach(key => {
                replace(key, manualValues[key]);
            });


            // Address handling (Salesforce Composite Field)
            replace('Employee_Address', address.street + ', ' + address.city + ', ' + address.state + ' - ' + address.postalCode + ', ' + address.country);

            // Gender Pronouns
            const gender = emp.Gender__c?.toLowerCase() || '';
            const heShe = gender === 'male' ? 'He' : gender === 'female' ? 'She' : 'He/she';
            const heSheLower = gender === 'male' ? 'he' : gender === 'female' ? 'she' : 'he/she';
            const hisHer = gender === 'male' ? 'His' : gender === 'female' ? 'Her' : 'His/her';
            const hisHerLower = gender === 'male' ? 'his' : gender === 'female' ? 'her' : 'his/her';
            const himHer = gender === 'male' ? 'Him' : gender === 'female' ? 'Her' : 'Him/her';
            const himHerLower = gender === 'male' ? 'him' : gender === 'female' ? 'her' : 'him/her';
            const himselfHerselfLower = gender === 'male' ? 'himself' : gender === 'female' ? 'herself' : 'himself/herself';
            const sirMadam = gender === 'male' ? 'Sir' : gender === 'female' ? 'Madam' : 'Sir/Madam';
            html = html.replace(/\bHe\/she\b/g, heShe)
                       .replace(/\bhe\/she\b/g, heSheLower)
                       .replace(/\bHe \/ she\b/g, heShe)
                       .replace(/\bhe \/ she\b/g, heSheLower)
                       .replace(/\bHe\/She\b/g, heShe)
                       .replace(/\bHe\/She\b/g, heSheLower)
                       .replace(/\bHis\/her\b/g, hisHer)
                       .replace(/\bhis\/her\b/g, hisHerLower)
                       .replace(/\bHis\/Her\b/g, hisHer)
                       .replace(/\bSir\/Madam\b/g, sirMadam)   
                       .replace(/\bhis\/her\b/g, hisHerLower)
                       .replace(/\bHim\/her\b/g, himHer)
                       .replace(/\bhim\/her\b/g, himHerLower)
                       .replace(/\bhimself\/herself\b/g, himselfHerselfLower);

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
            const previewEl = document.getElementById(elementId);
            const contentToGenerate = previewEl?.innerHTML || previewContent;
            if (!contentToGenerate) {
                message.error("No content to generate");
                return;
            }
            setLoadingTemplate(true);

            const base64Pdf = await generateNDAPDF(contentToGenerate);
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
            setSelectedEmpId(null)
            setSelectedPartitionKey(null);
            setSelectedTemplateFile(null);
            setDynamicManualKeys([])
            setLoadingTemplate(false);
            setIsFullscreen(false);
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
                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 lg:gap-6 flex-1 relative overflow-hidden lg:overflow-visible">

                                        {/* Mobile Toggle Button */}
                                        <div className="lg:hidden mb-2 rounded-2xl bg-white border border-slate-200 p-4 shadow-sm flex items-center justify-between z-[50]">
                                            <div>
                                                <h3 className="font-bold text-slate-800 flex items-center gap-2"><Settings2 className="w-4 h-4 text-blue-500" /> Document Settings</h3>
                                                <p className="text-xs text-slate-500 mt-1">Select employee & template to begin</p>
                                            </div>
                                            <Button type="primary" size="large" className="rounded-xl shadow-lg shadow-blue-500/30" onClick={() => setIsControlsOpen(true)}>Configure</Button>
                                        </div>

                                        {/* Mobile Drawer Backdrop */}
                                        {isControlsOpen && (
                                            <div 
                                                className="fixed inset-0 bg-black/60 z-[110] lg:hidden animate-in fade-in" 
                                                onClick={() => setIsControlsOpen(false)}
                                            />
                                        )}

                                        {/* Left Sidebar: Controls (Becomes Mobile Drawer) */}
                                        <div className={`fixed inset-y-0 right-0 z-[120] w-[340px] max-w-[90vw] bg-slate-50 shadow-2xl transform transition-transform duration-300 ease-in-out ${isControlsOpen ? 'translate-x-0' : 'translate-x-full'} lg:static lg:translate-x-0 lg:z-auto lg:w-full lg:bg-transparent lg:shadow-none lg:col-span-4 flex flex-col`}>
                                            
                                            {/* Mobile Drawer Header */}
                                            <div className="lg:hidden flex shrink-0 items-center justify-between p-4 bg-white border-b border-slate-200">
                                                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><Settings2 className="w-5 h-5 text-blue-500" /> Options</h3>
                                                <button onClick={() => setIsControlsOpen(false)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors">
                                                    <X className="w-5 h-5 text-slate-600" />
                                                </button>
                                            </div>

                                            {/* Scrollable Constraints */}
                                            <div className="p-4 lg:p-0 flex-1 overflow-y-auto lg:h-fit lg:sticky lg:top-6 lg:max-h-[75vh] space-y-4 pb-24 lg:pb-0">

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
                                                        value={selectedEmpId}
                                                        placeholder="Search employee..."
                                                        onChange={(value: any) => {
                                                            setSelectedEmpId(value);
                                                            setSelectedAssetId(null);
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
                                                                <p className="text-xs text-muted-foreground truncate mb-2">{selectedEmployee.Company_Email__c}</p>

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
                                                                                {selectedEmployee.Employee_Id__c || '-'}
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

                                            {/* Asset Selector */}
                                            {selectedTemplateFile === 'Asset-Management-Letter.html' && employeeDetails?.assetHistory?.length > 0 && (
                                                <div className="bg-card rounded-2xl shadow-sm border border-border p-6 transition-all hover:shadow-md animate-in fade-in slide-in-from-top-2">
                                                    <h2 className="text-lg font-bold text-card-foreground mb-4 flex items-center gap-2">
                                                        <Printer className="w-5 h-5 text-blue-500" /> Select Asset
                                                    </h2>
                                                    <p className="text-xs text-muted-foreground mb-4">
                                                        {employeeDetails.assetHistory.length > 1 
                                                            ? "Multiple assets found for this employee. Select which asset this document applies to." 
                                                            : "One active asset found. Verify the asset below."}
                                                    </p>
                                                    <Select
                                                        className="w-full"
                                                        placeholder="Choose an asset..."
                                                        value={selectedAssetId || (employeeDetails.assetHistory.find((a:any) => !a.AMS_Unassigned_Date__c) || employeeDetails.assetHistory[0])?.Id}
                                                        onChange={setSelectedAssetId}
                                                        options={employeeDetails.assetHistory.map((a: any) => ({
                                                            value: a.Id,
                                                            label: `${a.AMS_Asset__r?.AMS_Product__r?.Name || 'Unknown Product'} - ${a.AMS_Asset__r?.AMS_Asset_Serial_Number__c || 'No Serial'}`
                                                        }))}
                                                    />
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
                                            <div className="sticky bottom-0 bg-slate-50 p-4 lg:p-0 border-t border-slate-200 lg:border-transparent lg:static mt-auto lg:mt-0 shadow-[0_-10px_10px_-10px_rgba(0,0,0,0.1)] lg:shadow-none">
                                                <Button
                                                    type="primary"
                                                    size="large"
                                                    icon={<Download className="w-4 h-4" />}
                                                    className="w-full h-12 rounded-xl text-base font-semibold shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transition-all active:scale-[0.98]"
                                                    disabled={!previewContent}
                                                    onClick={handleDownload}
                                                    loading={loadingTemplate}
                                                >
                                                    {loadingTemplate ? 'Loading...' : 'Download PDF'}
                                                </Button>
                                            </div>

                                            </div>
                                        </div>

                                        {/* Right Main: Preview */}
                                        <div className={`${isFullscreen ? 'fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm p-4 md:p-8 flex flex-col animate-in fade-in' : 'lg:max-h-[75vh] lg:col-span-8 flex flex-col lg:sticky lg:top-6 mt-4 lg:mt-0'}`}>
                                            <div className={`bg-muted/30 rounded-2xl flex-1 overflow-auto shadow-inner border border-border relative group ${isFullscreen ? 'p-4 md:p-8 pb-32 max-w-5xl mx-auto w-full' : 'p-4 lg:p-8 min-h-[500px] lg:min-h-0'}`}>
                                                {/* Fullscreen Toggle */}
                                                <div className="absolute top-4 right-4 z-10 flex gap-2">
                                                    <button
                                                        onClick={() => {
                                                            if (isEditing) {
                                                                const el = document.getElementById('nda-preview-content');
                                                                if (el && el.innerHTML !== previewContent) {
                                                                    setPreviewContent(el.innerHTML);
                                                                }
                                                            }
                                                            setIsEditing(!isEditing);
                                                        }}
                                                        className="p-2.5 bg-white/80 backdrop-blur-md rounded-xl shadow-lg border border-slate-200 hover:bg-slate-50 transition-all text-slate-600 hover:text-blue-600 hover:scale-105"
                                                        title={isEditing ? "Save Edits" : "Edit Document"}
                                                    >
                                                        {isEditing ? <Check className="w-5 h-5 text-green-600" /> : <Edit3 className="w-5 h-5" />}
                                                    </button>
                                                    <button
                                                        onClick={() => setIsFullscreen(!isFullscreen)}
                                                        className="p-2.5 bg-white/80 backdrop-blur-md rounded-xl shadow-lg border border-slate-200 hover:bg-slate-50 transition-all text-slate-600 hover:text-blue-600 hover:scale-105"
                                                        title={isFullscreen ? "Exit Full Screen" : "View Full Screen"}
                                                    >
                                                        {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                                                    </button>
                                                    <button
                                                        onClick={handleDownload}
                                                        className="p-2.5 bg-white/80 backdrop-blur-md rounded-xl shadow-lg border border-slate-200 hover:bg-slate-50 transition-all text-slate-600 hover:text-blue-600 hover:scale-105"
                                                        title="Download NDA"
                                                    >
                                                        {loadingTemplate ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                                                    </button>
                                                </div>

                                                {previewContent ? (
                                                    <div className={`bg-white shadow-2xl animate-in zoom-in-95 duration-500 origin-top flex flex-col mx-auto transition-transform ${isFullscreen ? 'w-full' : 'w-full md:min-w-[210mm] lg:min-w-0 max-w-full md:max-w-[210mm]'}`}>
                                                        {/* Print Header/Toolbar could go here */}
                                                        <div id="nda-preview-content"
                                                            contentEditable={isEditing}
                                                            suppressContentEditableWarning={true}
                                                            className={`text-slate-900 text-sm md:text-base leading-relaxed flex-1 font-serif overflow-x-auto overflow-y-hidden ${isEditing ? 'ring-2 ring-blue-500 outline-none p-4' : ''}`}
                                                            dangerouslySetInnerHTML={{ __html: previewContent }}
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-60">
                                                        <FileText className="w-24 h-24 mb-4 stroke-1" />
                                                        <p className="text-lg font-medium text-center px-4">Select an employee & template to preview</p>
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {/* Download Button visible dynamically in Full Screen */}
                                            {/* {isFullscreen && (
                                                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 shadow-2xl rounded-2xl z-[110] animate-in slide-in-from-bottom-8">
                                                    <Button
                                                        type="primary"
                                                        size="large"
                                                        icon={<Download className="w-5 h-5" />}
                                                        className="h-14 px-8 rounded-xl text-lg font-semibold shadow-xl shadow-blue-500/30 hover:shadow-blue-500/50 transition-all active:scale-[0.98]"
                                                        disabled={!previewContent}
                                                        onClick={handleDownload}
                                                        loading={loadingTemplate}
                                                    >
                                                        {loadingTemplate ? 'Generating PDF...' : 'Download PDF'}
                                                    </Button>
                                                </div>
                                            )} */}
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


