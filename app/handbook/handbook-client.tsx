"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Input, Button, Card, Modal, Form, Select, Upload, message, Tag, Empty, Tooltip, Spin } from "antd"
import { Search, Plus, FileText, Download, Eye, File as FileIcon, Trash2 } from "lucide-react"
import { InboxOutlined, SearchOutlined } from "@ant-design/icons"
import { PageHeader } from "@/components/page-header"

interface HandbookClientProps {
  role: string
  userId: string
}

export default function HandbookClient({ role, userId }: HandbookClientProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [previewDoc, setPreviewDoc] = useState<any | null>(null)

    const sanitizeFileName = (name: string) => name.replace(/<[^>]*>/g, "")

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }
  
  const queryClient = useQueryClient();
  const isHR = role?.includes('HR') || role?.includes('Admin');

  // Fetch Documents
  const { data: documents = [], isLoading } = useQuery({
     queryKey: ['handbooks'],
     queryFn: async () => {
         const res = await fetch('/api/handbook');
         if(!res.ok) throw new Error("Failed to fetch");
         return res.json();
     }
  });

  const filteredDocs = documents.filter((doc: any) => 
     doc.Name.toLowerCase().includes(searchTerm.toLowerCase()) || 
     (doc.Document_Type__c && doc.Document_Type__c.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Upload Mutation
  const uploadMutation = useMutation({
      mutationFn: async (formData: FormData) => {
           const res = await fetch('/api/handbook', {
               method: 'POST',
               body: formData
           });
           if(!res.ok) throw new Error("Upload failed");
           return res.json();
      },
      onSuccess: () => {
          message.success("Handbook uploaded successfully");
          setUploadModalOpen(false);
          queryClient.invalidateQueries({ queryKey: ['handbooks'] });
      },
      onError: () => {
          message.error("Failed to upload handbook");
      }
  });

  const deleteMutation = useMutation({
      mutationFn: async (id: string) => {
           const res = await fetch(`/api/handbook?id=${id}`, {
               method: 'DELETE'
           });
           if(!res.ok) throw new Error("Delete failed");
           return res.json();
      },
      onSuccess: () => {
          message.success("Document deleted");
          queryClient.invalidateQueries({ queryKey: ['handbooks'] });
      },
      onError: () => {
          message.error("Failed to delete document");
      }
  });

  const handleDelete = (id: string) => {
      Modal.confirm({
          title: 'Delete Document',
          content: 'Are you sure you want to delete this document?',
          okText: 'Delete',
          okType: 'danger',
          onOk() {
              deleteMutation.mutate(id);
          }
      });
  }

  const handleUpload = (values: any) => {
       const formData = new FormData();
       formData.append('name', values.name);
       formData.append('type', values.type);
       if(values.file && values.file.fileList?.[0]?.originFileObj) {
           formData.append('file', values.file.fileList[0].originFileObj);
       } else {
           message.error("Please select a file");
           return;
       }
       uploadMutation.mutate(formData);
  }

  // Preview helper
  const renderPreview = () => {
      if(!previewDoc) return null;
      // Simple extension check
      // For a robust app, checking MIME type is better but extension works for quick implementation
      const fileExt = previewDoc.File_URL__c?.split('.').pop()?.toLowerCase();
      const isPdf = fileExt === 'pdf';
      const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt || '');
      
      return (
          <Modal
             title={previewDoc.Name}
             open={!!previewDoc}
             onCancel={() => setPreviewDoc(null)}
             width="100vw"
             footer={[
                 <Button key="download" icon={<Download size={14}/>} href={previewDoc.File_URL__c} target="_blank">
                     Download
                 </Button>,
                 <Button key="close" onClick={() => setPreviewDoc(null)}>Close</Button>
             ]}
             centered
          >
              <div className="h-[85vh] w-full bg-gray-50 flex items-center justify-center overflow-auto rounded-md border border-gray-200">
                   {isPdf ? (
                       <iframe src={previewDoc.File_URL__c} className="w-full h-full" title="Preview" />
                   ) : isImage ? (
                       <img src={previewDoc.File_URL__c} alt="Preview" className="max-w-full max-h-full object-contain" />
                   ) : (
                       <div className="text-center p-10">
                           <FileIcon size={48} className="mx-auto text-gray-400 mb-4"/>
                           <p className="text-lg font-medium text-gray-600">Preview not available for this file type.</p>
                           <Button type="primary" href={previewDoc.File_URL__c} target="_blank" className="mt-4">
                               Download to View
                           </Button>
                       </div>
                   )}
              </div>
          </Modal>
      )
  }

  return (
    <>
        {deleteMutation.status === 'pending' && (
            <div className="fixed inset-0 z-[99999] bg-slate-50/40 backdrop-blur-[2px] flex items-center justify-center">
                <Spin size="large" tip={<span className="mt-2 block font-medium text-slate-600">Deleting...</span>} />
            </div>
        )}
        <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="p-3 bg-white rounded-xl">
        <PageHeader 
        title="Handbook & Policies"
        subtitle="Access company policies, manuals, and guidelines."
        >
        {isHR && (
            <Button type="primary" size="large" icon={<Plus size={16}/>} onClick={() => setUploadModalOpen(true)}>
                Upload Document
            </Button>
        )}
        </PageHeader>

        {/* Filters */}
        <div className="flex gap-4 mb-8 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
             <div className="relative flex-1 max-w-md">
                <Input 
                    placeholder="Search documents..." 
                    className="pl-10" 
                    size="large"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    prefix={<SearchOutlined className="text-muted-foreground" />}
                />
             </div>
        </div>
        
        {isLoading ? (
            <div className="w-full h-screen flex items-center justify-center">
                <Spin size="large" tip="Loading..." />
            </div>
        ) : filteredDocs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredDocs.map((doc: any) => (
                    <Card 
                        key={doc.Id} 
                        hoverable
                        className="rounded-xl overflow-hidden border-gray-200 transition-all hover:shadow-md h-full flex flex-col group handbook-card"
                        bodyStyle={{ padding: 0, height: '100%', display: 'flex', flexDirection: 'column' }}
                    >
                         <div className="h-40 bg-slate-50 flex items-center justify-center border-b border-gray-100 relative overflow-hidden">
                             {/* Large Icon Background */}
                             <FileText size={48} className="text-blue-200 absolute rotate-12 -right-4 -bottom-4 opacity-50" />
                             
                             <FileText size={40} className="text-blue-500 z-10 drop-shadow-sm" />
                             
                             {/* Overlay Actions */}
                             <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-3 backdrop-blur-[2px] z-20 hidden md:flex">
                                   <Tooltip title="Preview">
                                        <Button shape="circle" icon={<Eye size={18} />} onClick={() => setPreviewDoc(doc)} className="border-0 shadow-lg hover:scale-110 transition-transform" />
                                   </Tooltip>
                                   {/* <Tooltip title="Download">
                                        <Button shape="circle" icon={<Download size={18} />} href={doc.File_URL__c} target="_blank" className="border-0 shadow-lg hover:scale-110 transition-transform"/>
                                   </Tooltip> */}
                                   {isHR && (
                                       <Tooltip title="Delete">
                                            <Button shape="circle" danger icon={<Trash2 size={18} />} onClick={() => handleDelete(doc.Id)} className="border-0 shadow-lg hover:scale-110 transition-transform text-red-500 hover:text-red-700"/>
                                       </Tooltip>
                                   )}
                             </div>
                         </div>
                         <div className="p-5 flex-1 flex flex-col">
                             <div className="mb-2 flex items-center justify-between gap-2">
                                <Tag color="blue" className="px-2 py-0.5 rounded-full text-xs font-medium border-0 bg-blue-50 text-blue-600">
                                    {doc.Document_Type__c || 'Document'}
                                </Tag>
                                <div className="flex gap-2 md:hidden">
                                    <Tooltip title="Preview">
                                        <Button size="small" type="text" icon={<Eye size={16} />} onClick={() => setPreviewDoc(doc)} />
                                    </Tooltip>
                                    {isHR && (
                                        <Tooltip title="Delete">
                                            <Button size="small" type="text" danger icon={<Trash2 size={16} />} onClick={() => handleDelete(doc.Id)} />
                                        </Tooltip>
                                    )}
                                </div>
                             </div>
                             <h3 className="font-semibold text-gray-800 mb-1 line-clamp-2 text-base" title={doc.Name}>
                                 {doc.Name}
                             </h3>
                             <p className="text-xs text-gray-400 mt-auto pt-4 border-t border-gray-50 flex justify-between items-center">
                                 <span>Uploaded</span>
                                 <span>{new Date(doc.CreatedDate).toLocaleDateString()}</span>
                             </p>
                         </div>
                    </Card>
                ))}
            </div>
        ) : (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-dashed border-gray-200">
                <Empty description="No documents found" />
            </div>
        )}

        {/* Upload Modal */}
        <Modal
            title="Upload Handbook / Policy"
            open={uploadModalOpen}
            onCancel={() => setUploadModalOpen(false)}
            footer={null}
            destroyOnHidden
        >
            <Spin spinning={uploadMutation.status === 'pending'} tip="Uploading Handbook..." size="large">
                <Form onFinish={handleUpload} layout="vertical" className="pt-4">
                    <Form.Item name="name" label="Document Name" rules={[
                        { required: true, message: 'Please enter a name' },
                        { max: 50, message: 'Document name must be 50 characters or less' },
                        {
                            pattern: /^[a-zA-Z0-9 ]*$/,
                            message: 'No Special characters are allowed',
                        },
                    ]}>
                        <Input placeholder="e.g. Employee Handbook 2024" size="large" disabled={uploadMutation.status === 'pending'} maxLength={50} showCount />
                    </Form.Item>
                    <Form.Item name="type" label="Category / Type" rules={[{ required: true, message: 'Please select a type' }]}>
                        <Select size="large" placeholder="Select Type" disabled={uploadMutation.status === 'pending'}>
                            <Select.Option value="Policy">Policy</Select.Option>
                            <Select.Option value="Manual">Manual</Select.Option>
                            <Select.Option value="Form">Form</Select.Option>
                            <Select.Option value="Guideline">Guideline</Select.Option>
                            <Select.Option value="Other">Other</Select.Option>
                        </Select>
                    </Form.Item>
                    <Form.Item name="file" label="File" rules={[{ required: true, message: 'Please upload a file' }]}>
                        <Upload.Dragger
                           maxCount={1}
                           beforeUpload={(file) => {
                                const supportedFormats = ['pdf', 'docx', 'jpg', 'jpeg', 'png'];
                                const fileExt = file.name.split('.').pop()?.toLowerCase();
                                const isValidFormat = fileExt && supportedFormats.includes(fileExt);
                                const isSmall = file.size < 5 * 1024 * 1024;
                                
                                if (!isValidFormat) {
                                    message.error(`Only PDF, DOCX, JPG, PNG formats are supported. You uploaded ${fileExt?.toUpperCase()}`);
                                    return Upload.LIST_IGNORE;
                                }
                                if (!isSmall) {
                                    message.error("File too large");
                                    return Upload.LIST_IGNORE;
                                }
                                return true;
                            }}
                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                            disabled={uploadMutation.status === 'pending'}
                            itemRender={(_, file) => (
                                <div className="flex items-center justify-between gap-3 rounded-md border border-dashed border-gray-200 bg-white px-3 py-2">
                                    <span className="truncate text-sm text-gray-700" title={sanitizeFileName(file.name)}>
                                        {sanitizeFileName(file.name)}
                                    </span>
                                    <span className="text-xs text-gray-500 flex-shrink-0">
                                        {file.originFileObj ? formatFileSize(file.originFileObj.size) : ''}
                                    </span>
                                </div>
                            )}
                         >
                              <p className="ant-upload-drag-icon text-blue-500">
                                  <InboxOutlined />
                              </p>
                              <p className="ant-upload-text">Click or drag file to this area to upload</p>
                            <p className="ant-upload-hint">Supported formats: PDF, DOCX, JPG, PNG · Max file size: 5 MB</p>
                         </Upload.Dragger>
                    </Form.Item>
                    <div className="flex justify-end gap-3 mt-8">
                        <Button onClick={() => setUploadModalOpen(false)} size="large" disabled={uploadMutation.status === 'pending'}>Cancel</Button>
                        <Button type="primary" htmlType="submit" loading={uploadMutation.status === 'pending'} size="large" className="bg-blue-600">
                            Upload Document
                        </Button>
                    </div>
                </Form>
            </Spin>
        </Modal>

        {renderPreview()}
        </div>
    </div>
    </>
  )
}
