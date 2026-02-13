
import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import { getEmployeeById } from '@/lib/salesforce';
import { db } from '@/lib/dynamodb';
import { ScanCommand, DeleteCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

// Helper to check admin role
async function isAdmin(request: Request) {
    const session = await verifySession();
    if (!session || !session.employeeId) return false;
    const employee = await getEmployeeById(session.employeeId);
    return employee && (employee.Role__c === 'Admin' || employee.Role__c === 'HR');
}

export async function GET(req: Request) {
    if (!await isAdmin(req)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Scan for all Google Integrations
        // In a production app with huge data, this Scan is bad. ideally use GSI on SortKey.
        // Assuming small dataset for now as per instructions.
        const command = new ScanCommand({
            TableName: 'MV_Portal',
            FilterExpression: 'SortKey = :sk',
            ExpressionAttributeValues: {
                ':sk': 'GOOGLE_INTEGRATION'
            }
        });

        const result = await db.send(command);
        return NextResponse.json(result.Items || []);

    } catch (error: any) {
        console.error('Fetch Integrations Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    if (!await isAdmin(req)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');

    if (!employeeId) {
        return NextResponse.json({ error: 'Employee ID required' }, { status: 400 });
    }

    try {
        await db.send(new DeleteCommand({
            TableName: 'MV_Portal',
            Key: {
                Employee_Id: employeeId,
                SortKey: 'GOOGLE_INTEGRATION'
            }
        }));

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Delete Integration Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
