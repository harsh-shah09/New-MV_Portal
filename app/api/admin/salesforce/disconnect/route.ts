import { NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { revokeAllSessionsGlobal } from '@/lib/dynamodb';

const client = new DynamoDBClient({
    region: process.env.AWS_REGION || 'ap-south-1',
});
const docClient = DynamoDBDocumentClient.from(client);

export async function POST() {
    try {
        await docClient.send(new PutCommand({
            TableName: 'MV_Portal',
            Item: {
                Employee_Id: 'Salesforce_Credentials',
                SortKey: 'CREDENTIALS',
                username: '',
                password: '',
                security_token: '',
                login_url: 'https://login.salesforce.com'
            }
        }));

        await revokeAllSessionsGlobal();

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error disconnecting Salesforce:', error);
        return NextResponse.json({ error: 'Failed to disconnect Salesforce' }, { status: 500 });
    }
}
