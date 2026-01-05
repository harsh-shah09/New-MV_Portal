
import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import { getNotifications } from '@/lib/salesforce';

export async function GET() {
    const session = await verifySession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    try {
        // Use employeeId if available, or fetch using userId if structured differently. 
        // session.employeeId is what we likely need, assuming session structure.
        const notifs = await getNotifications(session.employeeId);
        return NextResponse.json(notifs);
    } catch(e: any) {
        console.log(e)
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
