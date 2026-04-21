import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import { setAppTourPendingGoogleAuth, getAppTourPendingGoogleAuth, clearAppTourPendingGoogleAuth } from '@/lib/dynamodb';

/**
 * GET /api/auth/app-tour
 * Returns whether the app tour has been completed and Google auth is still pending.
 */
export async function GET() {
    const session = await verifySession();
    if (!session?.employeeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const pending = await getAppTourPendingGoogleAuth(session.employeeId);
    return NextResponse.json({ showGoogleAuthModal: pending });
}

/**
 * POST /api/auth/app-tour
 * Body: { action: 'set_pending' | 'clear_pending' }
 * - set_pending: stores the tour-complete flag → show Google auth modal on next refresh
 * - clear_pending: removes the flag (called after successful Google auth)
 */
export async function POST(req: Request) {
    const session = await verifySession();
    if (!session?.employeeId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { action } = await req.json();

        if (action === 'set_pending') {
            await setAppTourPendingGoogleAuth(session.employeeId);
            return NextResponse.json({ success: true });
        }

        if (action === 'clear_pending') {
            await clearAppTourPendingGoogleAuth(session.employeeId);
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (e) {
        console.error('App tour route error:', e);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
