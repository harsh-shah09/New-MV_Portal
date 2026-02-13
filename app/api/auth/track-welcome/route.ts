
import { NextResponse } from 'next/server';
import { setFirstTimeLogin } from '@/lib/dynamodb';

export async function POST(req: Request) {
    try {
        const { employeeId } = await req.json();
        
        if (!employeeId) {
            return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
        }

        // Mark as first time login = true
        // This flag effectively enables the "Onboarding Wizard" to show up AFTER they log in.
        // The user flow: Email Link -> Welcome Page (Sets Flag) -> Reset Password -> Login -> Dashboard (Wizard shows because Flag is set)
        
        await setFirstTimeLogin(employeeId, true);
        
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Track Welcome Error', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
