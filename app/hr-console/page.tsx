"use client";

import React, { useState, useEffect } from "react";
import {
    FileText,
    Mail,
    Save,
    AlertTriangle,
    Loader2,
    X,
    Plus
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { message, Modal, Spin, Collapse } from "antd";
import EmailEditor from "@/components/admin/email-editor";
import SafeHTMLPreview from "@/components/safe-html-preview";
import { RoleGuard } from "@/components/role-guard";

type HRTab = "email" | "documents";

const VALID_TABS: HRTab[] = ["email", "documents"];

function getTabFromQuery(): HRTab {
    if (typeof window === "undefined") return "email";
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab") as HRTab;
    return VALID_TABS.includes(tab) ? tab : "email";
}

export default function HRConsole() {
    const [activeTab, setActiveTab] = useState<HRTab>("email");
    const [configs, setConfigs] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [unsavedChanges, setUnsavedChanges] = useState<any[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<any>(null);

    // Sync query params on mount and navigation
    useEffect(() => {
        const syncTab = () => setActiveTab(getTabFromQuery());
        syncTab();
        window.addEventListener("popstate", syncTab);
        return () => window.removeEventListener("popstate", syncTab);
    }, []);

    useEffect(() => {
        fetchConfigs();
    }, []);

    const fetchConfigs = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/admin/configurations?types=emailTemplates,documents');
            if (res.status === 401 || res.status === 403) {
                message.error("Unauthorized access");
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

    const handleInputChange = (metadataType: string, record: any, newValue: any, field: string = 'Value__c') => {
        const section =
            metadataType === 'Documents_Configurations__mdt' ? 'documents' : 'emailTemplates';

        setConfigs((prev: any) => ({
            ...prev,
            [section]: prev[section].map((r: any) =>
                r.Id === record.Id ? { ...r, [field]: newValue } : r
            )
        }));

        // Track changes for save
        setUnsavedChanges(prev => {
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

    const handleEmailSave = async (id: string, content: string) => {
        const record = configs.emailTemplates.find((r: any) => r.Id === id);
        if (record) {
            handleInputChange('Email_Templates__mdt', record, content);

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

                setUnsavedChanges(prev => prev.filter(c => c.fullName !== updateItem.fullName));
                setSaving(false);
                message.success("Email template saved successfully");
                return;
            } catch (e) {
                setSaving(false);
                message.error("Failed to save email template");
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
                        Note: Updates to Email Templates or Document configurations will affect the entire portal immediately.
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

    if (loading) return <div className="flex h-screen items-center justify-center bg-slate-50"><Spin size="large" /></div>;
    if (!configs) return <div className="flex h-screen items-center justify-center text-red-500 bg-slate-50">Failed to load configurations</div>;

    // Show full screen Email Editor if selected
    if (selectedTemplate) {
        return (
            <EmailEditor
                template={selectedTemplate}
                onSave={handleEmailSave}
                onBack={() => setSelectedTemplate(null)}
            />
        );
    }

    const TabButton = ({ id, label, icon: Icon }: { id: HRTab; label: string; icon: React.ElementType }) => (
        <button
            onClick={() => {
                const params = new URLSearchParams(window.location.search);
                params.set("tab", id);
                window.history.replaceState(null, "", `?${params.toString()}`);
                setActiveTab(id);
            }}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-semibold transition-all duration-200 ${activeTab === id
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                    : "text-slate-600 hover:bg-slate-100/80"
                }`}
        >
            <Icon className={`w-5 h-5 shrink-0 ${activeTab === id ? "text-white" : "text-slate-400"}`} />
            <span className="text-sm">{label}</span>
        </button>
    );

    return (
        <RoleGuard>
            <div className="min-h-screen bg-slate-50 p-6">
                <div className="w-full mx-auto space-y-6 lg:space-y-8">

                    {/* Header */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm animate-in fade-in slide-in-from-top-4">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">HR Console</h1>
                            <p className="text-slate-500 mt-1 text-sm sm:text-base">Manage email templates and document type configurations</p>
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
                        {/* Sidebar Tab Menu */}
                        <div className="lg:col-span-1 space-y-4">
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-2.5 flex flex-row lg:flex-col gap-2">
                                <div className="flex-1 lg:w-full">
                                    <TabButton id="email" label="Email Templates" icon={Mail} />
                                </div>
                                <div className="flex-1 lg:w-full">
                                    <TabButton id="documents" label="Documents Config" icon={FileText} />
                                </div>
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

                        {/* Content Pane */}
                        <div className="lg:col-span-3">
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 lg:p-8 min-h-[50vh] max-h-[75vh] overflow-y-auto">
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={activeTab}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        {activeTab === "documents" && (
                                            <div className="space-y-8">
                                                <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                                                    <FileText className="w-5 h-5 text-indigo-500" /> Documents Configurations
                                                </h2>
                                                {configs.documents?.map((record: any) => (
                                                    <div key={record.Id} className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                                        <label className="block text-lg font-bold text-slate-800 mb-4">
                                                            {record.MasterLabel}
                                                        </label>

                                                        {/* Tag Editor */}
                                                        <div className="space-y-4">
                                                            <div className="flex flex-wrap gap-2 mb-3">
                                                                {record.Value__c?.split(',').map((tag: string, idx: number) => {
                                                                    const t = tag.trim();
                                                                    if (!t) return null;
                                                                    return (
                                                                        <span key={idx} className="bg-white border border-slate-200 text-slate-700 px-3 py-1.5 rounded-full text-sm font-semibold flex items-center gap-2 shadow-sm transition hover:border-slate-300">
                                                                            {t}
                                                                            <button
                                                                                onClick={() => {
                                                                                    const newVal = record.Value__c.split(',').filter((_: any, i: number) => i !== idx).join(',');
                                                                                    handleInputChange('Documents_Configurations__mdt', record, newVal);
                                                                                }}
                                                                                className="text-slate-400 hover:text-red-500 transition-colors"
                                                                            >
                                                                                <X className="w-3.5 h-3.5" />
                                                                            </button>
                                                                        </span>
                                                                    )
                                                                })}
                                                            </div>

                                                            <div className="flex flex-col sm:flex-row gap-2">
                                                                <input
                                                                    id={`add-doc-${record.Id}`}
                                                                    type="text"
                                                                    className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition hover:border-slate-300"
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
                                                                    className="flex gap-1.5 items-center justify-center px-5 py-2.5 bg-blue-600 text-white shadow-md shadow-blue-500/20 rounded-xl text-sm font-semibold hover:bg-blue-700 transition cursor-pointer"
                                                                >
                                                                    <Plus size={16} /> Add
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                                {(!configs.documents || configs.documents.length === 0) && (
                                                    <div className="text-center p-8 text-slate-400">No document configurations found.</div>
                                                )}
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
                                                            className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl cursor-pointer overflow-hidden group flex flex-col h-48 transition-all"
                                                        >
                                                            <div className="p-4 border-b border-slate-50 bg-slate-50/50 group-hover:bg-blue-50 transition-colors">
                                                                <h3 className="font-bold text-slate-800 line-clamp-1 group-hover:text-blue-600 transition-colors">{record.MasterLabel}</h3>
                                                            </div>
                                                            <div className="p-4 flex-1 bg-slate-50/20 relative overflow-hidden">
                                                                <div className="opacity-40 text-[10px] leading-relaxed scale-90 origin-top-left pointer-events-none select-none h-full w-full">
                                                                    <SafeHTMLPreview html={record.Value__c} className="w-full h-full border-none animate-in fade-in" />
                                                                </div>
                                                                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-white to-transparent"></div>
                                                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-white/60 backdrop-blur-sm">
                                                                    <span className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold shadow-lg">Edit Template</span>
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
