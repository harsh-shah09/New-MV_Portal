
import { verifySession } from "@/lib/auth";
import { redirect } from "next/navigation";
import HandbookClient from "./handbook-client";

export const dynamic = "force-dynamic";

export default async function HandbookPage() {
  const session = await verifySession();

  if (!session) {
    redirect("/auth/login");
  }

  return <HandbookClient role={session.role as string} userId={session.employeeId} />;
}
