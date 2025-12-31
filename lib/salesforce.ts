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
    console.log('Dyanmo data',data)
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
  Email__c?: string;
  Password__c?: string; // Stored hash
  Name: string;
  Contact__r?: {
      FirstName?: string;
      LastName?: string;
      Email?: string;
      Employee_Role__c?: string;
      [key: string]: any;
  }
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
  const result = await conn.query(`SELECT Id, Name , Contact__r.Email, Password__c, Contact__r.Employee_Role__c FROM Employee__c WHERE ${isEmail ? 'Contact__r.Email' : 'Name'} = '${escapedIdentifier}' LIMIT 1`);

  if (result.records.length === 0) return null; 
  return result.records[0] as unknown as Employee;
};

export const getAllEmployees = async (): Promise<any[]> => {
  const conn = await getSalesforceConnection();
  if (!conn) return [];

  const query = `SELECT Id, Joining_Date__c, Base_Salary__c, Status__c, Salary_CTC__c, Profile_Photo__c,Contact__r.Id, Contact__r.FirstName, Contact__r.LastName, Contact__r.Email, Contact__r.Phone, Contact__r.Birthdate, Contact__r.Gender__c, Contact__r.MailingAddress, Contact__r.Emergency_Contact_Name__c, Contact__r.Emergency_Contact_Number__c, Contact__r.Emergency_Contact_Relation__c, Contact__r.Experience__c, Contact__r.Department__c, Contact__r.Employee_Role__c, Contact__r.Employee_Title__c FROM Employee__c`;

  const result = await conn.query(query);
  return result.records;
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


export const getEmployeeById = async (id: string): Promise<any | null> => {
    const conn = await getSalesforceConnection();
    if (!conn) return null;

    // 1. Fetch Employee + Contact Details
    // We select ID and Contact__c to know which contact to update/query if needed, though Contact__r.* gives us the data.
    const empQuery = `
      SELECT Id, Name, Contact__c, Joining_Date__c, Base_Salary__c, Salary_CTC__c, Status__c, Profile_Photo__c, Team_Lead__c, Password__c,
             Contact__r.Id, Contact__r.FirstName, Contact__r.LastName, Contact__r.Email, Contact__r.Phone, Contact__r.Birthdate, 
             Contact__r.Gender__c, Contact__r.MailingAddress, Contact__r.Emergency_Contact_Name__c, 
             Contact__r.Emergency_Contact_Number__c, Contact__r.Emergency_Contact_Relation__c, 
             Contact__r.Experience__c, Contact__r.Department__c, Contact__r.Employee_Role__c, Contact__r.Employee_Title__c
      FROM Employee__c 
      WHERE Id = '${id}'
      LIMIT 1
    `;
    const empResult = await conn.query(empQuery);
    if (empResult.records.length === 0) return null;

    const empRecord: any = empResult.records[0];

    // 2. Fetch Bank Details
    // Assuming 'Bank_Detail__c' has a lookup 'Employee__c'
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
        ...empRecord, // Contains top-level Employee__c fields
        // Flatten Contact__r slightly or keep it nested, frontend expects specific structure
        contact: empRecord.Contact__r,
        bankDetails: bankResult.records,
        documents: docResult.records
    };
};

export const updateEmployee = async (id: string, contactId: string, data: any) => {
    const conn = await getSalesforceConnection();
    if (!conn) throw new Error("No Salesforce connection");

    // Separate records for Employee__c and Contact
    const employeeFields = [
        "Joining_Date__c", "Base_Salary__c", "Salary_CTC__c", "Status__c", "Profile_Photo__c", "Team_Lead__c"
    ];
    const contactFields = [
        "FirstName", "LastName", "Email", "Phone", "Birthdate", "Gender__c", "MailingCity", "MailingStreet", "MailingCountry", "MailingPostalCode", // Address breakdown if needed or MailingAddress composite
        "Emergency_Contact_Name__c", "Emergency_Contact_Number__c", "Emergency_Contact_Relation__c", 
        "Experience__c", "Department__c", "Employee_Role__c", "Employee_Title__c"
    ];

    const empUpdate: any = { Id: id };
    const contactUpdate: any = { Id: contactId };
    let hasEmpUpdate = false;
    let hasContactUpdate = false;

    for (const [key, value] of Object.entries(data)) {
        if (employeeFields.includes(key)) {
            empUpdate[key] = value;
            hasEmpUpdate = true;
        } else if (contactFields.includes(key) || key === 'MailingAddress') { 
             // Address is special, often readonly as composite, need to update individual components if passed, 
             // or if 'data' keys are flat like 'MailingCity'.
             // For now assume data keys match Salesforce API names.
            contactUpdate[key] = value;
            hasContactUpdate = true;
        }
    }

    if (hasEmpUpdate) {
        await conn.sobject("Employee__c").update(empUpdate);
    }
    if (hasContactUpdate) {
        await conn.sobject("Contact").update(contactUpdate);
    }
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
