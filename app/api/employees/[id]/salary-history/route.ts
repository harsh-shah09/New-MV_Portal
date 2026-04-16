import { NextResponse } from 'next/server';
import dayjs from 'dayjs';
import { verifySession } from '@/lib/auth';
import {
  createSalaryHistoryRecord,
  getEmployeeById,
  getSalaryHistoryByEmployee,
  getSalaryHistoryChangeTypeOptions,
  getSalesforceConnection,
  SalaryHistoryRecord
} from '@/lib/salesforce';

interface SalaryHistoryPayload {
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
  Effective_Date__c: string;
  End_Date__c?: string;
  Is_Current__c?: boolean;
  Change_Type__c?: string;
  Description__c?: string;
}

const toNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await verifySession();
    if (!session?.employeeId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const currentUser = await getEmployeeById(session.employeeId);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (currentUser.Role__c === 'Employee' && session.employeeId !== id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const [records, changeTypeOptions] = await Promise.all([
      getSalaryHistoryByEmployee(id),
      getSalaryHistoryChangeTypeOptions()
    ]);

    return NextResponse.json({ records, changeTypeOptions });
  } catch (error) {
    console.error('Error fetching salary history:', error);
    return NextResponse.json({ error: 'Failed to fetch salary history' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await verifySession();
    if (!session?.employeeId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = await getEmployeeById(session.employeeId);
    if (!currentUser || currentUser.Role__c !== 'Admin') {
      return NextResponse.json({ error: 'Access denied: Admin role required.' }, { status: 403 });
    }

    const { id } = await params;
    const payload = (await request.json()) as Partial<SalaryHistoryPayload>;

    const currentSalary = toNumber(payload.Current_Salary__c);
    const previousSalary = toNumber(payload.Previous_Salary__c);

    if (currentSalary === null || previousSalary === null) {
      return NextResponse.json({ error: 'Current and previous salary are required numeric values.' }, { status: 400 });
    }

    if (!payload.Effective_Date__c) {
      return NextResponse.json({ error: 'Effective date is required.' }, { status: 400 });
    }

    const incrementAmount = Number((currentSalary - previousSalary).toFixed(2));
    const incrementPercent = previousSalary === 0
      ? 0
      : Number((((currentSalary - previousSalary) / previousSalary) * 100).toFixed(2));

    const record: SalaryHistoryRecord = {
      Employee__c: id,
      Current_Salary__c: currentSalary,
      Previous_Salary__c: previousSalary,
      Security_Deposite__c: toNumber(payload.Security_Deposite__c) ?? undefined,
      Basic_Console__c: toNumber(payload.Basic_Console__c) ?? undefined,
      CONV__c: toNumber(payload.CONV__c) ?? undefined,
      ESI__c: toNumber(payload.ESI__c) ?? undefined,
      HRA__c: toNumber(payload.HRA__c) ?? undefined,
      PF__c: toNumber(payload.PF__c) ?? undefined,
      PT__c: toNumber(payload.PT__c) ?? undefined,
      SP_All__c: toNumber(payload.SP_All__c) ?? undefined,
      Increment_Amount__c: incrementAmount,
      Increment_Percent__c: incrementPercent,
      Effective_Date__c: payload.Effective_Date__c,
      End_Date__c: payload.End_Date__c || null,
      Is_Current__c: Boolean(payload.Is_Current__c),
      Change_Type__c: payload.Change_Type__c || undefined,
      Description__c: payload.Description__c || undefined
    };

    const result = await createSalaryHistoryRecord(record);

    if (!result.success) {
      return NextResponse.json({ error: result.errors?.[0]?.message || 'Failed to create record' }, { status: 400 });
    }

    if (record.Is_Current__c) {
      const conn = await getSalesforceConnection();
      if (conn) {
        const effectiveDate = dayjs(payload.Effective_Date__c, 'YYYY-MM-DD', true);
        const previousEndDate = effectiveDate.isValid()
          ? effectiveDate.subtract(1, 'day').format('YYYY-MM-DD')
          : null;

        const existingCurrent = await conn.query(
          `SELECT Id FROM Salary_History_Tracking__c WHERE Employee__c = '${id}' AND Id != '${result.id}' AND Is_Current__c = true`
        );

        if (existingCurrent.records.length > 0) {
          await conn.sobject('Salary_History_Tracking__c').update(
            existingCurrent.records.map((existing: any) => ({
              Id: existing.Id,
              Is_Current__c: false,
              ...(previousEndDate ? { End_Date__c: previousEndDate } : {})
            }))
          );
        }

        const employeeUpdatePayload: {
          Id: string;
          Salary_CTC__c: number;
          Basic_Console__c?: number;
          CONV__c?: number;
          ESI__c?: number;
          HRA__c?: number;
          PF__c?: number;
          PT__c?: number;
          S_All__c?: number;
        } = {
          Id: id,
          Salary_CTC__c: currentSalary
        };

        const basicConsole = toNumber(payload.Basic_Console__c);
        const conv = toNumber(payload.CONV__c);
        const esi = toNumber(payload.ESI__c);
        const hra = toNumber(payload.HRA__c);
        const pf = toNumber(payload.PF__c);
        const pt = toNumber(payload.PT__c);
        const spAll = toNumber(payload.SP_All__c);

        if (basicConsole !== null) employeeUpdatePayload.Basic_Console__c = basicConsole;
        if (conv !== null) employeeUpdatePayload.CONV__c = conv;
        if (esi !== null) employeeUpdatePayload.ESI__c = esi;
        if (hra !== null) employeeUpdatePayload.HRA__c = hra;
        if (pf !== null) employeeUpdatePayload.PF__c = pf;
        if (pt !== null) employeeUpdatePayload.PT__c = pt;
        if (spAll !== null) employeeUpdatePayload.S_All__c = spAll;

        await conn.sobject('Employee__c').update(employeeUpdatePayload);
      }
    }

    return NextResponse.json({ success: true, id: result.id });
  } catch (error) {
    console.error('Error creating salary history record:', error);
    return NextResponse.json({ error: 'Failed to create salary history record' }, { status: 500 });
  }
}
