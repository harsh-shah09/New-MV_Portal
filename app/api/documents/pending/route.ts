
import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import { getPendingDocuments } from '@/lib/salesforce';

export async function GET() {
    const session = await verifySession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!['HR', 'Admin'].includes(session.role)) {
        return NextResponse.json({ error: 'No Content Found' }, { status: 403 });
    }

    try {
        const docs = await getPendingDocuments(session.role);
        return NextResponse.json(docs);
    } catch(e: any) {
         return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
