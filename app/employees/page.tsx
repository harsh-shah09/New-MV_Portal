
import { verifySession } from "@/lib/auth";
import { redirect } from "next/navigation";
import EmployeesClient from "./employees-client";
import { RoleGuard } from "@/components/role-guard";

export const dynamic = "force-dynamic";

export default async function EmployeesPage() {
  const session = await verifySession();

  if (!session) {
    redirect("/auth/login");
  }

  return (
    <RoleGuard>
      <EmployeesClient role={session.role as string} />
    </RoleGuard>
  );
}
