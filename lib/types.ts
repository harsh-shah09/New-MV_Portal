export interface OrganizationSetting {
    Company_Name__c: string;
    Company_Email__c: string;
    Financial_Year_Start_Month__c: number;
    Working_Days__c: string; // "Monday,Tuesday,Wednesday,Thursday,Friday"
    Work_Start_Time__c: string; // "09:00"
    Work_End_Time__c: string; // "18:00"
    Timezone__c: string; // "Asia/Kolkata"
    Max_Leave_Carryover_Days__c: number;
    Probation_Period_Months__c: number;
  }
  
  export interface LeaveType {
    DeveloperName: string;
    Leave_Code__c: string;
    Leave_Name__c: string;
    Annual_Quota__c: number;
    Carryover_Allowed__c: boolean;
    Max_Carryover_Days__c?: number;
    Requires_Approval__c: boolean;
    Approval_Level__c?: string; // TL_HR, HR_ONLY, AUTO
    Requires_Document__c: boolean;
    Document_Required_After_Days__c?: number;
    Min_Notice_Period_Days__c?: number;
    Max_Consecutive_Days__c?: number;
    Can_Be_Prorated__c: boolean;
    Encashable__c: boolean;
    Active__c: boolean;
    Display_Order__c: number;
    Color_Code__c: string;
  }
  
  export interface DocumentType {
    DeveloperName: string;
    Document_Code__c: string;
    Document_Name__c: string;
    Required__c: boolean;
    Required_For__c: string; // All, Full_Time, Intern, Contract
    Max_File_Size_MB__c: number;
    Allowed_Formats__c: string; // PDF,DOC,DOCX,JPG,PNG
    Requires_Verification__c: boolean;
    Verification_Level__c?: string; // TL_HR, HR_ONLY
    Has_Expiry__c: boolean;
    Active__c: boolean;
    Display_Order__c: number;
    Help_Text__c?: string;
    Icon_Name__c?: string;
  }
  
  export interface Department {
    DeveloperName: string;
    Department_Code__c: string;
    Department_Name__c: string;
    Parent_Department__c?: string; // ID or DevName
    Cost_Center__c?: string;
    Active__c: boolean;
    Display_Order__c: number;
  }
  
  export interface PortalRole {
    DeveloperName: string;
    Role_Code__c: string;
    Role_Name__c: string;
    Role_Description__c?: string;
    Can_View_All_Employees__c: boolean;
    Can_View_Team__c: boolean;
    Can_Approve_Leaves__c: boolean;
    Can_Verify_Documents__c: boolean;
    Can_View_Payroll__c: string; // OWN, TEAM, ALL
    Can_Create_Employees__c: boolean;
    Can_Create_Announcements__c: boolean;
    Can_Access_Admin__c: boolean;
    Can_View_Reports__c: boolean;
    Display_Order__c: number;
  }
  
  export interface EmailTemplateConfig {
    DeveloperName: string;
    Template_Code__c: string;
    Template_Name__c: string;
    Subject__c: string;
    Body__c: string; // HTML
    From_Email__c: string;
    CC_Emails__c?: string;
    Active__c: boolean;
    Trigger_Event__c: string;
    Merge_Fields__c: string; // JSON array string
  }
  
  export interface ApprovalWorkflow {
    DeveloperName: string;
    Workflow_Code__c: string;
    Workflow_Name__c: string;
    Object_Type__c: string; // Leave, Document, Employee
    Approval_Levels__c: number;
    Level_1_Approver__c: string;
    Level_2_Approver__c?: string;
    Level_3_Approver__c?: string;
    Auto_Approve_Conditions__c?: string; // JSON
    Active__c: boolean;
    Default_Workflow__c: boolean;
  }
  
  export interface Holiday {
    Id?: string;
    Name?: string; // Auto Number HOL-{0000}
    Holiday_Name__c: string;
    Holiday_Date__c: string; // Date string YYYY-MM-DD
    Year__c: number;
    Holiday_Type__c: 'National Holiday' | 'Regional Holiday' | 'Optional Holiday' | 'Company Holiday';
    Applicable_Locations__c: string[]; // Multi-select
    Substitute_Working_Day__c?: string;
    Description__c?: string;
    Active__c: boolean;
  }
  