"use client"
import Link from "next/link"

import { useState, useEffect, useRef } from "react"
import { useQuery } from "@tanstack/react-query"
import { Select, Button, Spin, message, Card, Tabs, Empty, Input, Table, Tag, Modal, Upload, Form } from "antd"
import { Download, FileText, User, Search, Printer, FileCheck, UploadCloud, RefreshCw } from "lucide-react"
import { jsPDF } from "jspdf";
import html2canvas from 'html2canvas-pro'
import { UploadOutlined } from '@ant-design/icons'

export default function NDAPage() {
  const [selectedEmpId, setSelectedEmpId] = useState<string | null>(null)
    const [selectedPartitionKey, setSelectedPartitionKey] = useState<string | null>(null)
  const [selectedTemplateFile, setSelectedTemplateFile] = useState<string | null>(null) // Filename
  const [templateContent, setTemplateContent] = useState<string>("")
  const [previewContent, setPreviewContent] = useState<string>("")
  const [loadingTemplate, setLoadingTemplate] = useState(false)
  
  // Manual Fields State
  const [manualValues, setManualValues] = useState<any>({
      Register_No: '',
      Date: new Date().toISOString().split('T')[0]
  });
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

  // Set default template if available
  useEffect(() => {
    if (templates && templates.length > 0 && !selectedTemplateFile) {
        setSelectedTemplateFile(templates[0].id);
    }
  }, [templates, selectedTemplateFile]);

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
          const contact = emp.Contact__r || {};
          const address = contact.MailingAddress || {};
          
          let html = templateContent;
          
          // Helper to safe replace
          const replace = (key: string, value: any) => {
              const regex = new RegExp(`{{${key}}}`, 'g');
              html = html.replace(regex, value || `<span style="color:red; background:#fee; padding: 0 4px; border-radius: 4px;">[${key} Missing]</span>`);
          }
          replace('Register_No' , manualValues.Register_No)
          replace('FirstName', contact.FirstName);
          replace('LastName', contact.LastName);
          replace('Name' , contact.FirstName + " " + contact.LastName)
          replace('Employee_Role__c', contact.Employee_Role__c);
          replace('Department__c', contact.Department__c);
          // expose partition / employee id into templates
          replace('employee_Id', emp.Name || emp.Id);
          replace('EmployeeId', emp.Employee_Id || emp.PartitionKey || emp.Id);
          replace('Joining_Date__c', emp.Joining_Date__c);
          replace('joining_date', emp.Joining_Date__c);
          replace('Base_Salary__c', emp.Base_Salary__c);
          replace('Salary_CTC__c', emp.Salary_CTC__c);
          replace('Date', manualValues.Date || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }));
          
          // Manual Fields
          Object.keys(manualValues).forEach(key => {
               replace(key, manualValues[key]);
          });

          
          // Address handling (Salesforce Composite Field)
          replace('MailingStreet', address.street || address.MailingStreet);
          replace('MailingCity', address.city || address.MailingCity);
          replace('MailingState', address.state || address.MailingState);
          replace('MailingPostalCode', address.postalCode || address.MailingPostalCode);
          replace('MailingCountry', address.country || address.MailingCountry);

          setPreviewContent(html);
      }
  }, [selectedEmpId, employees, templateContent, manualValues])

  const handleDownload = () => {
      if (!selectedEmpId) return;
      const emp = employees.find((e: any) => e.Id === selectedEmpId);
      const name = emp ? `${emp.Contact__r?.FirstName}_${emp.Contact__r?.LastName}` : "Employee";
      const tmplName = selectedTemplateFile?.replace('.html', '') || 'Doc';
      generatePDF('nda-preview-content', `${tmplName}_${name}.pdf`);
  }

  // Generate PDF for a DOM element. Clone node and inline computed colors to avoid lab()/color() formats
  const generatePDF = async (elementId: string, fileName: string) => {
      try {
          const element = document.getElementById(elementId) as HTMLElement;
          if (!element) throw new Error('Element not found');

          const canvas = await html2canvas(element, { scale: Math.max(2, window.devicePixelRatio || 1), useCORS: true, allowTaint: true });
          const imgData = canvas.toDataURL('image/png', 1.0);
          
          // Helper to pixels
          const imgWidth = canvas.width;
          const imgHeight = canvas.height;
          
          // A4 Size in pt (approx) at 72dpi: 595 x 842. JsPDF default unit is mm usually or pt. 
          // We used 'pt' in constructor. 595.28 x 841.89
          const pdf = new jsPDF({ unit: 'pt', format: 'a4', compress: true });
          const pageWidth = pdf.internal.pageSize.getWidth();
          const pageHeight = pdf.internal.pageSize.getHeight();
          
          const ratio = pageWidth / imgWidth;
          const pdfImgHeight = imgHeight * ratio;
          
          let heightLeft = pdfImgHeight;
          let position = 0;

          // First Page
          pdf.addImage(imgData, 'PNG', 0, position, pageWidth, pdfImgHeight);
          heightLeft -= pageHeight;

          // Subsequent Pages
          while (heightLeft > 0) {
              position = heightLeft - pdfImgHeight; // This calculation logic needs to be careful. 
              // Actually standard way: position starts at 0. Next page position is -pageHeight? 
              // Usually: position = -pageHeight * pageIndex
              
              pdf.addPage();
              position = - (pdfImgHeight - heightLeft); // Shift up by the amount already printed? 
              // No, simplified logic:
              // We are printing the SAME image shifted up.
              // Page 2 starts showing the image at y = -pageHeight
              
              // Let's use a simpler counter
              pdf.addImage(imgData, 'PNG', 0, -(pdfImgHeight - heightLeft), pageWidth, pdfImgHeight);
              heightLeft -= pageHeight;
          }
          
          pdf.save(fileName);
      } catch (err) {
          console.error('PDF Generation Error', err);
          message.error('Failed to generate PDF');
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
      } catch(e) {
          message.error("Upload failed");
      } finally {
          setUploading(false);
      }
  }

  const requestColumns = [
      { 
          title: 'Employee', 
          dataIndex: ['Employee__r', 'Contact__r', 'Name'], 
          key: 'empName',
          render: (text: string, record: any) => text || record.Employee__r?.Name
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
    <div className="min-h-screen bg-slate-50 p-6 lg:p-10 flex flex-col">
      <div className="max-w-7xl mx-auto w-full space-y-6 flex-1 flex flex-col">
        
        {/* Header */}
        <div className="shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Document Manager</h1>
                <p className="text-slate-500">Generate, preview, and download agreements and letters.</p>
            </div>
        </div>

         <Tabs 
            defaultActiveKey="1" 
            items={[
                {
                    key: '1',
                    label: 'Generator',
                    children: (
                         <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1">
            
                            {/* Left Sidebar: Controls */}
                            <div className="lg:col-span-4 space-y-6 h-fit sticky top-6">
                                
                                {/* Employee Selector Card */}
                                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 transition-all hover:shadow-md">
                                    <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                        <User className="w-5 h-5 text-blue-500" /> Select Employee
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
                                                label: `${emp.Contact__r?.FirstName} ${emp.Contact__r?.LastName} (${emp.Contact__r?.Employee_Role__c || 'No Role'})`
                                            }))}
                                        />
                                    )}

                                    {selectedEmployee && (
                                         <div className="mt-6 p-4 bg-gradient-to-br from-blue-50 to-indigo-50/50 rounded-xl border border-blue-100 shadow-sm animate-in fade-in slide-in-from-top-2">
                                             <div className="flex items-start gap-4">
                                                 <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg shrink-0 border-2 border-white shadow-sm">
                                                     {selectedEmployee.Contact__r?.FirstName?.[0]}
                                                 </div>
                                                 <div className="flex-1 min-w-0">
                                                     <h3 className="font-bold text-slate-800 truncate text-base">{selectedEmployee.Contact__r?.FirstName} {selectedEmployee.Contact__r?.LastName}</h3>
                                                     <p className="text-xs text-slate-500 truncate mb-2">{selectedEmployee.Contact__r?.Email}</p>
                                                     
                                                     <div className="flex flex-col gap-1.5 mt-2 pt-2 border-t border-blue-100/50">
                                                         <div className="flex justify-between items-center text-xs group">
                                                             <span className="text-slate-500 font-medium">Role</span>
                                                             <span className="font-semibold text-slate-700 bg-white px-2 py-0.5 rounded border border-blue-50 group-hover:border-blue-100 transition-colors">
                                                                {selectedEmployee.Contact__r?.Employee_Role__c || '-'}
                                                             </span>
                                                         </div>
                                                         <div className="flex justify-between items-center text-xs group">
                                                             <span className="text-slate-500 font-medium">Department</span>
                                                             <span className="font-semibold text-slate-700 bg-white px-2 py-0.5 rounded border border-blue-50 group-hover:border-blue-100 transition-colors">
                                                                {selectedEmployee.Contact__r?.Department__c || '-'}
                                                             </span>
                                                         </div>
                                                         <div className="flex justify-between items-center text-xs group">
                                                             <span className="text-slate-500 font-medium">Employee Id</span>
                                                             <span className="font-semibold text-slate-700 bg-white px-2 py-0.5 rounded border border-blue-50 group-hover:border-blue-100 transition-colors">
                                                                {selectedPartitionKey || selectedEmployee.PartitionKey || selectedEmployee.Employee_Id || '-'}
                                                             </span>
                                                         </div>
                                                     </div>
                                                 </div>
                                             </div>
                                         </div>
                                    )}
                                </div>

                                {/* Manual Inputs Card */}
                                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 transition-all hover:shadow-md">
                                    <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                        <Printer className="w-5 h-5 text-green-500" /> Manual Fields
                                    </h2>
                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-xs font-semibold text-slate-500">Register No</label>
                                            <Input 
                                                value={manualValues.Register_No} 
                                                onChange={(e) => setManualValues({...manualValues, Register_No: e.target.value})}
                                                placeholder="REG-XXX"
                                            />
                                        </div>
                                         <div>
                                            <label className="text-xs font-semibold text-slate-500">Date</label>
                                            <Input 
                                                type="date"
                                                value={manualValues.Date} 
                                                onChange={(e) => setManualValues({...manualValues, Date: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Template Selector */}
                                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 transition-all hover:shadow-md">
                                    <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
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
                                            
                                            {selectedTemplateFile && (
                                                <div className="p-3 border rounded-xl bg-purple-50/30 flex items-center gap-3 border-purple-200 animate-in fade-in slide-in-from-left-2">
                                                    <FileCheck className="w-5 h-5 text-purple-600" />
                                                    <div className="flex-1">
                                                        <p className="text-sm font-semibold text-purple-900">{selectedTemplateName}</p>
                                                        <p className="text-xs text-purple-500">HTML Template</p>
                                                    </div>
                                                </div>
                                            )}
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
                            <div className="lg:col-span-8 flex flex-col h-[calc(100vh-140px)] sticky top-6">
                                <div className="bg-slate-200 rounded-2xl p-4 lg:p-8 flex-1 overflow-auto shadow-inner border border-slate-300 relative group">
                                    {previewContent ? (
                                        <div className="w-full max-w-[210mm] bg-white shadow-2xl animate-in zoom-in-95 duration-500 origin-top flex flex-col mx-auto transition-transform">
                                            {/* Print Header/Toolbar could go here */}
                                            <div id="nda-preview-content" 
                                                contentEditable
                                                className="text-slate-900 text-sm md:text-base leading-relaxed flex-1 font-serif"
                                                dangerouslySetInnerHTML={{ __html: previewContent }} 
                                            />
                                        </div>
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                                            <FileText className="w-24 h-24 mb-4 stroke-1" />
                                            <p className="text-lg font-medium">Select an employee & template to preview</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                },
                {
                    key: '2',
                    label: 'Pending Requests',
                    children: (
                        <Card className="shadow-sm border-slate-100 rounded-2xl">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-bold text-slate-800">Requests Pending Action</h2>
                                <Button icon={<RefreshCw className="w-4 h-4" />} onClick={() => refetchPending()}>Refresh</Button>
                            </div>
                            <Table 
                                dataSource={pendingDocs} 
                                columns={requestColumns} 
                                loading={loadingPending}
                                rowKey="Id"
                            />
                        </Card>
                    )
                }
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
                     <p className="text-xs text-slate-500">Employee: {selectedRequest?.Employee__r?.Name}</p>
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
  )
}


