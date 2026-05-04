"use server"

import { getSalesforceConnection } from "@/lib/salesforce";
import { SalesforceAsset, AssignmentHistory, AssetConfiguration, SalesforceProduct } from "./types";

// --- Helpers ---

export async function getAssetConfig(): Promise<AssetConfiguration> {
  const conn = await getSalesforceConnection();
  if (!conn) return { Bypass_Validation__c: 'No' };

  try {
    const query = `SELECT Id, DeveloperName, MasterLabel, Bypass_Validation__c FROM Asset_Configuration__mdt LIMIT 1`;
    const result = await conn.query(query);
    if (result.records.length > 0) {
      return result.records[0] as unknown as AssetConfiguration;
    }
  } catch (e) {
    console.warn("Could not fetch Asset Configuration, using default (No bypass)", e);
  }
  return { Bypass_Validation__c: 'No' };
}

export async function updateAssetConfig(bypass: boolean) {
  const conn = await getSalesforceConnection();
  if (!conn) throw new Error("Salesforce connection failed");

  const currentConfig = await getAssetConfig();
  if (!currentConfig.DeveloperName) {
      // If no config exists, we can't update it. 
      // In a real scenario, we might try to CREATE one, but CMDT records are metadata.
      // This usually means the org doesn't have the record deployed.
      throw new Error("Could not find existing Asset Configuration record to update. Please ensure 'Asset_Configuration__mdt' has at least one record.");
  }

  const fullName = `Asset_Configuration.${currentConfig.DeveloperName}`;

  try {
      // @ts-ignore
      const result = await conn.metadata.update('CustomMetadata', [{
          fullName: fullName,
          label: currentConfig.MasterLabel || currentConfig.DeveloperName,
          values: {
              Bypass_Validation__c: bypass ? 'Yes' : 'No'
          }
      }]);
      
      if (result && (result as any).success === false) {
           const err = (result as any).errors ? JSON.stringify((result as any).errors) : 'Unknown error';
           throw new Error("Metadata update failed: " + err);
      }
      
      if (Array.isArray(result) && result[0] && !result[0].success) {
           throw new Error("Metadata update failed: " + JSON.stringify(result[0].errors));
      }

      return { success: true };
  } catch (e: any) {
      console.error("Failed to update Asset Configuration", e);
      throw new Error("Failed to update configuration: " + e.message);
  }
}

// --- Fetch Actions ---

export async function getAssets() {
  const conn = await getSalesforceConnection();
  if (!conn) throw new Error("Salesforce connection failed");

  const query = `
    SELECT Id, Name, AMS_Category__c, AMS_Purchase_Date__c, AMS_Warranty_Expiry_Date__c,
           AMS_Asset_Serial_Number__c, AMS_Purchase_Condition__c, AMS_Status__c,
           AMS_Status_Formula__c,
           AMS_Product__c, AMS_Product__r.Name, 
           AMS_Assigned_To__c, AMS_Assigned_To__r.Name, AMS_Assigned_To__r.Employee_Name__c
    FROM MVC_Internal_Asset__c
    ORDER BY Name DESC
  `;
  
  const result = await conn.query(query);
  return result.records as unknown as SalesforceAsset[];
}

export async function getAssetById(id: string) {
  const conn = await getSalesforceConnection();
  if (!conn) throw new Error("Salesforce connection failed");

  const query = `
    SELECT Id, Name, AMS_Category__c, AMS_Purchase_Date__c, AMS_Warranty_Expiry_Date__c,
           AMS_Asset_Serial_Number__c, AMS_Purchase_Condition__c, AMS_Status__c,
           AMS_Status_Formula__c,
           AMS_Product__c, AMS_Product__r.Name, AMS_Product__r.AMS_Model_Number__c,
           AMS_Assigned_To__c, AMS_Assigned_To__r.Name, AMS_Assigned_To__r.Employee_Name__c
    FROM MVC_Internal_Asset__c
    WHERE Id = '${id}'
    LIMIT 1
  `;
  
  const result = await conn.query(query);
  if (result.records.length === 0) return null;
  
  const asset = result.records[0] as unknown as SalesforceAsset;

  const historyQuery = `
    SELECT Id, Name, AMS_Assigned_Person__c, AMS_Assigned_Person__r.Name, AMS_Assigned_Person__r.Employee_Name__c,
           AMS_Assigned_Date__c, AMS_Returned_Date__c, AMS_Condition_on_Assignment__c,
           AMS_Condition_on_Return__c, AMS_Remark__c, AMS_Assignment_Status__c
    FROM AMS_Asset_Assignment_History__c
    WHERE AMS_Asset__c = '${id}'
    ORDER BY AMS_Assigned_Date__c DESC
  `;
  
  const historyResult = await conn.query(historyQuery);
  
  return {
    asset,
    history: historyResult.records as unknown as AssignmentHistory[]
  };
}

export async function getProducts() {
  const conn = await getSalesforceConnection();
  if (!conn) throw new Error("Salesforce connection failed");
  
  const query = `
    SELECT Id, Name, AMS_Category__c, AMS_Model_Number__c, AMS_Specifications__c, AMS_Description__c , IsActive
    FROM Product2
    WHERE IsActive = true
  `;
  const result = await conn.query(query);
  return result.records as unknown as SalesforceProduct[];
}

export async function getProductById(id: string) {
  const conn = await getSalesforceConnection();
  if (!conn) throw new Error("Salesforce connection failed");
  
  const query = `
    SELECT Id, Name, AMS_Category__c, AMS_Model_Number__c, AMS_Specifications__c, AMS_Description__c, IsActive
    FROM Product2
    WHERE Id = '${id}'
    LIMIT 1
  `;
  const result = await conn.query(query);
  if (result.records.length === 0) return null;
  return result.records[0] as unknown as SalesforceProduct;
}
export async function getProductCategories() {
  const conn = await getSalesforceConnection();
  if (!conn) throw new Error("Salesforce connection failed");
  
  try {
      const describe = await conn.describe('Product2');
      const categoryField = describe.fields.find(f => f.name === 'AMS_Category__c');
      if (categoryField && categoryField.picklistValues) {
          return categoryField.picklistValues.filter(v => v.active).map(v => ({ label: v.label, value: v.value }));
      }
      return [];
  } catch (e) {
      console.warn("Failed to fetch Product2 describe information", e);
      return [];
  }
}

export async function getAllEmployeesForSelect() {
    const conn = await getSalesforceConnection();
    if (!conn) return [];
  
    const query = `
      SELECT Id, Employee_Name__c, Employee_ID__c, Department__c
      FROM Employee__c
      WHERE Active__c = true
      ORDER BY Employee_Name__c ASC
    `;
    const result = await conn.query(query);
    return result.records;
}

// --- Mutations ---

export async function createProduct(data: Partial<SalesforceProduct>) {
    const conn = await getSalesforceConnection();
    if (!conn) throw new Error("Salesforce connection failed");

    const payload = {
        ...data,
        IsActive: data.IsActive !== undefined ? data.IsActive : true
    };

    const result = await conn.sobject('Product2').create(payload);
    if (!result.success) {
        throw new Error("Failed to create Product: " + JSON.stringify(result.errors));
    }
    return result;
}

export async function createAsset(data: Partial<SalesforceAsset>) {
  const conn = await getSalesforceConnection();
  if (!conn) throw new Error("Salesforce connection failed");

  if (data.AMS_Asset_Serial_Number__c) {
      const query = `SELECT Id FROM MVC_Internal_Asset__c WHERE AMS_Asset_Serial_Number__c = '${data.AMS_Asset_Serial_Number__c}' LIMIT 1`;
      const duplicateCheck = await conn.query(query);
      if (duplicateCheck.records.length > 0) {
          throw new Error("duplicate serial number: An asset with this serial number already exists.");
      }
  }

  const payload = {
    ...data,
    AMS_Status__c: 'Un-Assigned',
    AMS_Assigned_To__c: null,
  };

  const result = await conn.sobject('MVC_Internal_Asset__c').create(payload);
  if (!result.success) {
    throw new Error("Failed to create Asset: " + JSON.stringify(result.errors));
  }
  return result;
}

interface UpdateAssignmentParams {
  assetId: string;
  assignToNewPerson: boolean;
  newAssigneeId?: string;
  assignedDate?: string; 
  remarks?: string;
  conditionOnAssignment?: string;
  conditionOnReturn?: string; 
  currentAssignmentId?: string; 
}

export async function updateAssetAssignment(params: UpdateAssignmentParams) {
  const conn = await getSalesforceConnection();
  if (!conn) throw new Error("Salesforce connection failed");

  // Fetch Configuration
  const config = await getAssetConfig();
  const allowBypass = config.Bypass_Validation__c === 'Yes';

  // 1. Validations
  if (params.assignToNewPerson) {
      if (!params.newAssigneeId) throw new Error("Please select an employee to assign the asset to."); // Never bypassed
      if (!params.assignedDate) throw new Error("Please select the Assignment Date."); // Never bypassed
  }

  // Check overlaps (Skippable via Configuration)
  if (!allowBypass && params.assignToNewPerson && params.assignedDate) {
      const existingHistoryQuery = `
        SELECT AMS_Assigned_Date__c, AMS_Returned_Date__c 
        FROM AMS_Asset_Assignment_History__c 
        WHERE AMS_Asset__c = '${params.assetId}'
      `;
      const histories = (await conn.query(existingHistoryQuery)).records as unknown as AssignmentHistory[];
      
      const newStart = new Date(params.assignedDate).getTime();
      
      for (const h of histories) {
          const hStart = new Date(h.AMS_Assigned_Date__c).getTime();
          const hEnd = h.AMS_Returned_Date__c ? new Date(h.AMS_Returned_Date__c).getTime() : Infinity;
          
          if (newStart >= hStart && newStart <= hEnd) {
             const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
             const startStr = formatDate(h.AMS_Assigned_Date__c);
             const endStr = h.AMS_Returned_Date__c ? formatDate(h.AMS_Returned_Date__c) : 'Present';

             throw new Error(`The selected date overlaps with an existing assignment (${startStr} - ${endStr}). Please choose a different date.`);
          }
      }
  }

  // 2. Process Flow
  try {
    if (params.currentAssignmentId) {
        if (!params.conditionOnReturn) throw new Error("Condition on Return is required to close the current assignment.");
        
        const returnDate = params.assignedDate || new Date().toISOString().split('T')[0];

        await conn.sobject('AMS_Asset_Assignment_History__c').update({
            Id: params.currentAssignmentId,
            AMS_Returned_Date__c: returnDate,
            AMS_Condition_on_Return__c: params.conditionOnReturn,
            AMS_Remark__c: params.remarks
        });
    }

    if (params.assignToNewPerson) {
        const newHistory = await conn.sobject('AMS_Asset_Assignment_History__c').create({
            AMS_Asset__c: params.assetId,
            AMS_Assigned_Person__c: params.newAssigneeId,
            AMS_Assigned_Date__c: params.assignedDate,
            AMS_Condition_on_Assignment__c: params.conditionOnAssignment,
            AMS_Remark__c: params.remarks
        });

        if (!newHistory.success) throw new Error("Failed to create history: " + JSON.stringify(newHistory.errors));

        await conn.sobject('MVC_Internal_Asset__c').update({
            Id: params.assetId,
            AMS_Status__c: 'Assigned',
            AMS_Assigned_To__c: params.newAssigneeId
        });
    } else if (params.currentAssignmentId) {
        await conn.sobject('MVC_Internal_Asset__c').update({
            Id: params.assetId,
            AMS_Status__c: 'Un-Assigned',
            AMS_Assigned_To__c: null
        });
    }

    return { success: true };
  } catch (error: any) {
    console.error("Assignment Update Error:", error);
    throw new Error(error.message || "An error occurred during assignment update.");
  }
}

export async function updateAssetStatus(assetId: string, status: string) {
  const conn = await getSalesforceConnection();
  if (!conn) throw new Error("Salesforce connection failed");

  const result = await conn.sobject('MVC_Internal_Asset__c').update({
    Id: assetId,
    AMS_Status__c: status
  });

  if (!result.success) {
    throw new Error("Failed to update asset status: " + JSON.stringify(result.errors));
  }
  return { success: true };
}
