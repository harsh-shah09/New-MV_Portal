
"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Card, List, Tag, Button, Spin, Empty } from "antd"
import { CheckCircle, AlertCircle, Info, Clock, X, Trash2, Check, CheckCheckIcon } from "lucide-react"
import { formatDistanceToNow } from 'date-fns'
import { useState } from "react"
import { toast } from "sonner"
import { RefreshButton } from "@/components/refresh-button"
import { PageContainer } from "@/components/page-container"
import { PageHeader } from "@/components/page-header"

export default function NotificationsPage() {
    const [showAll, setShowAll] = useState(false)
    const [clearing, setClearing] = useState(false)
    const queryClient = useQueryClient()

    // Query for unread notifications only (initial load)
    const { data: unreadNotifications, isLoading: isLoadingUnread, isFetching: isFetchingUnread, refetch: refetchUnread } = useQuery({
        queryKey: ['notifications', 'unread'],
        queryFn: async () => {
             const res = await fetch('/api/notifications?unreadOnly=true');
             if (!res.ok) throw new Error("Failed to fetch unread notifications");
             return res.json();
        }
    })

    // Query for all notifications (lazy loaded when showAll is true)
    const { data: allNotifications, isLoading: isLoadingAll, isFetching: isFetchingAll, refetch: refetchAll } = useQuery({
        queryKey: ['notifications', 'all'],
        queryFn: async () => {
             const res = await fetch('/api/notifications');
             if (!res.ok) throw new Error("Failed to fetch all notifications");
             return res.json();
        },
        enabled: showAll // Only fetch when showAll is true
    })

    const displayNotifications = showAll ? (allNotifications || []) : (unreadNotifications || [])
    const isLoading = showAll ? isLoadingAll : isLoadingUnread
    const isFetching = showAll ? isFetchingAll : isFetchingUnread

    const refetch = () => {
        refetchUnread()
        if (showAll) {
            refetchAll()
        }
    }

    const handleMarkAsRead = async (notificationId: string) => {
        try {
            const res = await fetch('/api/notifications', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notificationId, isRead: true })
            })
            if (!res.ok) throw new Error('Failed to mark as read')
            toast.success('Notification Marked as Read')
            refetch()
            queryClient.invalidateQueries({ queryKey: ['notifications'] })
        } catch (error) {
            toast.error('Failed to mark notification as read')
        }
    }

    const handleClearAll = async () => {
        const unreadList = unreadNotifications || []
        if (unreadList.length === 0) {
            toast.info('No unread notifications to clear')
            return
        }
        
        setClearing(true)
        try {
            const notificationIds = unreadList.map((n: any) => n.Id)
            
            const res = await fetch('/api/notifications', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notificationIds, isRead: true })
            })
            
            if (!res.ok) throw new Error('Failed to clear notifications')
            
            toast.success(`${unreadList.length} notifications marked as read`)
            refetch()
            queryClient.invalidateQueries({ queryKey: ['notifications'] })
        } catch (error) {
            toast.error('Failed to mark all notifications as read')
        } finally {
            setClearing(false)
        }
    }

    const getIcon = (type: string) => {
        switch(type) {
            case 'Document Request': return <AlertCircle className="w-5 h-5 text-orange-500" />;
            case 'Document_Ready': return <CheckCircle className="w-5 h-5 text-green-500" />;
            default: return <Info className="w-5 h-5 text-blue-500" />;
        }
    }

    return (
        <PageContainer className="bg-slate-50">
            <div className="w-full mx-auto space-y-6">
                <PageHeader 
                    title="Notifications"
                    subtitle={showAll ? 'All notifications' : `${unreadNotifications?.length || 0} unread notification${unreadNotifications?.length !== 1 ? 's' : ''}`}
                >
                    <Button 
                        onClick={() => setShowAll(!showAll)}
                    >
                        {showAll ? 'Show Unread Only' : 'Show All'}
                    </Button>
                    <Button 
                        icon={<CheckCheckIcon className="w-4 h-4" />} 
                        onClick={handleClearAll}
                        loading={clearing}
                        disabled={!unreadNotifications || unreadNotifications.length === 0}
                        danger
                    >
                        Read All
                    </Button>
                    <RefreshButton
                        onClick={refetch}
                        loading={isFetching}
                        label=""
                    />
                </PageHeader>

                <Card className="shadow-sm border-slate-100 rounded-2xl bg-white/80 backdrop-blur-sm">
                    {isLoading || isFetching ? (
                        <div className="flex justify-center py-10"><Spin size="large" /></div>
                    ) : (
                        <List
                            itemLayout="horizontal"
                            dataSource={displayNotifications}
                            locale={{
                                emptyText: <Empty description={showAll ? "No notifications found" : "No unread notifications"} image={Empty.PRESENTED_IMAGE_SIMPLE} />
                            }}
                            renderItem={(item: any) => {
                                const isRead = item.Status__c !== 'Unread' && item.Is_Read__c !== false && item.Is_Read__c !== 'false' && Boolean(item.Is_Read__c)

                                return (
                                <List.Item 
                                    className={`group relative mb-3 rounded-xl px-4 py-4 transition-colors hover:bg-slate-50 ${isRead ? 'opacity-70' : 'bg-blue-50/30'} ${showAll && !isRead ? 'shadow-md shadow-blue-100/80' : ''}`}
                                >
                                    {!isRead && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleMarkAsRead(item.Id)
                                            }}
                                            className="absolute right-4 top-4 opacity-100 sm:opacity-0 transition-opacity hover:bg-red-50 sm:group-hover:opacity-100 rounded-lg p-1.5 text-red-500"
                                            title="Clear notification"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                    <List.Item.Meta className="px-3"
                                        avatar={
                                                <div className="mt-5 p-2 bg-white rounded-full border border-slate-100 shadow-sm">
                                                {getIcon(item.Notification_Type__c)}
                                            </div>
                                        }
                                        title={
                                            <div className="pr-8">
                                                <span className="font-semibold text-base text-slate-800">{item.Notification_Type__c?.replace('_', ' ') || 'Notification'}</span>
                                            </div>
                                        }
                                        description={
                                            <div className="mt-1 space-y-3">
                                                <p className="text-slate-600 text-sm leading-relaxed">{item.Message__c}</p>
                                                <div className="flex items-end justify-between gap-3">
                                                    <div>
                                                        {item.Status__c && (
                                                            <Tag color={item.Status__c === 'Pending' ? 'orange' : 'green'} className="border-0 bg-opacity-10 font-medium">
                                                                {item.Status__c}
                                                            </Tag>
                                                        )}
                                                    </div>
                                                    <span className="flex items-center gap-1 whitespace-nowrap text-xs font-medium text-slate-400">
                                                        <Clock className="w-3 h-3" />
                                                        {item.CreatedDate ? formatDistanceToNow(new Date(item.CreatedDate), { addSuffix: true }) : ''}
                                                    </span>
                                                </div>
                                            </div>
                                        }
                                    />
                                </List.Item>
                                )
                            }}
                        />
                    )}
                </Card>
            </div>
        </PageContainer>
    )
}
