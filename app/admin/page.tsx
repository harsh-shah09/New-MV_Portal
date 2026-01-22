"use client";

import { useState, useEffect } from "react";
import { 
  Settings, 
  FileText, 
  Mail, 
  Calendar, 
  Save, 
  AlertTriangle, 
  Loader2,
  X,
  Plus,
  Users,
  Search,
  CheckCircle2,
  XCircle,
  Workflow,
  Check,
  RefreshCw,
  Trash2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { message, Modal, Spin } from "antd";
import EmailEditor from "@/components/admin/email-editor";
import SafeHTMLPreview from "@/components/safe-html-preview";

const formatLabel = (str: string) => {
    return str.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim();
};

export default function AdminConsole() {
  const [activeTab, setActiveTab] = useState<"admin" | "documents" | "email" | "leave" | "users" | "integration">("admin");
  const [configs, setConfigs] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState<any[]>([]);
  
  // Integration List State
  const [connectedUsers, setConnectedUsers] = useState<any[]>([]);
  const [loadingIntegrations, setLoadingIntegrations] = useState(false);

  // Email Editor State
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);

  // Fetch configs
  useEffect(() => {
    fetchConfigs();
  }, []);

  useEffect(() => {
    if (activeTab === 'users') {
        if(users.length === 0) fetchUsers();
    }
    if (activeTab === 'integration') {
        if(users.length === 0) fetchUsers(); // Need users to match names
        fetchConnectedUsers();
    }
  }, [activeTab]);

  const fetchConnectedUsers = async () => {
    try {
        setLoadingIntegrations(true);
        const res = await fetch('/api/admin/integrations/google');
        if (res.ok) {
            const data = await res.json();
            setConnectedUsers(data);
        }
    } catch (e) {
        console.error("Failed to fetch connected users", e);
    } finally {
        setLoadingIntegrations(false);
    }
  }

  const handleDeleteIntegration = async (employeeId: string) => {
    if(!confirm("Are you sure you want to disconnect this user's Google integration?")) return;
    
    try {
        const res = await fetch(`/api/admin/integrations/google?employeeId=${employeeId}`, {
            method: 'DELETE'
        });
        if(res.ok) {
            message.success("Integration removed");
            fetchConnectedUsers();
        } else {
            message.error("Failed to remove integration");
        }
    } catch(e) {
        message.error("Failed to remove integration");
    }
  }



  const fetchUsers = async () => {
      try {
          setLoadingUsers(true);
          const res = await fetch('/api/admin/users');
          if (!res.ok) throw new Error("Failed to fetch users");
          const data = await res.json();
          console.log('users',data)
          setUsers(data);
      } catch (e) {
          message.error("Failed to load users");
      } finally {
          setLoadingUsers(false);
      }
  };

  const updateUser = async (employeeId: string, updates: any) => {
      // Optimistic update
      setUsers(prev => prev.map(u => u.Id === employeeId ? { ...u, ...updates } : u));
      
      try {
          const res = await fetch('/api/admin/users', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ employeeId, updates })
          });
          if (!res.ok) throw new Error("Update failed");
          message.success("User updated");
      } catch (e) {
          message.error("Failed to update user");
          // Revert on failure (could be improved)
          fetchUsers();
      }
  };

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/configurations');
      if (res.status === 401 || res.status === 403) {
        message.error("Unauthorized access");
        // Redirect or show error
        window.location.href = '/dashboard';
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch configurations");
      const data = await res.json();
      setConfigs(data);
    } catch (error) {
      console.error(error);
      message.error("Failed to load configurations");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (metadataType: string, record: any, newValue: any) => {
    // Update local state for display
    const sectionKey = Object.keys(configs).find(key => 
        configs[key].includes(record)
    );
    
    // Better: Update the configs object directly
    const section = 
      metadataType === 'Admin_Configurations__mdt' ? 'admin' :
      metadataType === 'Documents_Configurations__mdt' ? 'documents' :
      metadataType === 'Email_Templates__mdt' ? 'emailTemplates' : 'leave';

    setConfigs((prev: any) => ({
      ...prev,
      [section]: prev[section].map((r: any) => 
        r.Id === record.Id ? { ...r, Value__c: newValue } : r
      )
    }));

    // Track changes for save
    setUnsavedChanges(prev => {
      // Remove existing change for this record if any
      const filtered = prev.filter(c => c.fullName !== `${metadataType}.${record.DeveloperName}`);
      return [...filtered, {
        metadataType,
        fullName: `${metadataType}.${record.DeveloperName}`,
        label: record.MasterLabel,
        value: newValue
      }];
    });
  };

  // Special handling for email save when returning from full screen editor
  const handleEmailSave = async (id: string, content: string) => {
      // Find the record
      const record = configs.emailTemplates.find((r: any) => r.Id === id);
      if(record) {
          handleInputChange('Email_Templates__mdt', record, content);
          // Auto-save effectively
          // Actually, let's trigger the real save immediately for email edits to ensure safety?
          // Or just add to unsaved changes and let user click huge save button? 
          // User asked for "Save" in editor. So let's trigger the saveChanges logic for single item.
          
          try {
             setSaving(true);
             const updateItem = {
                metadataType: 'Email_Templates__mdt',
                fullName: `Email_Templates__mdt.${record.DeveloperName}`,
                label: record.MasterLabel,
                value: content
             };

             const res = await fetch('/api/admin/configurations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ updates: [updateItem] })
             });

             if (!res.ok) throw new Error("Update failed");
             
             // Remove from unsaved if it was there
             setUnsavedChanges(prev => prev.filter(c => c.fullName !== updateItem.fullName));
             setSaving(false);
             return;
          } catch(e) {
             setSaving(false);
             throw e;
          }
      }
  };

  const saveChanges = async () => {
    if (unsavedChanges.length === 0) {
        message.info("No changes to save");
        return;
    }

    Modal.confirm({
      title: 'Confirm Save',
      icon: <AlertTriangle className="text-amber-500 w-6 h-6 mr-2" />,
      content: (
        <div>
          <p>You are about to update {unsavedChanges.length} configuration(s).</p>
          <p className="text-sm text-slate-500 mt-2">
             Note: Updates to Email Templates or core configurations will affect the entire portal immediately.
          </p>
        </div>
      ),
      onOk: async () => {
        try {
          setSaving(true);
          const res = await fetch('/api/admin/configurations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ updates: unsavedChanges })
          });
          
          const data = await res.json();

          if (!res.ok) throw new Error(data.error || "Update failed");

          message.success("Configurations updated successfully");
          setUnsavedChanges([]);
        } catch (error) {
          console.error(error);
          message.error("Failed to save changes");
        } finally {
          setSaving(false);
        }
      }
    });
  };

  if (loading) return <div className="flex h-screen items-center justify-center"><Spin size="large" /></div>;
  if (!configs) return <div className="flex h-screen items-center justify-center text-red-500">Failed to load</div>;

  // If editing an email, show the full screen editor
  if (selectedTemplate) {
      return (
          <EmailEditor 
             template={selectedTemplate} 
             onSave={handleEmailSave} 
             onBack={() => setSelectedTemplate(null)} 
          />
      );
  }

  const TabButton = ({ id, label, icon: Icon }: any) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
        activeTab === id 
          ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30" 
          : "text-slate-600 hover:bg-slate-100"
      }`}
    >
      <Icon className={`w-5 h-5 ${activeTab === id ? "text-white" : "text-slate-400"}`} />
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm animate-in fade-in slide-in-from-top-4">
            <div>
                <h1 className="text-3xl font-bold text-slate-900">Admin Console</h1>
                <p className="text-slate-500 mt-1">Manage system configurations, documents, and templates</p>
            </div>
            <button
                onClick={saveChanges}
                disabled={unsavedChanges.length === 0 || saving}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition shadow-lg ${
                    unsavedChanges.length > 0 
                    ? "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20" 
                    : "bg-slate-100 text-slate-400 cursor-not-allowed"
                }`}
            >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                Save Changes ({unsavedChanges.length})
            </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-4">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-2 space-y-1">
                    <TabButton id="admin" label="General Settings" icon={Settings} />
                    <TabButton id="documents" label="Documents Config" icon={FileText} />
                    <TabButton id="leave" label="Leave Rules" icon={Calendar} />
                    <TabButton id="users" label="User Access" icon={Users} />
                    <TabButton id="integration" label="Connected Users" icon={Workflow} />
                    <TabButton id="email" label="Email Templates" icon={Mail} />
                </div>
                
                {unsavedChanges.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-amber-800 text-sm animate-in zoom-in">
                        <div className="flex items-center gap-2 font-semibold mb-1">
                            <AlertTriangle className="w-4 h-4" /> Unsaved Changes
                        </div>
                        <p>You have {unsavedChanges.length} unsaved modifications.</p>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="lg:col-span-3">
                 <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 min-h-[600px]">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            {activeTab === "admin" && (
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                                        <Settings className="w-5 h-5 text-blue-500" /> General Configurations
                                    </h2>
                                    <div className="grid grid-cols-1 gap-6">
                                        {configs.admin?.map((record: any) => (
                                            <div key={record.Id} className="group">
                                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                                    {record.MasterLabel}
                                                </label>
                                                <input 
                                                    type="text"
                                                    value={record.Value__c || ''}
                                                    onChange={(e) => handleInputChange('Admin_Configurations__mdt', record, e.target.value)}
                                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition group-hover:bg-white"
                                                    placeholder={`Enter ${record.MasterLabel}`}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {activeTab === "documents" && (
                                <div className="space-y-8">
                                    {configs.documents?.map((record: any) => (
                                        <div key={record.Id} className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                            <label className="block text-lg font-semibold text-slate-800 mb-4">
                                                {record.MasterLabel}
                                            </label>
                                            
                                            {/* Visual Tag Editor */}
                                            <div className="space-y-4">
                                                <div className="flex flex-wrap gap-2 mb-3">
                                                    {record.Value__c?.split(',').map((tag: string, idx: number) => {
                                                        const t = tag.trim();
                                                        if (!t) return null;
                                                        return (
                                                            <span key={idx} className="bg-white border border-slate-200 text-slate-700 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 shadow-sm">
                                                                {t}
                                                                <button 
                                                                    onClick={() => {
                                                                        const newVal = record.Value__c.split(',').filter((_: any, i: number) => i !== idx).join(',');
                                                                        handleInputChange('Documents_Configurations__mdt', record, newVal);
                                                                    }}
                                                                    className="hover:text-red-500"
                                                                >
                                                                    <X className="w-3 h-3" />
                                                                </button>
                                                            </span>
                                                        )
                                                    })}
                                                </div>
                                                
                                                <div className="flex gap-2">
                                                    <input 
                                                        id={`add-doc-${record.Id}`}
                                                        type="text"
                                                        className="flex-1 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                                        placeholder="Add new document type..."
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                const val = e.currentTarget.value.trim();
                                                                if (val) {
                                                                    const existing = record.Value__c ? record.Value__c.split(',') : [];
                                                                    const newVal = [...existing, val].join(',');
                                                                    handleInputChange('Documents_Configurations__mdt', record, newVal);
                                                                    e.currentTarget.value = '';
                                                                }
                                                            }
                                                        }}
                                                    />
                                                    <button 
                                                        onClick={() => {
                                                            const input = document.getElementById(`add-doc-${record.Id}`) as HTMLInputElement;
                                                            const val = input.value.trim();
                                                            if (val) {
                                                                const existing = record.Value__c ? record.Value__c.split(',') : [];
                                                                const newVal = [...existing, val].join(',');
                                                                handleInputChange('Documents_Configurations__mdt', record, newVal);
                                                                input.value = '';
                                                            }
                                                        }}
                                                        className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-black transition"
                                                    >
                                                        Add
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {activeTab === "leave" && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {configs.leave?.map((record: any) => (
                                        <div key={record.Id} className="group">
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                                {record.MasterLabel}
                                            </label>
                                            {['Enable_One_plus_two_rule', 'Enable_Sandwitch_Rule'].includes(record.DeveloperName) ? (
                                                <select
                                                    value={record.Value__c || 'false'}
                                                    onChange={(e) => handleInputChange('Leave_Configurations__mdt', record, e.target.value)}
                                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                                >
                                                    <option value="true">Enabled</option>
                                                    <option value="false">Disabled</option>
                                                </select>
                                            ) : (
                                                <input 
                                                    type="text"
                                                    value={record.Value__c || ''}
                                                    onChange={(e) => handleInputChange('Leave_Configurations__mdt', record, e.target.value)}
                                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition group-hover:bg-white"
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {activeTab === "users" && (
                                <div className="space-y-6">
                                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                                        <div>
                                            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                                <Users className="w-5 h-5 text-indigo-500" /> User Access
                                            </h2>
                                            <p className="text-slate-500 text-sm mt-1">Manage portal access and role visibility.</p>
                                        </div>
                                        <div className="relative w-full md:w-64">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <input 
                                                type="text" 
                                                placeholder="Search employees..." 
                                                value={userSearch}
                                                onChange={e => setUserSearch(e.target.value)}
                                                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                            />
                                        </div>
                                    </div>

                                    {loadingUsers ? (
                                        <div className="flex justify-center py-10"><Spin /></div>
                                    ) : (
                                        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left text-sm text-slate-600">
                                                    <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                                                        <tr>
                                                            <th className="px-6 py-4">Employee</th>
                                                            <th className="px-6 py-4">Role / Visibility</th>
                                                            <th className="px-6 py-4">Portal Access</th>
                                                            <th className="px-6 py-4">Status</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {users.filter(u => 
                                                            u.Name?.toLowerCase().includes(userSearch.toLowerCase()) || 
                                                            u.Email?.toLowerCase().includes(userSearch.toLowerCase())
                                                        ).map(user => (
                                                            <tr key={user.Id} className="hover:bg-slate-50/50 transition-colors">
                                                                <td className="px-6 py-4">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden">
                                                                            {user.Photo ? <img src={user.Photo} className="w-full h-full object-cover" /> : <span className="text-xs font-bold text-slate-500">{user.Name?.charAt(0)}</span>}
                                                                        </div>
                                                                        <div>
                                                                            <div className="font-medium text-slate-900">{user.Name}</div>
                                                                            <div className="text-xs text-slate-400">{user.Email}</div>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <select 
                                                                        value={user.Role || 'Employee'}
                                                                        onChange={(e) => updateUser(user.Id, { Role__c: e.target.value })}
                                                                        className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                                                                    >
                                                                        <option value="Employee">Employee (Standard)</option>
                                                                        <option value="HR">HR (Manager)</option>
                                                                        <option value="Admin">Admin (Full Access)</option>
                                                                    </select>
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <button 
                                                                        onClick={() => {
                                                                            const data = {
                                                                                Active__c: user.Active__c ? false : true
                                                                            }
                                                                            console.log(data)
                                                                            updateUser(user.Id, data)}}
                                                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                                                                            user.Active__c 
                                                                            ? "bg-green-100 text-green-700 hover:bg-green-200" 
                                                                            : "bg-red-100 text-red-700 hover:bg-red-200"
                                                                        }`}
                                                                    >
                                                                        {user.Active__c ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                                                        {user.Active__c ? 'Enabled' : 'Disabled'}
                                                                    </button>
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                                                                        user.Status === 'Active' ? 'bg-green-500' : 'bg-red-400'
                                                                    }`}></span>
                                                                    {user.Status === 'Active' ? 'Active' : 'Inactive'}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                            {users.length === 0 && !loadingUsers && (
                                                <div className="p-8 text-center text-slate-400 italic">No employees found.</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}





                            {activeTab === "integration" && (
                                <div className="space-y-6">
                                     <div className="flex justify-between items-center mb-6">
                                        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                            <Workflow className="w-5 h-5 text-orange-500" /> Google Connected Users
                                        </h2>
                                        <button onClick={fetchConnectedUsers} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
                                            <RefreshCw className="w-4 h-4" />
                                        </button>
                                     </div>

                                     <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                                        {loadingIntegrations || loadingUsers ? (
                                             <div className="p-12 flex justify-center">
                                                 <Spin indicator={<Loader2 className="w-8 h-8 animate-spin text-blue-500" />} />
                                             </div>
                                        ) : (
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left">
                                                    <thead className="bg-slate-50 border-b border-slate-200">
                                                        <tr>
                                                            <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Employee</th>
                                                            <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Connected Since</th>
                                                            <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                                            <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {connectedUsers.map((item) => {
                                                            const employee = users.find(u => u.Id === item.Employee_Id);
                                                            return (
                                                                <tr key={item.Employee_Id} className="hover:bg-slate-50/50 transition-colors">
                                                                    <td className="px-6 py-4">
                                                                        <div className="flex items-center gap-3">
                                                                             <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden font-bold text-slate-500 text-xs">
                                                                                 {employee?.Photo ? <img src={employee.Photo} className="w-full h-full object-cover" /> : (employee?.Name?.charAt(0) || '?')}
                                                                             </div>
                                                                             <div>
                                                                                 <div className="font-medium text-slate-900">{employee?.Name || 'Unknown Employee'}</div>
                                                                                 <div className="text-xs text-slate-400">{employee?.Email || 'No Email'}</div>
                                                                             </div>
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-6 py-4 text-sm text-slate-600">
                                                                        {item.updated_at ? new Date(item.updated_at).toLocaleDateString() : 'N/A'}
                                                                    </td>
                                                                    <td className="px-6 py-4">
                                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                                                                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                                                            Active
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-6 py-4 text-right">
                                                                        <button 
                                                                            onClick={() => handleDeleteIntegration(item.Employee_Id)}
                                                                            className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
                                                                            title="Revoke Access"
                                                                        >
                                                                            <Trash2 className="w-4 h-4" />
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                        {connectedUsers.length === 0 && (
                                                            <tr>
                                                                <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">
                                                                    No users have connected their Google Workspace account yet.
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                     </div>
                                </div>
                            )}

                            {activeTab === "email" && (
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                                        <Mail className="w-5 h-5 text-purple-500" /> Email Templates
                                    </h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {configs.emailTemplates?.map((record: any) => (
                                            <motion.div 
                                                key={record.Id} 
                                                whileHover={{ scale: 1.02 }}
                                                onClick={() => setSelectedTemplate(record)}
                                                className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl cursor-pointer overflow-hidden group flex flex-col h-48"
                                            >
                                                <div className="p-4 border-b border-slate-50 bg-slate-50/50 group-hover:bg-blue-50 transition-colors">
                                                    <h3 className="font-bold text-slate-800 line-clamp-1 group-hover:text-blue-600 transition-colors">{record.MasterLabel}</h3>
                                                    <p className="text-xs text-slate-400 font-mono mt-1">{record.DeveloperName}</p>
                                                </div>
                                                <div className="p-4 flex-1 bg-slate-50/20 relative overflow-hidden">
                                                    {/* Mini Preview Mockup */}
                                                    <div className="opacity-40 text-[10px] leading-relaxed scale-90 origin-top-left pointer-events-none select-none h-full w-full">
                                                        <SafeHTMLPreview html={record.Value__c} className="w-full h-full border-none" />
                                                    </div>
                                                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-white to-transparent"></div>
                                                    
                                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-white/60 backdrop-blur-sm">
                                                        <span className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold shadow-lg">Edit Template</span>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                 </div>
            </div>
        </div>
      </div>
    </div>
  );
}
