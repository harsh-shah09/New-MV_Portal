"use server";

import { verifySession } from "@/lib/auth";
import { getEmployeeById } from "@/lib/salesforce";
import { getIsFirstTimeLogin, setFirstTimeLogin as updateFirstTimeLogin } from "@/lib/dynamodb";

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

export async function checkFirstTimeLogin(): Promise<boolean> {
  try {
    const session = await verifySession();
    if (!session?.employeeId) return false;

    return await getIsFirstTimeLogin(session.employeeId);
  } catch {
    return false;
  }
}

export async function updateFirstTimeLoginAction(isFirstTime: boolean): Promise<boolean> {
  try {
    const session = await verifySession();
    if (!session?.employeeId) return false;
    
    await updateFirstTimeLogin(session.employeeId, isFirstTime);
    return true;
  } catch {
    return false;
  }
}

