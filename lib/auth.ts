'use server';
import { SignJWT } from "jose";
import { cookies } from "next/headers";
import crypto from "crypto";
import { getKey, verifyToken, SessionPayload } from "./auth-utils";
import { getAdminSettingValue } from "./admin-settings";
import { createDbSession, getDbSession, deleteDbSession } from "./dynamodb";

export { verifyToken, type SessionPayload };

export async function getEncryptionKey() {
  return await getAdminSettingValue("ENCRYPTION_KEY") || process.env.ENCRYPTION_KEY || "default_encryption_key_change_me";
}



export async function encrypt(payload: SessionPayload) {
  const secretKey = await getKey();
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secretKey)
}

export async function createSession(payload: SessionPayload) {
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hr session
  const sessionId = crypto.randomUUID();
  payload.sessionId = sessionId;
  
  await createDbSession(payload.employeeId, sessionId, expires.getTime());

  const session = await encrypt(payload);

  const cookieStore = await cookies();
  cookieStore.set("session", session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires,
    sameSite: "lax",
    path: "/",
    maxAge : 3600
  });
}

export async function verifySession() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session")?.value;

  if (!sessionToken) return null;
  const payload = await verifyToken(sessionToken);
  
  if (!payload || !payload.employeeId || !payload.sessionId) return null;

  const dbSession = await getDbSession(payload.employeeId, payload.sessionId);
  if (!dbSession || dbSession.status !== 'active') {
    return null;
  }

  return payload;
}

export async function logout() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session")?.value;
  
  if (sessionToken) {
    const payload = await verifyToken(sessionToken);
    if (payload && payload.employeeId && payload.sessionId) {
      await deleteDbSession(payload.employeeId, payload.sessionId);
    }
  }

  cookieStore.delete("session");
}

export async function hashPassword(password: string): Promise<string> {
  const encryptionKey = await getEncryptionKey();
  // Using HMAC-SHA256 as implied by "stored in hashes using ENCRYPTION_KEY"
  const hmac = crypto.createHmac("sha256", encryptionKey);
  hmac.update(password);
  return hmac.digest("hex");
}

export async function refreshSession() {
  const session = await verifySession();

  if (!session) return;

  const oldSessionId = session.sessionId;

  // Re-create session with new expiry
  await createSession(session);
  
  if (oldSessionId) {
    await deleteDbSession(session.employeeId, oldSessionId);
  }
}