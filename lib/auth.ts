'use server';
import { SignJWT } from "jose";
import { cookies } from "next/headers";
import crypto from "crypto";
import { key, verifyToken, SessionPayload } from "./auth-utils";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "default_encryption_key_change_me";

export { verifyToken, type SessionPayload };

export async function encrypt(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(key)
}

export async function createSession(payload: SessionPayload) {
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hr session
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
  const session = cookieStore.get("session")?.value;

  if (!session) return null;
  return verifyToken(session);
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
}

export async function hashPassword(password: string): Promise<string> {
  // Using HMAC-SHA256 as implied by "stored in hashes using ENCRYPTION_KEY"
  const hmac = crypto.createHmac("sha256", ENCRYPTION_KEY);
  hmac.update(password);
  return hmac.digest("hex");
}

export async function refreshSession() {
  const session = await verifySession();

  if (!session) return;

  // Re-create session with new expiry
  await createSession(session);
}