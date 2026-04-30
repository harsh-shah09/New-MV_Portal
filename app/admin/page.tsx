"use client";

import React, { useState, useEffect } from "react";

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
    Trash2,
    Package,
    ChevronLeft,
    ChevronRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { message, Modal, Select, Spin, Collapse, Input } from "antd";
import EmailEditor from "@/components/admin/email-editor";
import SafeHTMLPreview from "@/components/safe-html-preview";
import { RoleGuard } from "@/components/role-guard";
import { RefreshButton } from "@/components/refresh-button";

const formatLabel = (str: string) => {
    return str.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim();
};

type AdminTab = "admin" | "documents" | "email" | "leave" | "users" | "integration" | "assets";

const VALID_TABS: AdminTab[] = ["admin", "documents", "leave", "users", "integration", "email", "assets"];

function getTabFromQuery(): AdminTab {
    if (typeof window === "undefined") return "admin";
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab") as AdminTab;
    return VALID_TABS.includes(tab) ? tab : "admin";
}

export default function AdminConsole() {
    const [activeTab, setActiveTab] = useState<AdminTab>("admin");
    const [configs, setConfigs] = useState<any>(null);
    const [roleOptions, setRoleOptions] = useState<string[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [userSearch, setUserSearch] = useState("");
    const [integrationSearch, setIntegrationSearch] = useState("");
    const [saving, setSaving] = useState(false);
    const [unsavedChanges, setUnsavedChanges] = useState<any[]>([]);
    // Pagination Controls
    const [currentPageUsers, setCurrentPageUsers] = useState(1);
    const [currentPageIntegrations, setCurrentPageIntegrations] = useState(1);
    const itemsPerPage = 10;

    // Reset user page when search changes
    useEffect(() => {
        setCurrentPageUsers(1);
    }, [userSearch]);

    useEffect(() => {
        setCurrentPageIntegrations(1);
    }, [integrationSearch]);

    // Integration List State
    const [connectedUsers, setConnectedUsers] = useState<any[]>([]);
    const [loadingIntegrations, setLoadingIntegrations] = useState(false);

    // Email Editor State
    const [selectedTemplate, setSelectedTemplate] = useState<any>(null);

    // Read + sync query params on mount and navigation
    useEffect(() => {
        const syncTab = () => setActiveTab(getTabFromQuery());
        syncTab(); // initial
        window.addEventListener("popstate", syncTab);
        return () => window.removeEventListener("popstate", syncTab);
    }, []);

    useEffect(() => {
        fetchConfigs();
    }, []);

    useEffect(() => {
        if (activeTab === 'users') {
            if (users.length === 0) fetchUsers();
        }
        if (activeTab === 'integration') {
            if (users.length === 0) fetchUsers(); // Need users to match names
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
        if (!confirm("Are you sure you want to disconnect this user's Google integration?")) return;

        try {
            const res = await fetch(`/api/admin/integrations/google?employeeId=${employeeId}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                message.success("Integration removed");
                fetchConnectedUsers();
            } else {
                message.error("Failed to remove integration");
            }
        } catch (e) {
            message.error("Failed to remove integration");
        }
    }



    const fetchUsers = async () => {
        try {
            setLoadingUsers(true);
            const res = await fetch('/api/admin/users');
            if (!res.ok) throw new Error("Failed to fetch users");
            const data = await res.json();
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
            setRoleOptions(data.roleOptions || []);
            const {
                roleOptions: _roleOptions,
                payroll: _payroll,
                ...configData
            } = data;
            setConfigs(configData);
        } catch (error) {
            console.error(error);
            message.error("Failed to load configurations");
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (metadataType: string, record: any, newValue: any, field: string = 'Value__c') => {
        // Update local state for display
        const sectionKey = Object.keys(configs).find(key =>
            configs[key].includes(record)
        );

        // Better: Update the configs object directly
        const section =
            metadataType === 'Admin_Configurations__mdt' ? 'admin' :
                metadataType === 'Documents_Configurations__mdt' ? 'documents' :
                    metadataType === 'Email_Templates__mdt' ? 'emailTemplates' :
                        metadataType === 'Asset_Configuration__mdt' ? 'assets' : 'leave';

        setConfigs((prev: any) => ({
            ...prev,
            [section]: prev[section].map((r: any) =>
                r.Id === record.Id ? { ...r, [field]: newValue } : r
            )
        }));

        // Track changes for save
        setUnsavedChanges(prev => {
            // Remove existing change for this record if any
            const fullName = `${metadataType}.${record.DeveloperName}`;
            const filtered = prev.filter(c => !(c.fullName === fullName && c.field === field));
            return [...filtered, {
                metadataType,
                fullName,
                label: record.MasterLabel,
                field,
                value: newValue
            }];
        });
    };

    // Special handling for email save when returning from full screen editor
    const handleEmailSave = async (id: string, content: string) => {
        // Find the record
        const record = configs.emailTemplates.find((r: any) => r.Id === id);
        if (record) {
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
            } catch (e) {
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

                    // Refetch configurations to ensure UI is in sync
                    await fetchConfigs();
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

    const TabButton = ({ id, label, icon: Icon }: { id: AdminTab; label: string; icon: React.ElementType }) => (
        <button
            onClick={() => {
                const params = new URLSearchParams(window.location.search);
                params.set("tab", id);
                window.history.replaceState(null, "", `?${params.toString()}`);
                setActiveTab(id);
            }}
            className={`w-full flex flex-col lg:flex-row items-center justify-center lg:justify-start gap-1 lg:gap-3 px-2 lg:px-4 py-3 rounded-xl font-medium transition-all duration-200 text-center lg:text-left ${activeTab === id
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
        >
            <Icon className={`w-5 h-5 lg:w-5 lg:h-5 shrink-0 ${activeTab === id ? "text-white" : "text-slate-400"}`} />
            <span className="text-xs sm:text-sm">{label}</span>
        </button>
    );

    return (
        <RoleGuard>
            <div className="min-h-screen bg-slate-50 p-6">
                <div className="w-full mx-auto space-y-4 lg:space-y-8">

                    {/* Header */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 sm:p-6 rounded-3xl border border-slate-100 shadow-sm animate-in fade-in slide-in-from-top-4">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Admin Console</h1>
                            <p className="text-slate-500 mt-1 text-sm sm:text-base">Manage system configurations, documents, and templates</p>
                        </div>
                        <button
                            onClick={saveChanges}
                            disabled={unsavedChanges.length === 0 || saving}
                            className={`flex w-full md:w-auto items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold transition shadow-lg ${unsavedChanges.length > 0
                                ? "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20"
                                : "bg-slate-100 text-slate-400 cursor-not-allowed"
                                }`}
                        >
                            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                            Save Changes {unsavedChanges.length > 0 ? `(${unsavedChanges.length})` : ''}
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
                        {/* Sidebar */}
                        <div className="lg:col-span-1 space-y-4">
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-2 grid grid-cols-3 md:grid-cols-2 lg:grid-cols-1 gap-2">
                                <TabButton id="admin" label="General Settings" icon={Settings} />
                                <TabButton id="documents" label="Documents Config" icon={FileText} />
                                <TabButton id="leave" label="Leave Rules" icon={Calendar} />
                                <TabButton id="users" label="User Access" icon={Users} />
                                <TabButton id="integration" label="Connected Users" icon={Workflow} />
                                <TabButton id="email" label="Email Templates" icon={Mail} />
                                <TabButton id="assets" label="Asset Settings" icon={Package} />
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
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6 lg:p-8 max-h-[70vh] overflow-y-auto">
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={activeTab}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        {activeTab === "assets" && (
                                            <div className="space-y-6">
                                                <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                                                    <Package className="w-5 h-5 text-indigo-500" /> Asset Management
                                                </h2>
                                                {configs.assets?.map((record: any) => (
                                                    <div key={record.Id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 bg-white border border-slate-200 rounded-2xl shadow-sm gap-4">
                                                        <div>
                                                            <div className="font-semibold text-slate-800 text-lg mb-1">{record.MasterLabel}</div>
                                                            <div className="text-slate-500 text-sm">System-wide configuration for Asset Management module.</div>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <span className={`text-sm font-medium ${record?.Bypass_Validation__c === 'Yes' ? 'text-green-600' : 'text-slate-500'}`}>
                                                                {record?.Bypass_Validation__c === 'Yes' ? 'Enabled' : 'Disabled'}
                                                            </span>
                                                            <label className="relative inline-flex items-center cursor-pointer">
                                                                <input
                                                                    type="checkbox"
                                                                    className="sr-only peer"
                                                                    defaultChecked={record.Bypass_Validation__c === 'Yes'}
                                                                    onChange={(e) => handleInputChange('Asset_Configuration__mdt', record, e.target.checked ? 'Yes' : 'No')}
                                                                />
                                                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                                            </label>
                                                        </div>
                                                    </div>
                                                ))}
                                                {(!configs.assets || configs.assets.length === 0) && (
                                                    <div className="text-center p-8 text-slate-400">No asset configurations found.</div>
                                                )}
                                            </div>
                                        )}

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

                                                            <div className="flex flex-col sm:flex-row gap-2">
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
                                                                    className="flex gap-1 items-center px-4 py-2 bg-blue-600 text-white shadow-lg shadow-blue-500/30 rounded-lg text-sm font-medium hover:bg-blue-800 transition cursor-pointer"
                                                                >
                                                                    <Plus size={16} /> Add
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
                                                        {['One_plus_two_rule', 'Sandwich_Rule'].includes(record.DeveloperName) ? (
                                                            <Select
                                                                value={record.Value__c || 'false'}
                                                                onChange={(value) => handleInputChange('Leave_Configurations__mdt', record, value)}
                                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                                                options={[
                                                                    { value: 'true', label: 'Enabled' },
                                                                    { value: 'false', label: 'Disabled' }
                                                                ]}
                                                            />
                                                        ) : ['Sandwich_Rule_Applies_to', 'One_Two_Applies_to'].includes(record.DeveloperName) ? (
                                                            <Select
                                                                mode="multiple"
                                                                allowClear
                                                                value={(record.Value__c || '').split(',').map((role: string) => role.trim()).filter(Boolean)}
                                                                onChange={(values) => handleInputChange('Leave_Configurations__mdt', record, values.join(','))}
                                                                options={roleOptions.map((role) => ({ value: role, label: role }))}
                                                                placeholder="Select roles"
                                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                                            />
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
                                                <div className="flex flex-col md:flex-row justify-between gap-4">
                                                    <div>
                                                        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                                            <Users className="w-5 h-5 text-indigo-500" /> User Access
                                                        </h2>
                                                        <p className="text-slate-500 text-sm mt-1">Manage portal access and role visibility.</p>
                                                    </div>
                                                    <div className="relative w-full md:w-64">
                                                        <Input
                                                            type="text"
                                                            placeholder="Search employees..."
                                                            value={userSearch}
                                                            onChange={(e) => { setUserSearch(e.target.value) }}
                                                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                                            prefix={<Search className="w-4 h-4 text-slate-400" />}
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
                                                                    {(() => {
                                                                        const filteredUsers = users.filter(u =>
                                                                            u.Name?.toLowerCase().includes(userSearch.toLowerCase()) ||
                                                                            u.Email?.toLowerCase().includes(userSearch.toLowerCase())
                                                                        );
                                                                        const startIndex = (currentPageUsers - 1) * itemsPerPage;
                                                                        const paginatedUsers = filteredUsers.slice(startIndex, startIndex + itemsPerPage);

                                                                        return paginatedUsers.map(user => (
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
                                                                                    <Select
                                                                                        size="small"
                                                                                        dropdownStyle={{ width: 'max-content'}}
                                                                                        value={user.Role || 'Employee'}
                                                                                        onChange={(e) => updateUser(user.Id, { Role__c: e.target.value })}
                                                                                        className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                                                                                        options={[
                                                                                            { value: 'Employee', label: 'Employee (Standard)' },
                                                                                            { value: 'HR', label: 'HR (Manager)' },
                                                                                            { value: 'Admin', label: 'Admin (Full Access)' }
                                                                                        ]}
                                                                                    />
                                                                                </td>
                                                                                <td className="px-6 py-4">
                                                                                    {user.Role === 'Admin' ? (
                                                                                        <div className="relative group/lock inline-block">
                                                                                            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-400 cursor-not-allowed select-none border border-slate-200">
                                                                                                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                                                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                                                                                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                                                                                </svg>
                                                                                                Enabled
                                                                                            </span>
                                                                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-800 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover/lock:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg">
                                                                                                You cannot change the portal visibility of an Admin
                                                                                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
                                                                                            </div>
                                                                                        </div>
                                                                                    ) : (
                                                                                        <button
                                                                                            onClick={() => {
                                                                                                const data = {
                                                                                                    Active__c: user.Active__c ? false : true
                                                                                                }
                                                                                                                                                                                     updateUser(user.Id, data)
                                                                                            }}
                                                                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${user.Active__c
                                                                                                ? "bg-green-100 text-green-700 hover:bg-green-200"
                                                                                                : "bg-red-100 text-red-700 hover:bg-red-200"
                                                                                                }`}
                                                                                        >
                                                                                            {user.Active__c ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                                                                            {user.Active__c ? 'Enabled' : 'Disabled'}
                                                                                        </button>
                                                                                    )}
                                                                                </td>
                                                                                <td className="px-6 py-4">
                                                                                    <span className={`inline-block w-2 h-2 rounded-full mr-2 ${user.Status === 'Active' ? 'bg-green-500' : 'bg-red-400'
                                                                                        }`}></span>
                                                                                    {user.Status === 'Active' ? 'Active' : 'Inactive'}
                                                                                </td>
                                                                            </tr>
                                                                        ))
                                                                    })()}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                        {(() => {
                                                            const filteredUsers = users.filter(u =>
                                                                u.Name?.toLowerCase().includes(userSearch.toLowerCase()) ||
                                                                u.Email?.toLowerCase().includes(userSearch.toLowerCase())
                                                            );
                                                            const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
                                                            const start = filteredUsers.length === 0 ? 0 : (currentPageUsers - 1) * itemsPerPage + 1;
                                                            const end = Math.min(currentPageUsers * itemsPerPage, filteredUsers.length);

                                                            if (filteredUsers.length === 0) {
                                                                return (
                                                                    <div className="p-8 text-center text-slate-400 italic">
                                                                        {userSearch ? `No employees match "${userSearch}".` : 'No employees found.'}
                                                                    </div>
                                                                );
                                                            }

                                                            return (
                                                                <div className="p-4 border-t border-slate-200 flex flex-row sm:flex-row items-center justify-between bg-slate-50 gap-4 sm:gap-0">
                                                                    <div className="text-sm text-slate-500 text-center sm:text-left">
                                                                        Showing {start} to {end} of {filteredUsers.length} entries
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <button
                                                                            disabled={currentPageUsers === 1}
                                                                            onClick={() => setCurrentPageUsers(prev => prev - 1)}
                                                                            className="px-1 py-1.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                                        >
                                                                            <ChevronLeft size={16}/>
                                                                        </button>
                                                                        <span className="text-sm px-3 text-cyan-500 border border-border rounded-lg border-cyan-500 px-2 py-1 font-bold">
                                                                            {currentPageUsers}
                                                                        </span>
                                                                        <button
                                                                            disabled={currentPageUsers >= totalPages}
                                                                            onClick={() => setCurrentPageUsers(prev => prev + 1)}
                                                                            className="px-1 py-1.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                                        >
                                                                            <ChevronRight size={16}/>
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })()}
                                                    </div>
                                                )}
                                            </div>
                                        )}





                                        {activeTab === "integration" && (
                                            <div className="space-y-6">
                                                <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
                                                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                                        <Workflow className="text-orange-500" /> Google Connected Users
                                                    </h2>
                                                    <div className="flex sm:flex-row items-center sm:items-center gap-3 w-full md:w-auto">
                                                        <div className="flex justify-center sm:block">
                                                            <RefreshButton onClick={fetchConnectedUsers} label="" loading={loadingIntegrations} />
                                                        </div>
                                                        <div className="relative w-full md:w-64">
                                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                            <input
                                                                type="text"
                                                                placeholder="Search connected users..."
                                                                value={integrationSearch}
                                                                onChange={e => setIntegrationSearch(e.target.value)}
                                                                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                                                    {loadingIntegrations || loadingUsers ? (
                                                        <div className="p-12 flex justify-center">
                                                            <Spin indicator={<Loader2 className="w-8 h-8 animate-spin text-blue-500" />} />
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div className="overflow-x-auto">
                                                                <table className="w-full text-left">
                                                                    <thead className="bg-slate-50 border-b border-slate-200">
                                                                        <tr>
                                                                            <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Employee</th>
                                                                            <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Google Email</th>
                                                                            <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Connected Since</th>
                                                                            <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                                                            <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-slate-100">
                                                                        {(() => {
                                                                            const filteredIntegrations = connectedUsers.filter((item) => {
                                                                                const employee = users.find(u => u.Id === item.Employee_Id);
                                                                                const query = integrationSearch.toLowerCase();

                                                                                if (!query) return true;

                                                                                return (
                                                                                    employee?.Name?.toLowerCase().includes(query) ||
                                                                                    employee?.Email?.toLowerCase().includes(query) ||
                                                                                    item.account_email?.toLowerCase().includes(query)
                                                                                );
                                                                            });
                                                                            const startIndex = (currentPageIntegrations - 1) * itemsPerPage;
                                                                            const paginatedIntegrations = filteredIntegrations.slice(startIndex, startIndex + itemsPerPage);
                                                                            return paginatedIntegrations.map((item) => {
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
                                                                                            {item.account_email || 'Not available'}
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
                                                                            })
                                                                        })()}
                                                                        {(() => {
                                                                            const filteredIntegrations = connectedUsers.filter((item) => {
                                                                                const employee = users.find(u => u.Id === item.Employee_Id);
                                                                                const query = integrationSearch.toLowerCase();

                                                                                if (!query) return true;

                                                                                return (
                                                                                    employee?.Name?.toLowerCase().includes(query) ||
                                                                                    employee?.Email?.toLowerCase().includes(query) ||
                                                                                    item.account_email?.toLowerCase().includes(query)
                                                                                );
                                                                            });

                                                                            if (filteredIntegrations.length > 0) {
                                                                                return null;
                                                                            }

                                                                            return (
                                                                            <tr>
                                                                                <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                                                                                    {integrationSearch
                                                                                        ? `No connected users match "${integrationSearch}".`
                                                                                        : 'No users have connected their Google Workspace account yet.'}
                                                                                </td>
                                                                            </tr>
                                                                            );
                                                                        })()}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                            {(() => {
                                                                const filteredIntegrations = connectedUsers.filter((item) => {
                                                                    const employee = users.find(u => u.Id === item.Employee_Id);
                                                                    const query = integrationSearch.toLowerCase();

                                                                    if (!query) return true;

                                                                    return (
                                                                        employee?.Name?.toLowerCase().includes(query) ||
                                                                        employee?.Email?.toLowerCase().includes(query) ||
                                                                        item.account_email?.toLowerCase().includes(query)
                                                                    );
                                                                });
                                                                const totalPages = Math.ceil(filteredIntegrations.length / itemsPerPage);
                                                                const start = filteredIntegrations.length === 0 ? 0 : (currentPageIntegrations - 1) * itemsPerPage + 1;
                                                                const end = Math.min(currentPageIntegrations * itemsPerPage, filteredIntegrations.length);

                                                                if (filteredIntegrations.length === 0) {
                                                                    return null;
                                                                }

                                                                return (
                                                                    <div className="p-4 border-t border-slate-200 flex flex-row sm:flex-row items-center justify-between bg-slate-50 gap-4 sm:gap-0">
                                                                        <div className="text-sm text-slate-500 text-center sm:text-left">
                                                                            Showing {start} to {end} of {filteredIntegrations.length} entries
                                                                        </div>
                                                                        <div className="flex items-center gap-2">
                                                                            <button
                                                                                disabled={currentPageIntegrations === 1}
                                                                                onClick={() => setCurrentPageIntegrations(prev => prev - 1)}
                                                                                className="px-1 py-1.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                                            >
                                                                                <ChevronLeft size={16}/>
                                                                            </button>
                                                                            <span className="px-3 text-cyan-500 border border-border rounded-lg border-cyan-500 px-2 py-1 font-bold">
                                                                                {currentPageIntegrations}
                                                                            </span>
                                                                            <button
                                                                                disabled={currentPageIntegrations >= totalPages}
                                                                                onClick={() => setCurrentPageIntegrations(prev => prev + 1)}
                                                                                className="px-1 py-1.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                                            >
                                                                                <ChevronRight size={16}/>
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })()}
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {activeTab === "email" && (() => {
                                            const onboarding = configs.emailTemplates?.filter((r: any) => {
                                                const lowered = (r.DeveloperName || '').toLowerCase();
                                                return lowered.includes('welcome') || lowered.includes('onboarding') || narrowedDocumentCheck(lowered);
                                            }) || [];
                                            const leave = configs.emailTemplates?.filter((r: any) => {
                                                const lowered = (r.DeveloperName || '').toLowerCase();
                                                return lowered.includes('leave') || lowered.includes('sandwich');
                                            }) || [];
                                            const other = configs.emailTemplates?.filter((r: any) => {
                                                const lowered = (r.DeveloperName || '').toLowerCase();
                                                return !(lowered.includes('welcome') || lowered.includes('onboarding') || narrowedDocumentCheck(lowered) || lowered.includes('leave') || lowered.includes('sandwich'));
                                            }) || [];

                                            function narrowedDocumentCheck(name: string) {
                                              return name.includes('document');
                                            }

                                            const renderTemplateGrid = (items: any[]) => (
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4 bg-slate-50/50 rounded-xl">
                                                    {items.map((record: any) => (
                                                        <motion.div
                                                            key={record.Id}
                                                            whileHover={{ scale: 1.02 }}
                                                            onClick={() => setSelectedTemplate(record)}
                                                            className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl cursor-pointer overflow-hidden group flex flex-col h-48"
                                                        >
                                                            <div className="p-4 border-b border-slate-50 bg-slate-50/50 group-hover:bg-blue-50 transition-colors">
                                                                <h3 className="font-bold text-slate-800 line-clamp-1 group-hover:text-blue-600 transition-colors">{record.MasterLabel}</h3>
                                                                {/* <p className="text-xs text-slate-400 font-mono mt-1">{record.DeveloperName}</p> */}
                                                            </div>
                                                            <div className="p-4 flex-1 bg-slate-50/20 relative overflow-hidden">
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
                                                    {items.length === 0 && (
                                                        <div className="col-span-full p-8 text-center text-slate-400 font-medium italic">No templates available.</div>
                                                    )}
                                                </div>
                                            );

                                            return (
                                                <div>
                                                    <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                                                        <Mail className="w-5 h-5 text-purple-500" /> Email Templates
                                                    </h2>
                                                    <Collapse
                                                        defaultActiveKey={['onboarding', 'leave', 'other']}
                                                        className="bg-white"
                                                        bordered={false}
                                                        items={[
                                                            { key: 'onboarding', label: <span className="font-bold text-slate-800">Onboarding & Verification</span>, children: renderTemplateGrid(onboarding) },
                                                            { key: 'leave', label: <span className="font-bold text-slate-800">Leave Approvals</span>, children: renderTemplateGrid(leave) },
                                                            { key: 'other', label: <span className="font-bold text-slate-800">Other Configurations</span>, children: renderTemplateGrid(other) }
                                                        ]}
                                                    />
                                                </div>
                                            );
                                        })()}
                                    </motion.div>
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </RoleGuard>
    );
}
