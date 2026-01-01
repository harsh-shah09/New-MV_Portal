"use client"

import { useState, useEffect, useRef } from "react"
import { useQuery } from "@tanstack/react-query"
import { Select, Button, Spin, message, Card, Tabs, Empty } from "antd"
import { Download, FileText, User, Search, Printer, FileCheck } from "lucide-react"
import { jsPDF } from "jspdf";
import html2canvas from 'html2canvas-pro'

export default function NDAPage() {
  const [selectedEmpId, setSelectedEmpId] = useState<string | null>(null)
    const [selectedPartitionKey, setSelectedPartitionKey] = useState<string | null>(null)
  const [selectedTemplateFile, setSelectedTemplateFile] = useState<string | null>(null) // Filename
  const [templateContent, setTemplateContent] = useState<string>("")
  const [previewContent, setPreviewContent] = useState<string>("")
  const [loadingTemplate, setLoadingTemplate] = useState(false)

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

          replace('FirstName', contact.FirstName);
          replace('LastName', contact.LastName);
          replace('Employee_Role__c', contact.Employee_Role__c);
          replace('Department__c', contact.Department__c);
          // expose partition / employee id into templates
          replace('Employee_Id', emp.Employee_Id || emp.PartitionKey || emp.Id);
          replace('EmployeeId', emp.Employee_Id || emp.PartitionKey || emp.Id);
          replace('PartitionKey', emp.Employee_Id || emp.PartitionKey || emp.Id);
          replace('Joining_Date__c', emp.Joining_Date__c);
          replace('Base_Salary__c', emp.Base_Salary__c);
          replace('Salary_CTC__c', emp.Salary_CTC__c);
          replace('CurrentDate', new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }));
          
          // Address handling (Salesforce Composite Field)
          replace('MailingStreet', address.street || address.MailingStreet);
          replace('MailingCity', address.city || address.MailingCity);
          replace('MailingState', address.state || address.MailingState);
          replace('MailingPostalCode', address.postalCode || address.MailingPostalCode);
          replace('MailingCountry', address.country || address.MailingCountry);

          setPreviewContent(html);
      }
  }, [selectedEmpId, employees, templateContent])

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
          const pdf = new jsPDF({ unit: 'pt', format: 'a4', compress: true });
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const imgWidth = canvas.width;
          const imgHeight = canvas.height;
          const pdfHeight = (imgHeight * pdfWidth) / imgWidth;
          pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
          pdf.save(fileName);
      } catch (err) {
          console.error('PDF Generation Error', err);
          message.error('Failed to generate PDF');
      }
  }

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
                        <div className="w-full max-w-[210mm] min-h-[297mm] bg-white shadow-2xl animate-in zoom-in-95 duration-500 origin-top flex flex-col mx-auto transition-transform">
                             {/* Print Header/Toolbar could go here */}
                             <div id="nda-preview-content" 
                                  className="p-[10mm] sm:p-[10mm] md:p-[15mm] text-slate-900 text-sm md:text-base leading-relaxed flex-1 font-serif"
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
      </div>
    </div>
  )
}


