export const dynamic = 'force-dynamic';

import { verifySession } from "@/lib/auth";
import { EmployeeProfileView } from "@/components/employee-profile-view";
import Link from "next/link";
import { ArrowLeft, AlertTriangle } from "lucide-react";

export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await verifySession();
  const role = (session?.role as string) || 'Employee';
  const currentUserEmployeeId = session?.employeeId as string | undefined;

  const normalizeSfId = (sfId?: string) => (sfId || '').trim().toLowerCase().slice(0, 15);
  const isOwnProfile = normalizeSfId(currentUserEmployeeId) !== '' && normalizeSfId(currentUserEmployeeId) === normalizeSfId(id);
  const isAdminOrHr = role === 'Admin' || role === 'HR';
  const canAccess = isOwnProfile || isAdminOrHr;

  if (!canAccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 max-w-lg w-full p-10 text-center flex flex-col items-center justify-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mb-6 animate-bounce" />
          <h2 className="text-2xl font-bold text-slate-800 mb-4">Access Denied</h2>
          <p className="text-slate-500 mt-2">You do not have permission to view this employee's profile.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50">
        <div className="w-full px-6 lg:px-10 pt-6 pb-0">
            {(role === 'HR' || role === 'Admin') && (
            <Link 
                href="/employees" 
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg shadow-sm text-slate-600 hover:text-blue-600 hover:border-blue-200 hover:shadow-md transition-all font-medium"
            >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
            </Link>
            )}
        </div>
        <div className="mt-1">
                        <EmployeeProfileView employeeId={id} currentUserRole={role} currentUserEmployeeId={currentUserEmployeeId} />
        </div>
    </div>
  );
}
