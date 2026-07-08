export const dynamic = 'force-dynamic';

import { verifySession } from "@/lib/auth";
import { EmployeeProfileView } from "@/components/employee-profile-view";
import { redirect } from "next/navigation";

export default async function MyProfilePage() {
  const session = await verifySession();
  if (!session || !session.employeeId) {
    redirect("/auth/login");
  }

  const role = (session.role as string) || 'Employee';
  const currentUserEmployeeId = session.employeeId;
  const currentUserTitle = session.title || '';

  return (
    <div className="min-h-screen bg-slate-50/50">
        <div className="mt-1">
            <EmployeeProfileView 
              employeeId="myprofile" 
              currentUserRole={role} 
              currentUserEmployeeId={currentUserEmployeeId} 
              currentUserTitle={currentUserTitle}
            />
        </div>
    </div>
  );
}
