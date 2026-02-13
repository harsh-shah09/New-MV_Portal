export interface SalesforceAsset {
  Id: string;
  Name: string; // MVAST-000000
  AMS_Category__c: string;
  AMS_Purchase_Date__c: string;
  AMS_Warranty_Expiry_Date__c: string;
  AMS_Asset_Serial_Number__c: string;
  AMS_Purchase_Condition__c: string;
  AMS_Product__c?: string;
  AMS_Product__r?: SalesforceProduct;
  AMS_Assigned_To__c?: string;
  AMS_Assigned_To__r?: {
    Id: string;
    Name: string;
    Employee_Name__c: string;
  };
  AMS_Status__c: 'Assigned' | 'Un-Assigned' | 'Discarded';
  AMS_Status_Formula__c?: string;
}

export interface SalesforceProduct {
  Id: string;
  Name: string;
  AMS_Category__c: string;
  AMS_Model_Number__c: string;
  AMS_Specifications__c: string;
  IsActive?: boolean;
  AMS_Description__c: string;
}

export interface AssignmentHistory {
  Id: string;
  Name: string;
  AMS_Asset__c: string;
  AMS_Assigned_Person__c: string;
  AMS_Assigned_Person__r?: {
    Id: string;
    Name: string;
    Employee_Name__c: string;
  };
  AMS_Assigned_Date__c: string;
  AMS_Returned_Date__c?: string;
  AMS_Condition_on_Assignment__c: string;
  AMS_Condition_on_Return__c?: string;
  AMS_Remark__c?: string;
  AMS_Assignment_Status__c?: string; // Formula: Active / Returned
}

export interface RepairHistory {
  Id: string;
  Name: string;
  AMS_Asset__c: string;
  AMS_Asset_Assignment__c?: string;
  AMS_Fault_Details__c: string;
  AMS_Is_Company_Expense__c: boolean;
  AMS_Status__c: string;
  AMS_Repairing_Cost__c?: number;
  AMS_Repaired_Under_Warranty__c: boolean;
  AMS_Repair_Person_Vendor_Detail__c?: string;
  AMS_Repairing_Submission_Date__c: string;
  AMS_Repairing_Completion_Date__c?: string;
  AMS_Comment__c?: string;
}

export interface AssetConfiguration {
  Id?: string;
  DeveloperName?: string;
  MasterLabel?: string;
  Bypass_Validation__c: 'Yes' | 'No';
}
