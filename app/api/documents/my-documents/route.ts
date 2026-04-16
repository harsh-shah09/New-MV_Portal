
import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import { getDocumentsByEmployee } from '@/lib/salesforce';

export async function GET() {
    const session = await verifySession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    try {
        const docs = await getDocumentsByEmployee(session.employeeId);
        return NextResponse.json(docs);
    } catch(e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
