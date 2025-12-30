import { jwtVerify } from "jose";

export interface SessionPayload {
  employeeId: string;
  email?: string;
  recordId: string;
  [key: string]: any;
}

const SECRET_KEY = process.env.SESSION_SECRET || "default_secret_key_change_me";
export const key = new TextEncoder().encode(SECRET_KEY);

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: ["HS256"],
    });
    return payload as SessionPayload;
  } catch (error) {
    return null;
  }
}
