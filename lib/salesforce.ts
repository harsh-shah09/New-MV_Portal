import { Connection } from 'jsforce';
import { db } from './dynamodb';
import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

let connection: Connection | null = null;

const TABLE_NAME = 'MV_Portal';
const TOKEN_ID = 'Salesforce_Access_token';

// Interface for stored token
interface StoredToken {
  id: string;
  access_token: string;
  instance_url: string;
  updated_time: string;
}

export const getSalesforceConnection = async () => {
  // 1. Return in-memory connection if active
  if (connection) {
      try {
           // Optional: Validate connection is still alive if needed, but usually we trust memory for short lived functions
           // Or we can rely on downstream 401s to retry. 
           // For now, let's keep it simple: if memory, return.
           return connection;
      } catch(e) {
          connection = null;
      }
  }

  // 2. Try to get invalid/expired token logic is handled by "try to use it, if fail, login"
  // But first, let's check DB for an existing token to avoid login spam
  try {
    const getCmd = new GetCommand({
      TableName: TABLE_NAME,
      Key: { id: TOKEN_ID },
    });
    const data = await db.send(getCmd);
    
    if (data.Item) {
      const stored = data.Item as StoredToken;
      // Initialize connection with stored token
      const conn = new Connection({
        instanceUrl: stored.instance_url,
        accessToken: stored.access_token,
        version: '50.0'
      });

      // Verify token validity
      try {
        await conn.identity();
        console.log('Salesforce connection restored from DynamoDB');
        connection = conn;
        return connection;
      } catch (err) {
        console.log('Stored token invalid or expired, refreshing...', err);
        // Token invalid, fall through to login
      }
    }
  } catch (error) {
    console.warn('Failed to fetch token from DynamoDB:', error);
    // Continue to login if DB fails (maybe first run or DB issue)
  }

  // 3. Perform fresh login
  console.log('Initiating new Salesforce login...');
  const conn = new Connection({
    loginUrl: process.env.SALESFORCE_LOGIN_URL || 'https://login.salesforce.com',
    version: '50.0'
  });

  if (!process.env.SALESFORCE_USERNAME || !process.env.SALESFORCE_PASSWORD || !process.env.SALESFORCE_SECURITY_TOKEN) {
    throw new Error('Salesforce credentials (SALESFORCE_USERNAME, SALESFORCE_PASSWORD, SALESFORCE_TOKEN) are missing from environment variables.');
  }

  await conn.login(process.env.SALESFORCE_USERNAME, process.env.SALESFORCE_PASSWORD + process.env.SALESFORCE_SECURITY_TOKEN);

  // 4. Store new token in DynamoDB
  try {
    const putCmd = new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        id: TOKEN_ID,
        access_token: conn.accessToken,
        instance_url: conn.instanceUrl,
        updated_time: new Date().toISOString()
      }
    });
    await db.send(putCmd);
    console.log('Salesforce token updated in DynamoDB');
  } catch (error) {
    console.error('Failed to save token to DynamoDB:', error);
    // Don't fail the request just because caching failed, but log it
  }

  connection = conn;
  return connection;
};

export interface Employee {
  Id: string;
  Employee_ID__c?: string;
  Email__c?: string;
  Password__c?: string; // Stored hash
  Name: string;
}
export interface DashboardData {
    kpiStats: any[],
    recentActivities: any[],
    statsOverview: any[],
}
export const findEmployee = async (identifier: string): Promise<Employee | null> => {
  const conn = await getSalesforceConnection();
  if(!conn) return null;

  // Search by Employee_ID__c OR Email__c
  const isEmail = identifier.includes('@');
  // Be careful with SOQL injection in real apps. 
  const escapedIdentifier = identifier.replace(/'/g, "\\'"); 
  const result = await conn.query(`SELECT Id, Name , Contact__r.Email, Password__c FROM Employee__c WHERE ${isEmail ? 'Contact__r.Email' : 'Name'} = '${escapedIdentifier}' LIMIT 1`);

  if (result.records.length === 0) return null; 
  return result.records[0] as unknown as Employee;
};

export const getDashboardData = async (): Promise<DashboardData> => {
  const conn = await getSalesforceConnection();

  // 1️⃣ Employee totals + department-wise count (single query using WITH ROLLUP)
  const employeeAgg = await conn.query<any>(`SELECT Contact__r.Department__c dept, COUNT(Id) cnt FROM Employee__c GROUP BY ROLLUP(Contact__r.Department__c)`);

  let totalEmployees = 0;

  const departmentItems = employeeAgg.records
    .filter((r: any) => r.dept !== null) // ignore rollup null row in list
    .map((r: any) => ({
      label: r.dept || 'Unassigned',
      value: r.cnt,
      sublabel: 'Employees',
    }));

  // ROLLUP row (grand total) comes where dept == null
  const totalRow = employeeAgg.records.find((r: any) => r.dept == null);
  if (totalRow) {
    totalEmployees = totalRow.cnt;
  }

  // 2️⃣ Active + Pending leaves in a single grouped query
  const leaveAgg = await conn.query<any>(`
    SELECT Status__c status, COUNT(Id) cnt
    FROM Leave__c
    WHERE Status__c IN ('Approved','Applied')
    GROUP BY Status__c
  `);

  let activeLeaves = 0;
  let pendingApprovals = 0;

  leaveAgg.records.forEach((r: any) => {
    if (r.status === 'Approved') activeLeaves = r.cnt;
    if (r.status === 'Applied') pendingApprovals = r.cnt;
  });

  // 3️⃣ Build final object
  return {
    kpiStats: [
      { title: 'Total Employees', value: totalEmployees },
      { title: 'Active Leaves', value: activeLeaves },
      { title: 'Pending Approvals', value: pendingApprovals },
    ],
    statsOverview: [
      {
        title: 'Department Summary',
        items: departmentItems,
      },
    ],
    recentActivities: [],
  };
};
