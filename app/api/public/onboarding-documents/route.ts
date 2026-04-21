import { NextResponse } from 'next/server';
import { getSpecificConfigurations } from '@/lib/admin-config';

/**
 * GET /api/public/onboarding-documents?id=<employeeId>
 *
 * Returns the comma-separated Common_Documents value from the Documents
 * Configuration metadata as a string[] so public-mode onboarding can render
 * the same upload list as the internal wizard.
 */
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('id');

    if (!employeeId) {
        return NextResponse.json({ error: 'Missing employee id' }, { status: 400 });
    }

    try {
        const configs = await getSpecificConfigurations(['documents']);
        let docs: string[] = [];

        if (configs.documents && configs.documents.length > 0) {
            const firstRecord = configs.documents[0];
            if (firstRecord?.Value__c) {
                docs = firstRecord.Value__c
                    .split(',')
                    .map((s: string) => s.trim())
                    .filter(Boolean);
            }
        }

        // Fallback to sensible defaults if nothing configured
        if (docs.length === 0) {
            docs = ['Aadhaar Card', 'PAN Card', 'Driving Licence', 'Degree/Marksheet(Latest)'];
        }

        return NextResponse.json({ documents: docs });
    } catch (e) {
        console.error('Failed to fetch documents config for public onboarding:', e);
        // Return safe defaults so onboarding doesn't break
        return NextResponse.json({
            documents: ['Aadhaar Card', 'PAN Card', 'Driving Licence', 'Degree/Marksheet(Latest)']
        });
    }
}
