
"use client"

import { useQuery } from "@tanstack/react-query"
import { Card, List, Tag, Button, Spin, Empty, Typography } from "antd"
import { Bell, CheckCircle, AlertCircle, Info, Clock } from "lucide-react"
import { formatDistanceToNow } from 'date-fns'

const { Title, Text } = Typography;

export default function NotificationsPage() {

    const { data: notifications, isLoading } = useQuery({
        queryKey: ['notifications'],
        queryFn: async () => {
             const res = await fetch('/api/notifications');
             if (!res.ok) throw new Error("Failed to fetch");
             return res.json();
        }
    })

    const getIcon = (type: string) => {
        switch(type) {
            case 'Document Request': return <AlertCircle className="w-5 h-5 text-orange-500" />;
            case 'Document_Ready': return <CheckCircle className="w-5 h-5 text-green-500" />;
            default: return <Info className="w-5 h-5 text-blue-500" />;
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 p-6 lg:p-10">
            <div className="max-w-4xl mx-auto space-y-6">
                 <div>
                    <h1 className="text-3xl font-extrabold text-slate-900">Notifications</h1>
                    <p className="text-slate-500">Stay updated with your latest alerts and tasks.</p>
                </div>

                <Card className="shadow-sm border-slate-100 rounded-2xl bg-white/80 backdrop-blur-sm">
                    {isLoading ? (
                        <div className="flex justify-center py-10"><Spin size="large" /></div>
                    ) : (
                        <List
                            itemLayout="horizontal"
                            dataSource={notifications || []}
                            locale={{
                                emptyText: <Empty description="No notifications found" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                            }}
                            renderItem={(item: any) => (
                                <List.Item 
                                    className={`hover:bg-slate-50 transition-colors px-4 py-4 rounded-xl cursor-pointer ${item.Is_Read__c ? 'opacity-70' : 'bg-blue-50/30'}`}
                                >
                                    <List.Item.Meta
                                        avatar={
                                            <div className="mt-1 p-2 bg-white rounded-full border border-slate-100 shadow-sm">
                                                {getIcon(item.Notification_Type__c)}
                                            </div>
                                        }
                                        title={
                                            <div className="flex justify-between items-start">
                                                <span className="font-semibold text-slate-800 text-base">{item.Notification_Type__c?.replace('_', ' ') || 'Notification'}</span>
                                                <span className="text-xs text-slate-400 font-medium whitespace-nowrap ml-2 flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {item.CreatedDate ? formatDistanceToNow(new Date(item.CreatedDate), { addSuffix: true }) : ''}
                                                </span>
                                            </div>
                                        }
                                        description={
                                            <div className="mt-1 space-y-2">
                                                <p className="text-slate-600 text-sm leading-relaxed">{item.Message__c}</p>
                                                {item.Status__c && (
                                                    <Tag color={item.Status__c === 'Pending' ? 'orange' : 'green'} className="border-0 bg-opacity-10 font-medium">
                                                        {item.Status__c}
                                                    </Tag>
                                                )}
                                            </div>
                                        }
                                    />
                                </List.Item>
                            )}
                        />
                    )}
                </Card>
            </div>
        </div>
    )
}
