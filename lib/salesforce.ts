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
      Key: {
          Employee_Id: TOKEN_ID,
          SortKey: "TOKEN"
        }
    });
    const data = await db.send(getCmd);
    // console.log('Dyanmo data',data)
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
      Employee_Id: TOKEN_ID,
      SortKey: "TOKEN",
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
  Employee_Email__c?: string;
  Password__c?: string; // Stored hash
  Employee_Name__c: string; // Replaces Name/FirstName/LastName
  
  // New fields directly on Employee__c
  Department__c?: string;
  Role__c?: string;
  Title__c?: string;
  Employee_Address__c?: any; // Compound address field
  Experience__c?: number;
  Employee_Phone__c?: string;
  Birthdate__c?: string;
  Emergency_Contact_Name__c?: string;
  Emergency_Contact_Number__c?: string;
  Emergency_Contact_Relation__c?: string;
  Gender__c?: string;
  Is2FAEnabled__c?: boolean;
  Active__c?: boolean;
  
  // Standard fields
  Name?: string; // Standard name field often exists, but we rely on Employee_Name__c
}

export interface DashboardData {
    kpiStats: any[],
    recentActivities: any[],
    statsOverview: any[],
}

export const findEmployee = async (identifier: string): Promise<Employee | null> => {
  const conn = await getSalesforceConnection();
  if(!conn) return null;

  // Search by Employee_ID__c OR Employee_Email__c
  const isEmail = identifier.includes('@');
  // Be careful with SOQL injection in real apps. 
  const escapedIdentifier = identifier.replace(/'/g, "\\'");
  // Updated query to fetch fields from Employee__c directly
  const query = `
    SELECT Id, Employee_Name__c, Employee_Email__c, Password__c, Role__c, Title__c, Is2FAEnabled__c, Name, Active__c
    FROM Employee__c 
    WHERE ${isEmail ? 'Employee_Email__c' : 'Employee_Id__c'} = '${escapedIdentifier}' 
    LIMIT 1
  `;
  console.log(query)
  // Note: Searching by 'Name' standard field might still be safer if Employee_Name__c isn't unique or standardized for login. 
  // But user said "Employee_Name__c ... use this only". I'll try to match user intent. 
  // If login fails, user might need to adjust valid identifiers.
  
  const result = await conn.query(query);

  if (result.records.length === 0) return null; 
  return result.records[0] as unknown as Employee;
};

export const getAllEmployees = async (): Promise<any[]> => {
  const conn = await getSalesforceConnection();
  if (!conn) return [];

  const query = `
    SELECT Id, Joining_Date__c, Base_Salary__c, Status__c, Salary_CTC__c, Profile_Photo__c, Active__c,
           Employee_Name__c, Employee_Email__c, Employee_Phone__c, Birthdate__c, Gender__c, 
           Employee_Address__c,
           Emergency_Contact_Name__c, Emergency_Contact_Number__c, Emergency_Contact_Relation__c, 
           Experience__c, Department__c, Role__c, Title__c, Employee_ID__c
    FROM Employee__c
  `;

  const result = await conn.query(query);
  return result.records;
};

export const getDashboardData = async (): Promise<DashboardData> => {
  const conn = await getSalesforceConnection();

  // 1️⃣ Employee totals + department-wise count (single query using WITH ROLLUP)
  // Updated group by Department__c on Employee__c
  // const employeeAgg = await conn.query<any>(`SELECT Department__c dept, COUNT(Id) cnt FROM Employee__c GROUP BY ROLLUP(Department__c)`);
  const employeeAgg = { records : []}
  let totalEmployees = 0;

  // Mock budget distribution
  const getRandomBudget = (employees: number) => {
     const base = employees * 50000; // $50k per employee
     const variance = Math.floor(Math.random() * 20000);
     return base + variance;
  };

  const departmentItems = employeeAgg.records
    .filter((r: any) => r.dept !== null) // ignore rollup null row in list
    .map((r: any) => ({
      label: r.dept || 'Unassigned',
      value: r.cnt,
      sublabel: 'Employees',
      budget: getRandomBudget(r.cnt)
    }));

  // ROLLUP row (grand total) comes where dept == null
  const totalRow = employeeAgg.records.find((r: any) => r.dept == null);
  if (totalRow) {
    totalEmployees = totalRow || 0;
  }

  // 2️⃣ Active + Pending leaves snapshot
  // const leaveAgg = await conn.query<any>(`
  //   SELECT Status__c status, COUNT(Id) cnt
  //   FROM Leave__c
  //   WHERE Status__c IN ('Approved','Applied')
  //   GROUP BY Status__c
  // `);
  const leaveAgg = {records:[]}
  let activeLeaves = 0;
  let pendingApprovals = 0;

  leaveAgg.records.forEach((r: any) => {
    if (r.status === 'Approved') activeLeaves = r.cnt;
    if (r.status === 'Applied') pendingApprovals = r.cnt;
  });

  // 3️⃣ Leave Request Trends
  // const leaveTrendQuery = `
  //   SELECT CreatedDate, Status__c 
  //   FROM Leave__c 
  //   WHERE CreatedDate = THIS_YEAR
  //   ORDER BY CreatedDate ASC
  // `;
  // const leaveTrendsRaw = await conn.query<any>(leaveTrendQuery);
  
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const trendsMap = new Map<string, { month: string, approved: number, pending: number, rejected: number }>();
  
  // Initialize current year months
  monthNames.forEach(m => trendsMap.set(m, { month: m, approved: 0, pending: 0, rejected: 0 }));

  // leaveTrendsRaw.records.forEach((r: any) => {
  //     const date = new Date(r.CreatedDate);
  //     const month = monthNames[date.getMonth()];
  //     const stat = trendsMap.get(month);
  //     if (stat) {
  //         if (r.Status__c === 'Approved') stat.approved++;
  //         else if (r.Status__c === 'Applied' || r.Status__c === 'Pending') stat.pending++;
  //         else if (r.Status__c === 'Rejected') stat.rejected++;
  //     }
  // });
  
  const currentMonthIndex = new Date().getMonth();
  const leaveTrends = Array.from(trendsMap.values()).slice(0, currentMonthIndex + 1);


  // 4️⃣ Recent Activities (Last 5 leaves)
  const recentLeavesQuery = `
    SELECT Employee__r.Employee_Name__c, Status__c, CreatedDate 
    FROM Leave__c 
    ORDER BY CreatedDate DESC 
    LIMIT 5
  `;
  // const recentLeaves = await conn.query<any>(recentLeavesQuery);
  const recentLeaves = {records:[]}
  const recentActivities = recentLeaves.records.map((r: any) => ({
      title: `${r.Employee__r?.Employee_Name__c || 'Employee'} - ${r.Status__c}`,
      value: new Date(r.CreatedDate).toLocaleDateString(),
      icon: 'Activity',
      color: r.Status__c === 'Approved' ? 'green' : (r.Status__c === 'Rejected' ? 'red' : 'amber')
  }));

  // 5️⃣ Build final object
  return {
    kpiStats: [
      { title: 'Total Employees', value: totalEmployees, icon: 'Users', color: 'blue', trend: 0 },
      { title: 'Active Leaves', value: activeLeaves, icon: 'Calendar', color: 'green', trend: 0 },
      { title: 'Pending Approvals', value: pendingApprovals, icon: 'Clock', color: 'amber' },
    ],
    statsOverview: [
      {
        title: 'Department Summary',
        items: departmentItems,
      },
      {
          title: 'Leave Trends',
          items: leaveTrends
      }
    ],
    recentActivities: recentActivities,
  };
};


export const getEmployeeById = async (id: string): Promise<any | null> => {
    const conn = await getSalesforceConnection();
    if (!conn) return null;

    // 1. Fetch Employee Details (All component fields directly)
    const empQuery = `
      SELECT Id, Employee_Id__c , Employee_Name__c, Employee_Email__c, Joining_Date__c, Base_Salary__c, Salary_CTC__c, Status__c, Profile_Photo__c, Team_Lead__c, Password__c, Is2FAEnabled__c,
             Employee_Phone__c, Birthdate__c, Gender__c, Employee_Address__c, 
             Emergency_Contact_Name__c, Emergency_Contact_Number__c, Emergency_Contact_Relation__c, 
             Experience__c, Department__c, Role__c, Title__c
      FROM Employee__c 
      WHERE Id = '${id}'
      LIMIT 1
    `;
    const empResult = await conn.query(empQuery);
    if (empResult.records.length === 0) return null;

    const empRecord: any = empResult.records[0];

    // 2. Fetch Bank Details
    const bankQuery = `
      SELECT Id, Name, Bank_Branch_Name__c, Bank_Account_Number__c, IFSC__c, Primary_Account__c
      FROM Bank_Detail__c
      WHERE Employee__c = '${id}'
    `;
    const bankResult = await conn.query(bankQuery);

    // 3. Fetch Documents
    const docQuery = `
      SELECT Id, Document_Type__c, Document_Category__c, File_URL__c, Status__c
      FROM Document__c
      WHERE Employee__c = '${id}'
    `;
    const docResult = await conn.query(docQuery);

    // Map to a clean structure
    return {
        ...empRecord, 
        // No more separate contact object, everything is on top level
        bankDetails: bankResult.records,
        documents: docResult.records
    };
};

export const updateEmployee = async (id: string, data: any) => {
    const conn = await getSalesforceConnection();
    if (!conn) throw new Error("No Salesforce connection");

    // All fields are on Employee__c now.
    // We can just filter out fields that are NOT part of the object if we want to be safe, 
    // or assume 'data' contains valid keys.
    // Excluding nested objects or read-only if any.
    
    // Safety: ensure Id is set
    const updateData: any = { Id: id, ...data };
    console.log('Updated data',updateData)
    // Remove "contactId" if it was passed by legacy code
    delete updateData.contactId;

    await conn.sobject("Employee__c").update(updateData);
};

export const createDocumentRecord = async (docData: any) => {
    const conn = await getSalesforceConnection();
    if (!conn) throw new Error("No Salesforce connection");
    return await conn.sobject("Document__c").create(docData);
};

export const createBankDetail = async (bankData: any) => {
    const conn = await getSalesforceConnection();
    if (!conn) throw new Error("No Salesforce connection");
    return await conn.sobject("Bank_Detail__c").create(bankData);
};


export const updateBankDetail = async (bankData: any) => {
    const conn = await getSalesforceConnection();
    if (!conn) throw new Error("No Salesforce connection");
    return await conn.sobject("Bank_Detail__c").update(bankData);
};

// --- Notifications ---

export const createNotification = async (notifData: any) => {
    const conn = await getSalesforceConnection();
    if (!conn) throw new Error("No Salesforce connection");
    return await conn.sobject("MV_Notification__c").create(notifData);
}

// --- Documents ---

export const getDocumentsByEmployee = async (employeeId: string) => {
    const conn = await getSalesforceConnection();
    if (!conn) throw new Error("No Salesforce connection");
    const query = `
      SELECT Id, Name, Document_Type__c, Document_Category__c, File_URL__c, Status__c, CreatedDate
      FROM Document__c
      WHERE Employee__c = '${employeeId}'
      ORDER BY CreatedDate DESC
    `;
    const result = await conn.query(query);
    return result.records;
}

export const getPendingDocuments = async () => {
    const conn = await getSalesforceConnection();
    if (!conn) throw new Error("No Salesforce connection");
    // Fetch pending and uploaded documents and include related Employee Name
    const query = `
      SELECT Id, Name, Document_Type__c, Document_Category__c, File_URL__c, Status__c, CreatedDate,
             Employee__c, Employee__r.Employee_Name__c
      FROM Document__c
      WHERE Status__c IN ('Pending', 'Uploaded')
      ORDER BY CreatedDate DESC
    `;
    const result = await conn.query(query);
    return result.records;
}

export const updateDocument = async (docData: any) => {
    const conn = await getSalesforceConnection();
    if (!conn) throw new Error("No Salesforce connection");
    return await conn.sobject("Document__c").update(docData);
}

export const getNotifications = async (employeeId: string) => {
    const conn = await getSalesforceConnection();
    if (!conn) throw new Error("No Salesforce connection");
    
    const query = `
      SELECT Id, Name, Message__c, Action_Required__c, Status__c, Notification_Type__c, CreatedDate, Is_Read__c,
             Employee__c
      FROM MV_Notification__c
      WHERE Employee__c = '${employeeId}'
      ORDER BY CreatedDate DESC
      LIMIT 100
    `;
    // console.log(query)
    const result = await conn.query(query);
    return result.records;
}


export const updateEmployee2FAStatus = async (id: string, enabled: boolean) => {
    const conn = await getSalesforceConnection();
    if (!conn) throw new Error("No Salesforce connection");
    
    await conn.sobject("Employee__c").update({
        Id: id,
        Is2FAEnabled__c: enabled
    });
};

export const saveTwoFactorSecret = async (employeeId: string, secret: string) => {
    const putCmd = new PutCommand({
        TableName: TABLE_NAME,
        Item: {
            Employee_Id: employeeId,
            SortKey: "2FA_SECRET",
            Secret: secret,
            updated_time: new Date().toISOString()
        }
    });
    await db.send(putCmd);
};

export const getTwoFactorSecret = async (employeeId: string) => {
    const getCmd = new GetCommand({
        TableName: TABLE_NAME,
        Key: {
            Employee_Id: employeeId,
            SortKey: "2FA_SECRET"
        }
    });
    const result = await db.send(getCmd);
    return result.Item?.Secret;
};

export const addTrustedDevice = async (employeeId: string, deviceId: string) => {
    const putCmd = new PutCommand({
        TableName: TABLE_NAME,
        Item: {
            Employee_Id: employeeId,
            SortKey: `TRUSTED_DEVICE#${deviceId}`,
            Trusted: true,
            updated_time: new Date().toISOString()
        }
    });
    await db.send(putCmd);
};

export const isTrustedDevice = async (employeeId: string, deviceId: string) => {
    const getCmd = new GetCommand({
        TableName: TABLE_NAME,
        Key: {
            Employee_Id: employeeId,
            SortKey: `TRUSTED_DEVICE#${deviceId}`
        }
    });
    const result = await db.send(getCmd);
    return !!result.Item;
};
