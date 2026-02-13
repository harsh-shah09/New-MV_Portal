
import { verifySession } from "@/lib/auth";
import { redirect } from "next/navigation";
import EmployeesClient from "./employees-client";

export const dynamic = "force-dynamic";

export default async function EmployeesPage() {
  const session = await verifySession();

  if (!session) {
    redirect("/auth/login");
  }

  return <EmployeesClient role={session.role as string} />;
}
