import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import {
  getSalaryHistoryByEmployee,
  getSalaryHistoryChangeTypeOptions
} from '@/lib/salesforce';

export async function GET() {
  try {
    const session = await verifySession();
    if (!session || !session.employeeId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const id = session.employeeId;

    const [records, changeTypeOptions] = await Promise.all([
      getSalaryHistoryByEmployee(id),
      getSalaryHistoryChangeTypeOptions()
    ]);

    return NextResponse.json({ records, changeTypeOptions });
  } catch (error) {
    console.error('Error fetching own salary history:', error);
    return NextResponse.json({ error: 'Failed to fetch salary history' }, { status: 500 });
  }
}
