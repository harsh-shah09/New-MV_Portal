"use server";

import { verifySession } from "@/lib/auth";
import { getEmployeeById } from "@/lib/salesforce";

/**
 * Server Action — safely callable from client components.
 * Reads the session cookie via verifySession() and returns
 * the authenticated user's role, or null if unauthenticated.
 */
export async function getSessionRole(): Promise<string | null> {
  try {
    const session = await verifySession();
    if (!session?.employeeId) return null;

    const employee = await getEmployeeById(session.employeeId);
    return (employee?.Role__c as string) ?? null;
  } catch {
    return null;
  }
}
