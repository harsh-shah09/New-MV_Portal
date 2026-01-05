
import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import { getPendingDocuments } from '@/lib/salesforce';

export async function GET() {
    const session = await verifySession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // In a real app, verify `session.role === 'HR'` here.
    
    try {
        const docs = await getPendingDocuments();
        return NextResponse.json(docs);
    } catch(e: any) {
         return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
