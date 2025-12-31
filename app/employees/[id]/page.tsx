
import { EmployeeProfileView } from "@/components/employee-profile-view";
import { MainNav } from "@/components/main-nav"; // Or remove if Sidebar is global

export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="min-h-screen bg-slate-50/50">
        <EmployeeProfileView employeeId={id} />
    </div>
  );
}
