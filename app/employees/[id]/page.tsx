import { verifySession } from "@/lib/auth";
import { EmployeeProfileView } from "@/components/employee-profile-view";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await verifySession();
  const role = (session?.role as string) || 'Employee';
    const currentUserEmployeeId = session?.employeeId as string | undefined;
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
