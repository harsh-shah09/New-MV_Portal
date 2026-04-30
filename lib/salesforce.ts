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
  Employee_Id__c?: string;
  Employee_Email__c?: string;
  Password__c?: string; // Stored hash
  Employee_Name__c: string; // Replaces Name/FirstName/LastName
  Company_Email__c?: string;
  // New fields directly on Employee__c
  Department__c?: string;
  Role__c?: string;
  Title__c?: string;
  Salary_CTC__c?: number;
  Employee_Address__c?: any; // Compound address field
  Employee_Current_Address__c?: any;
  Experience__c?: number;
  Employee_Phone__c?: string;
  Birthdate__c?: string;
  Emergency_Contact_Name__c?: string;
  Emergency_Contact_Number__c?: string;
  Emergency_Contact_Relation__c?: string;
  Gender__c?: string;
  Is2FAEnabled__c?: boolean;
  Active__c?: boolean;
  Basic_Console__c?: number;
  HRA__c?: number;
  CONV__c?: number;
  S_All__c?: number;
  PF_Basic__c?: number;
  PF__c?: number;
  PT__c?: number;
  ESI__c?: number;
  
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

  // Search by Company_Email__c OR Employee_Id__c
  const isEmail = identifier.includes('@');
  // Be careful with SOQL injection in real apps. 
  const escapedIdentifier = identifier.replace(/'/g, "\\'");
  // Updated query to fetch fields from Employee__c directly
  const query = `
    SELECT Id ,Employee_Id__c, Employee_Name__c, Employee_Email__c,Company_Email__c, Password__c, Role__c, Title__c, Is2FAEnabled__c, Name, Active__c
    FROM Employee__c 
    WHERE ${isEmail ? 'Company_Email__c' : 'Employee_Id__c'} = '${escapedIdentifier}' 
    LIMIT 1
  `;
  console.log(query)
  // Login accepts email or employee ID.
  
  const result = await conn.query(query);

  if (result.records.length === 0) return null; 
  return result.records[0] as unknown as Employee;
};

export const getAllEmployees = async (): Promise<any[]> => {
  const conn = await getSalesforceConnection();
  if (!conn) return [];

  const query = `
    SELECT Id, Name, Joining_Date__c, Status__c, Salary_CTC__c, Profile_Photo__c, Active__c,
           Employee_Name__c, Employee_Email__c, Employee_Phone__c, Birthdate__c, Gender__c, 
           Employee_Address__c , Employee_Current_Address__c,
           Emergency_Contact_Name__c, Emergency_Contact_Number__c, Emergency_Contact_Relation__c, 
           Experience__c, Department__c, Role__c, Title__c, Employee_ID__c, Company_Email__c, Technology__c, Enrollment_Number__c
    FROM Employee__c
  `;

  const result = await conn.query(query);
  return result.records;
};

export const getEmployeesByTeamLead = async (teamLeadId: string): Promise<any[]> => {
  const conn = await getSalesforceConnection();
  if (!conn) return [];

  const escapedId = teamLeadId.replace(/'/g, "\\'");
  const query = `
    SELECT Id, Employee_Name__c, Team_Lead__c, Employee_Email__c
    FROM Employee__c
    WHERE Team_Lead__c = '${escapedId}'
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
           SELECT Id, Name,Employee_Id__c , Employee_Name__c, Employee_Email__c, Joining_Date__c, Onboarding_Date__c, Basic_Console__c, HRA__c, CONV__c, S_All__c, PF_Basic__c, PF__c, PT__c, ESI__c, Salary_CTC__c, Status__c, Active__c, Profile_Photo__c, Team_Lead__c, Password__c, Is2FAEnabled__c,
             Employee_Phone__c, Birthdate__c, Gender__c, Employee_Address__c, Employee_Current_Address__c,
             Emergency_Contact_Name__c, Emergency_Contact_Number__c, Emergency_Contact_Relation__c, 
             Experience__c, Department__c, Role__c, Title__c, Company_Email__c, Technology__c, Enrollment_Number__c
      FROM Employee__c 
      WHERE Id = '${id}'
      LIMIT 1
    `;
    const empResult = await conn.query(empQuery);
    if (empResult.records.length === 0) return null;

    const empRecord: any = empResult.records[0];

    // 2. Fetch Bank Details
    const bankQuery = `
      SELECT Id, Name, Bank_Branch_Name__c, Bank_Account_Number__c, IFSC__c, Primary_Account__c, Status__c
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

    // 4. Fetch Asset Assignment History (Current & Past)
    const historyQuery = `
      SELECT Id, AMS_Assigned_Date__c, AMS_Returned_Date__c, 
             AMS_Asset__r.Name, AMS_Asset__r.AMS_Asset_Serial_Number__c, 
             AMS_Asset__r.AMS_Product__r.Name, AMS_Asset__r.AMS_Product__r.AMS_Category__c, 
             AMS_Asset__r.AMS_Status__c, AMS_Asset__r.AMS_Warranty_Expiry_Date__c
      FROM AMS_Asset_Assignment_History__c
      WHERE AMS_Assigned_Person__c = '${id}'
      ORDER BY AMS_Assigned_Date__c DESC
    `;
    const historyResult = await conn.query(historyQuery);

    // Map to a clean structure
    return {
        ...empRecord, 
        // No more separate contact object, everything is on top level
        bankDetails: bankResult.records,
        documents: docResult.records,
        assetHistory: historyResult.records
    };
};

export const updateEmployee = async (id: string, data: any) => {
    const conn = await getSalesforceConnection();
    if (!conn) throw new Error("No Salesforce connection");
    const updateData: any = { Id: id, ...data };
    console.log('Updated data',updateData)
    delete updateData.contactId;

    await conn.sobject("Employee__c").update(updateData);
};

export const createDocumentRecord = async (docData: any) => {
    const conn = await getSalesforceConnection();
    if (!conn) throw new Error("No Salesforce connection");
    return await conn.sobject("Document__c").create(docData);
};

/**
 * Upsert a document record for onboarding.
 * If a Document__c record already exists for this employee with the same
 * Document_Type__c, update it in-place (new file URL, reset status).
 * Otherwise create a new record.
 * This prevents duplicate rows when a user re-uploads the same document type.
 */
export const upsertDocumentRecord = async (docData: {
    Name: string;
    Document_Type__c: string;
    File_URL__c: string;
    Status__c: string;
    Employee__c: string;
}) => {
    const conn = await getSalesforceConnection();
    if (!conn) throw new Error("No Salesforce connection");

    const { Employee__c, Document_Type__c } = docData;

    // Check for an existing record of the same type for this employee
    const existingQuery = `
      SELECT Id
      FROM Document__c
      WHERE Employee__c = '${Employee__c}'
        AND Document_Type__c = '${Document_Type__c}'
      LIMIT 1
    `;
    const existingResult = await conn.query(existingQuery);

    if (existingResult.records.length > 0) {
        const existingId = (existingResult.records[0] as any).Id;
        // Update the existing record with the new file info
        return await conn.sobject("Document__c").update({
            Id: existingId,
            Name: docData.Name,
            File_URL__c: docData.File_URL__c,
            Status__c: docData.Status__c,
        });
    } else {
        // No existing record – create a fresh one
        return await conn.sobject("Document__c").create(docData);
    }
};

export const createBankDetail = async (bankData: any) => {
    const conn = await getSalesforceConnection();
    if (!conn) throw new Error("No Salesforce connection");

  if (bankData?.Primary_Account__c === true && bankData?.Employee__c) {
    const existingPrimaryQuery = `
      SELECT Id
      FROM Bank_Detail__c
      WHERE Employee__c = '${bankData.Employee__c}' AND Primary_Account__c = true
    `;

    const existingPrimaryResult = await conn.query(existingPrimaryQuery);

    if (existingPrimaryResult.records.length > 0) {
      const updates = existingPrimaryResult.records.map((record: any) => ({
        Id: record.Id,
        Primary_Account__c: false
      }));

      await conn.sobject("Bank_Detail__c").update(updates);
    }
  }

    return await conn.sobject("Bank_Detail__c").create(bankData);
};

/**
 * Upsert bank detail for onboarding: if a bank record already exists for this
 * employee, update it in-place. Otherwise create a new one.
 * This prevents duplicate records when 'Next' is pressed multiple times.
 */
export const upsertBankDetail = async (bankData: any) => {
    const conn = await getSalesforceConnection();
    if (!conn) throw new Error("No Salesforce connection");

    const employeeId = bankData?.Employee__c;
    if (!employeeId) return await conn.sobject("Bank_Detail__c").create(bankData);

    // Check if a bank record already exists for this employee
    const existingQuery = `
      SELECT Id
      FROM Bank_Detail__c
      WHERE Employee__c = '${employeeId}'
      LIMIT 1
    `;
    const existingResult = await conn.query(existingQuery);

    if (existingResult.records.length > 0) {
        const existingId = (existingResult.records[0] as any).Id;
        // Update existing record
        return await conn.sobject("Bank_Detail__c").update({
            Id: existingId,
            Name: bankData.Name,
            Bank_Branch_Name__c: bankData.Bank_Branch_Name__c,
            Bank_Account_Number__c: bankData.Bank_Account_Number__c,
            IFSC__c: bankData.IFSC__c,
            Primary_Account__c: bankData.Primary_Account__c,
            Status__c : bankData.Status__c
        });
    } else {
        // No record yet – create new
        return await conn.sobject("Bank_Detail__c").create(bankData);
    }
};


export const updateBankDetail = async (bankData: any) => {
    const conn = await getSalesforceConnection();
    if (!conn) throw new Error("No Salesforce connection");

    if (bankData?.Primary_Account__c === true && bankData?.Employee__c && bankData?.Id) {
      const existingPrimaryQuery = `
        SELECT Id
        FROM Bank_Detail__c
        WHERE Employee__c = '${bankData.Employee__c}'
          AND Primary_Account__c = true
          AND Id != '${bankData.Id}'
      `;

      const existingPrimaryResult = await conn.query(existingPrimaryQuery);

      if (existingPrimaryResult.records.length > 0) {
        const updates = existingPrimaryResult.records.map((record: any) => ({
          Id: record.Id,
          Primary_Account__c: false
        }));

        await conn.sobject("Bank_Detail__c").update(updates);
      }
    }

    return await conn.sobject("Bank_Detail__c").update(bankData);
};

export const deleteBankDetail = async (bankId: string) => {
    const conn = await getSalesforceConnection();
    if (!conn) throw new Error("No Salesforce connection");
    return await conn.sobject("Bank_Detail__c").destroy(bankId);
};

// --- Notifications ---

export const createNotification = async (notifData: any) => {
    const conn = await getSalesforceConnection();
    if (!conn) throw new Error("No Salesforce connection");
    return await conn.sobject("MV_Notification__c").create(notifData);
}

/**
 * Helper function to send in-app notifications to multiple recipients
 * @param recipients - Array of employee IDs to notify
 * @param message - Notification message
 * @param type - Type of notification (Leave, Payroll, etc.)
 * @param actionRequired - Whether action is required from recipient
 */
export const sendInAppNotifications = async (
    recipients: string[],
    message: string,
    type: string = 'General',
    actionRequired: boolean = false
) => {
    try {
        const conn = await getSalesforceConnection();
        if (!conn) {
            console.error("No Salesforce connection for sending notifications");
            return;
        }

        // Filter out null/undefined recipients
        const validRecipients = recipients.filter(r => r);
        
        if (validRecipients.length === 0) {
            console.warn("No valid recipients for notification");
            return;
        }

        const notifications = validRecipients.map(employeeId => ({
            Employee__c: employeeId,
            Message__c: message,
            Notification_Type__c: type,
            Action_Required__c: actionRequired,
            Is_Read__c: false,
            Status__c: 'Unread'
        }));

        await conn.sobject("MV_Notification__c").create(notifications);
        console.log(`✓ In-app notifications sent to ${validRecipients.length} recipient(s)`);
    } catch (error) {
        console.error('Error sending in-app notifications:', error);
        // Don't throw error to prevent breaking the main flow
    }
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

export const getPendingDocuments = async (reviewerRole?: string) => {
    const conn = await getSalesforceConnection();
    if (!conn) throw new Error("No Salesforce connection");
    // Fetch pending and uploaded documents and include related Employee Name
    const query = `
      SELECT Id, Name, Document_Type__c, Document_Category__c, File_URL__c, Status__c, CreatedDate,
       Employee__c, Employee__r.Employee_Name__c, Employee__r.Role__c
      FROM Document__c
      WHERE Status__c IN ('Pending', 'Uploaded')
      ORDER BY CreatedDate DESC
    `;
    const result = await conn.query(query);

  const docs = result.records as any[];

  if (!reviewerRole) return docs;

  // Verification rule:
  // - HR verifies uploaded docs for non-HR employees
  // - Admin verifies uploaded docs for HR employees
  if (reviewerRole === 'HR') {
    return docs.filter((doc: any) =>
      doc.Status__c === 'Uploaded' && (doc.Employee__r?.Role__c || '') !== 'HR'
    );
  }

  if (reviewerRole === 'Admin') {
    return docs.filter((doc: any) =>
      doc.Status__c === 'Uploaded' && (doc.Employee__r?.Role__c || '') === 'HR'
    );
  }

  return [];
}

export const updateDocument = async (docData: any) => {
    const conn = await getSalesforceConnection();
    if (!conn) throw new Error("No Salesforce connection");
    return await conn.sobject("Document__c").update(docData);
}

export const deleteDocument = async (docId: string) => {
    const conn = await getSalesforceConnection();
    if (!conn) throw new Error("No Salesforce connection");
    return await conn.sobject("Document__c").destroy(docId);
}

export const getHandbookDocuments = async () => {
    const conn = await getSalesforceConnection();
    if (!conn) throw new Error("No Salesforce connection");
    
    // Fetch documents with Category 'Handbook'
    const query = `
      SELECT Id, Name, Document_Type__c, Document_Category__c, File_URL__c, Status__c, CreatedDate
      FROM Document__c
      WHERE Document_Category__c = 'Handbook'
      ORDER BY CreatedDate DESC
    `;
    const result = await conn.query(query);
    return result.records;
}

export const getNotifications = async (employeeId: string) => {
    const conn = await getSalesforceConnection();
    if (!conn) throw new Error("No Salesforce connection");
    
    const query = `
      SELECT Id, Employee__c, Message__c, Status__c, Notification_Type__c, Is_Read__c, CreatedDate
      FROM MV_Notification__c
      WHERE Employee__c = '${employeeId}'
      ORDER BY CreatedDate DESC
      LIMIT 100
    `;
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

export interface SalaryHistoryRecord {
  Id?: string;
  Employee__c: string;
  Current_Salary__c: number;
  Previous_Salary__c: number;
  Security_Deposite__c?: number;
  Basic_Console__c?: number;
  CONV__c?: number;
  ESI__c?: number;
  HRA__c?: number;
  PF__c?: number;
  PT__c?: number;
  SP_All__c?: number;
  Increment_Amount__c: number;
  Increment_Percent__c: number;
  Effective_Date__c: string;
  End_Date__c?: string | null;
  Is_Current__c?: boolean;
  Change_Type__c?: string;
  Description__c?: string;
  CreatedDate?: string;
}

export const getSalaryHistoryByEmployee = async (employeeId: string): Promise<SalaryHistoryRecord[]> => {
    const conn = await getSalesforceConnection();
    if (!conn) throw new Error("No Salesforce connection");

    const query = `
      SELECT Id, Employee__c, Current_Salary__c, Previous_Salary__c, Security_Deposite__c, Basic_Console__c, CONV__c, ESI__c, HRA__c, PF__c, PT__c, SP_All__c, Increment_Amount__c, Increment_Percent__c,
             Effective_Date__c, End_Date__c, Is_Current__c, Change_Type__c, Description__c, CreatedDate
      FROM Salary_History_Tracking__c
      WHERE Employee__c = '${employeeId}'
      ORDER BY Effective_Date__c DESC
    `;

    const result = await conn.query<SalaryHistoryRecord>(query);
    return result.records;
}

export const createSalaryHistoryRecord = async (record: SalaryHistoryRecord) => {
    const conn = await getSalesforceConnection();
    if (!conn) throw new Error("No Salesforce connection");
    return await conn.sobject("Salary_History_Tracking__c").create(record);
}

export async function getSalaryHistoryChangeTypeOptions(): Promise<Array<{ label: string; value: string }>> {
    const conn = await getSalesforceConnection();
    if (!conn) throw new Error("No Salesforce connection");

    const describe = await conn.sobject('Salary_History_Tracking__c').describe() as {
      fields?: Array<{ name: string; picklistValues?: Array<{ active: boolean; value: string; label: string }> }>;
    };

    const changeTypeField = describe.fields?.find((field) => field.name === 'Change_Type__c');
    if (!changeTypeField?.picklistValues) return [];

    return changeTypeField.picklistValues
      .filter((option) => option.active)
      .map((option) => ({
        label: option.label,
        value: option.value
      }));
}
