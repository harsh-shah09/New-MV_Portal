
import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import { getNotifications, getSalesforceConnection } from '@/lib/salesforce';

export async function GET(req: NextRequest) {
    const session = await verifySession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    try {
        const { searchParams } = new URL(req.url);
        const unreadOnly = searchParams.get('unreadOnly') === 'true';
        
        const notifs = await getNotifications(session.employeeId);
        
        if (unreadOnly) {
            const unreadNotifs = notifs.filter((notification: any) => 
                notification.Status__c === 'Unread' || 
                notification.Is_Read__c === false || 
                notification.Is_Read__c === 'false' || 
                !notification.Is_Read__c
            );
            return NextResponse.json(unreadNotifs);
        }
        
        return NextResponse.json(notifs);
    } catch(e: any) {
        console.log(e)
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    const session = await verifySession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    try {
        const { notificationId, notificationIds, isRead } = await req.json();
        
        const conn = await getSalesforceConnection();
        if (!conn) throw new Error('No Salesforce connection');
        
        // Handle bulk update
        if (notificationIds && Array.isArray(notificationIds)) {
            if (notificationIds.length === 0) {
                return NextResponse.json({ error: 'No notification IDs provided' }, { status: 400 });
            }
            
            const updates = notificationIds.map(id => ({
                Id: id,
                Is_Read__c: isRead,
                Status__c: isRead ? 'Read' : 'Unread'
            }));
            
            await conn.sobject('MV_Notification__c').update(updates);
            return NextResponse.json({ success: true, updated: notificationIds.length });
        }
        
        // Handle single update
        if (!notificationId) {
            return NextResponse.json({ error: 'Notification ID or IDs required' }, { status: 400 });
        }
        
        await conn.sobject('MV_Notification__c').update({
            Id: notificationId,
            Is_Read__c: isRead,
            Status__c: isRead ? 'Read' : 'Unread'
        });
        
        return NextResponse.json({ success: true });
    } catch(e: any) {
        console.log(e)
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
