
"use client"

import { useState, useEffect } from "react"
import { Check, XCircle, Trash2, Loader2, AlertCircle } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

export function GoogleIntegration() {
    const [connected, setConnected] = useState(false)
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState(false)
    const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null)

    useEffect(() => {
        checkStatus();
        
        const params = new URLSearchParams(window.location.search);
        const success = params.get('success');
        const error = params.get('error');

        if (success === 'google_connected') {
            showNotification('success', "Successfully connected to Google Workspace");
            window.history.replaceState({}, document.title, window.location.pathname);
            setConnected(true);
        } else if (error) {
            showNotification('error', decodeURIComponent(error));
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, []);

    const showNotification = (type: 'success' | 'error', msg: string) => {
        setNotification({ type, message: msg });
        setTimeout(() => setNotification(null), 5000); // Auto hide after 5s
    }

    const checkStatus = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/integrations/google?action=status');
            if (res.ok) {
                const data = await res.json();
                setConnected(data.connected);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    const handleConnect = async () => {
        try {
            setActionLoading(true);
            const res = await fetch('/api/integrations/google');
            if (!res.ok) throw new Error("Failed");
            const data = await res.json();
            window.location.href = data.url;
        } catch (e) {
            showNotification('error', "Failed to initiate connection. Please try again.");
            setActionLoading(false);
        }
    }

    const handleDisconnect = async () => {
        try {
            setActionLoading(true);
            const res = await fetch('/api/integrations/google?action=disconnect');
            if (!res.ok) throw new Error("Failed");
            setConnected(false);
            showNotification('success', "Successfully disconnected from Google Workspace");
        } catch (e) {
            showNotification('error', "Failed to disconnect. Please try again.");
        } finally {
            setActionLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-[220px] animate-pulse">
                <div className="flex justify-between mb-6">
                    <div className="flex gap-4">
                        <div className="w-12 h-12 bg-slate-200 rounded-xl"></div>
                        <div className="space-y-2">
                            <div className="h-4 w-32 bg-slate-200 rounded"></div>
                            <div className="h-3 w-24 bg-slate-100 rounded"></div>
                        </div>
                    </div>
                    <div className="h-6 w-20 bg-slate-100 rounded-full"></div>
                </div>
                <div className="space-y-2 mb-6">
                    <div className="h-3 w-full bg-slate-100 rounded"></div>
                    <div className="h-3 w-4/5 bg-slate-100 rounded"></div>
                </div>
                <div className="h-10 w-full bg-slate-100 rounded-xl"></div>
            </div>
        )
    }

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-shadow duration-300">
            {/* Notification Toast */}
            <AnimatePresence>
                {notification && (
                    <motion.div 
                        initial={{ opacity: 0, y: -20, x: '-50%' }}
                        animate={{ opacity: 1, y: 0, x: '-50%' }}
                        exit={{ opacity: 0, y: -20, x: '-50%' }}
                        className={`absolute top-4 left-1/2 -translate-x-1/2 z-10 px-4 py-2 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2 whitespace-nowrap ${
                            notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                        }`}
                    >
                        {notification.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                        {notification.message}
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white border border-slate-100 rounded-xl flex items-center justify-center p-2 shadow-sm group-hover:scale-110 transition-transform duration-300">
                        <svg viewBox="0 0 24 24" className="w-8 h-8">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800 text-lg">Google Workspace</h3>
                        <p className="text-sm text-slate-500">Gmail & Calendar Sync</p>
                    </div>
                </div>
                <div className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 border transition-colors ${
                    connected 
                    ? "bg-green-50 text-green-700 border-green-100" 
                    : "bg-slate-50 text-slate-500 border-slate-100"
                }`}>
                    {connected ? (
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                    ) : (
                        <div className="w-2 h-2 rounded-full bg-slate-300"></div>
                    )}
                    {connected ? "Active" : "Not Connected"}
                </div>
            </div>
            
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                Seamlessly integrate with your Google account to enable automatic leave notifications via Gmail and sync approved leaves directly to your calendar.
            </p>

            <div className="flex gap-3">
                {!connected ? (
                    <button 
                        onClick={handleConnect}
                        disabled={actionLoading}
                        className="w-full bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 text-slate-700 hover:text-blue-600 font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed shadow-sm hover:shadow"
                    >
                        {actionLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                        ) : (
                            <>
                                <img src="https://www.google.com/favicon.ico" className="w-4 h-4 grayscale group-hover:grayscale-0 transition-all" /> 
                                Connect Account
                            </>
                        )}
                    </button>
                ) : (
                    <button 
                        onClick={handleDisconnect}
                        disabled={actionLoading}
                        className="w-full bg-slate-50 border border-slate-200 hover:bg-red-50 hover:border-red-200 text-slate-600 hover:text-red-600 font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {actionLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                <Trash2 className="w-4 h-4" /> Disconnect Integration
                            </>
                        )}
                    </button>
                )}
            </div>
        </div>
    )
}
