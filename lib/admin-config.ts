import { getSalesforceConnection } from './salesforce';

export interface MetadataRecord {
  Id?: string;
  DeveloperName: string;
  MasterLabel: string;
  Language?: string;
  Label?: string;
  QualifiedApiName?: string;
  Value__c: string;
  Calculation_Type__c?: string;
  Is_Active__c?: boolean;
  NamespacePrefix?: string;
}

export interface AdminConfigs {
  admin: MetadataRecord[];
  documents: MetadataRecord[];
  emailTemplates: MetadataRecord[];
  leave: MetadataRecord[];
  payroll: MetadataRecord[];
  assets: any[]; // Asset_Configuration__mdt has specific fields
}

export type ConfigKey = keyof AdminConfigs;

const METADATA_TYPES = {
  ADMIN: 'Admin_Configurations__mdt',
  DOCUMENTS: 'Documents_Configurations__mdt',
  EMAIL: 'Email_Templates__mdt',
  LEAVE: 'Leave_Configurations__mdt',
  PAYROLL: 'Payroll_Configurations__mdt',
  ASSETS: 'Asset_Configuration__mdt'
};

export const getAllConfigurations = async (): Promise<AdminConfigs> => {
  const conn = await getSalesforceConnection();
  if (!conn) throw new Error("No Salesforce connection");

  const [admin, documents, emailTemplates, leave, payroll, assets] = await Promise.all([
    conn.query(`SELECT Id, DeveloperName, MasterLabel, QualifiedApiName, Value__c FROM ${METADATA_TYPES.ADMIN}`),
    conn.query(`SELECT Id, DeveloperName, MasterLabel, QualifiedApiName, Value__c FROM ${METADATA_TYPES.DOCUMENTS}`),
    conn.query(`SELECT Id, DeveloperName, MasterLabel, QualifiedApiName, Value__c FROM ${METADATA_TYPES.EMAIL}`),
    conn.query(`SELECT Id, DeveloperName, MasterLabel, QualifiedApiName, Value__c FROM ${METADATA_TYPES.LEAVE}`),
    conn.query(`SELECT Id, DeveloperName, MasterLabel, QualifiedApiName, Value__c, Calculation_Type__c, Is_Active__c FROM ${METADATA_TYPES.PAYROLL}`),
    conn.query(`SELECT Id, DeveloperName, MasterLabel, QualifiedApiName, Bypass_Validation__c FROM Asset_Configuration__mdt`),
  ]);

  return {
    admin: admin.records as unknown as MetadataRecord[],
    documents: documents.records as unknown as MetadataRecord[],
    emailTemplates: emailTemplates.records as unknown as MetadataRecord[],
    leave: leave.records as unknown as MetadataRecord[],
    payroll: payroll.records as unknown as MetadataRecord[],
    assets: assets.records as unknown as any[]
  };
};

/**
 * Fetches only the requested configuration types from Salesforce.
 * Pass an array of keys from AdminConfigs (e.g. ['emailTemplates', 'admin']).
 * This avoids loading all 6 MDT tables when only a subset is needed.
 */
export const getSpecificConfigurations = async (
  types: ConfigKey[]
): Promise<Partial<AdminConfigs>> => {
  const conn = await getSalesforceConnection();
  if (!conn) throw new Error('No Salesforce connection');

  const queryMap: Record<ConfigKey, () => Promise<any>> = {
    admin: () =>
      Promise.resolve(conn.query(`SELECT Id, DeveloperName, MasterLabel, QualifiedApiName, Value__c FROM ${METADATA_TYPES.ADMIN}`)),
    documents: () =>
      Promise.resolve(conn.query(`SELECT Id, DeveloperName, MasterLabel, QualifiedApiName, Value__c FROM ${METADATA_TYPES.DOCUMENTS}`)),
    emailTemplates: () =>
      Promise.resolve(conn.query(`SELECT Id, DeveloperName, MasterLabel, QualifiedApiName, Value__c FROM ${METADATA_TYPES.EMAIL}`)),
    leave: () =>
      Promise.resolve(conn.query(`SELECT Id, DeveloperName, MasterLabel, QualifiedApiName, Value__c FROM ${METADATA_TYPES.LEAVE}`)),
    payroll: () =>
      Promise.resolve(conn.query(`SELECT Id, DeveloperName, MasterLabel, QualifiedApiName, Value__c, Calculation_Type__c, Is_Active__c FROM ${METADATA_TYPES.PAYROLL}`)),
    assets: () =>
      Promise.resolve(conn.query(`SELECT Id, DeveloperName, MasterLabel, QualifiedApiName, Bypass_Validation__c FROM Asset_Configuration__mdt`)),
  };

  const uniqueTypes = [...new Set(types)].filter((t) => t in queryMap);
  const results = await Promise.all(uniqueTypes.map((t) => queryMap[t]()));

  const partial: Partial<AdminConfigs> = {};
  uniqueTypes.forEach((t, i) => {
    (partial as any)[t] = results[i].records;
  });

  return partial;
};

export const updateConfiguration = async (type: string, records: { fullName: string, label: string, values: any }[]) => {
  const conn = await getSalesforceConnection();
  if (!conn) throw new Error("No Salesforce connection");

  // Use the Metadata API to update Custom Metadata Types
  // The 'CustomMetadata' type is used for Custom Metadata Types records
  // format: CustomMetadataType.RecordName
  
  // Note: jsforce metadata.update() expects 'CustomMetadata' as the type for MDT records
  // and the fullName must be 'MetadataType__mdt.RecordName'
  
  try {
     const result = await conn.metadata.update('CustomMetadata', records);
     return result;
  } catch (error) {
    console.error(`Error updating metadata ${type}:`, error);
    throw error;
  }
};
