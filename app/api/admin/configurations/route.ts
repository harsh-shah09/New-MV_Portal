
import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import { getEmployeeById, getSalesforceConnection } from '@/lib/salesforce';
import { getAllConfigurations, getSpecificConfigurations, updateConfiguration, ConfigKey } from '@/lib/admin-config';

async function getRolePicklistOptions() {
  try {
    const conn = await getSalesforceConnection();
    if (!conn) return [];

    const description = await conn.sobject('Employee__c').describe();
    const roleField = description.fields?.find((field: any) => field.name === 'Role__c');

    if (!roleField?.picklistValues) return [];

    return roleField.picklistValues
      .filter((picklistValue: any) => picklistValue.active)
      .map((picklistValue: any) => picklistValue.value)
      .filter((value: string) => Boolean(value));
  } catch (error) {
    console.error('Error fetching Role__c picklist options:', error);
    return [];
  }
}

async function getPayrollCalculationTypeOptions() {
  try {
    const conn = await getSalesforceConnection();
    if (!conn) return [];

    const description = await conn.sobject('Payroll_Configurations__mdt').describe();
    const calcTypeField = description.fields?.find((field: any) => field.name === 'Calculation_Type__c');

    if (!calcTypeField?.picklistValues) return [];

    return calcTypeField.picklistValues
      .filter((picklistValue: any) => picklistValue.active)
      .map((picklistValue: any) => picklistValue.value)
      .filter((value: string) => Boolean(value));
  } catch (error) {
    console.error('Error fetching Calculation_Type__c picklist options:', error);
    return [];
  }
}

export async function GET(req: Request) {
  try {
    const session = await verifySession();
    if (!session || !session.employeeId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const typesParam = searchParams.get('types');

    if (typesParam) {
      const requestedTypes = typesParam.split(',').map((t) => t.trim()) as ConfigKey[];
      const configs = await getSpecificConfigurations(requestedTypes);
      return NextResponse.json(configs);
    }

    const [configs, roleOptions, payrollCalculationTypeOptions] = await Promise.all([
      getAllConfigurations(),
      getRolePicklistOptions(),
      getPayrollCalculationTypeOptions()
    ]);
    return NextResponse.json({ ...configs, roleOptions, payrollCalculationTypeOptions });

  } catch (error) {
    console.error('Error fetching admin configurations:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await verifySession();
    if (!session || !session.employeeId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const employee = await getEmployeeById(session.employeeId);
    if (!employee || (employee.Role__c !== 'Admin' && employee.Role__c !== 'HR')) {
       return NextResponse.json({ error: 'Access Denied: Admin or HR role required.' }, { status: 403 });
    }

    const body = await req.json();
    const { updates } = body;

    if (!updates || !Array.isArray(updates)) {
       return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Group updates by metadata type to minimize API calls (though calls are per type anyway usually, or mixed? jsforce metadata.update takes mixed types? No, usually specific. actually it takes (type, records) OR (records) where records have type?
    // jsforce: conn.metadata.update(type, records)
    // CustomMetadata type is generic. we pass fullName.
    
    // Construct the payload for jsforce
    // The updates array from frontend should contain: { metadataType, fullName, label, value }
    
    // We can just process them.
    const recordsToUpdate = updates.map((u: any) => {
        // Special handling for Asset Configuration which uses 'Bypass_Validation__c'
        if (u.metadataType === 'Asset_Configuration__mdt') {
            return {
                fullName: u.fullName,
                label: u.label,
                values: [
                    { field: 'Bypass_Validation__c', value: u.value }
                ]
            };
        }

      if (u.metadataType === 'Payroll_Configurations__mdt') {
        const allowedPayrollFields = ['Value__c', 'Calculation_Type__c', 'Is_Active__c'];
        const fieldName = allowedPayrollFields.includes(u.field) ? u.field : 'Value__c';

        return {
          fullName: u.fullName,
          label: u.label,
          values: [
            { field: fieldName, value: u.value }
          ]
        };
      }

        // Default handling for 'Value__c'
        return {
            fullName: u.fullName,
            label: u.label,
            values: [
                { field: 'Value__c', value: u.value }
            ]
        };
    });

    if (recordsToUpdate.length === 0) {
        return NextResponse.json({ success: true, message: "No updates" });
    }

    // "CustomMetadata" is the type for all Custom Metadata Types
    const result = await updateConfiguration('CustomMetadata', recordsToUpdate);

    return NextResponse.json({ success: true, result });

  } catch (error) {
    console.error('Error updating admin configurations:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
