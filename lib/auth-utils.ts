import { jwtVerify } from "jose";
import { getAdminSettingValue } from "./admin-settings";

export interface SessionPayload {
  employeeId: string;
  email?: string;
  [key: string]: any;
  role : string;
  title? : string;
  name : string;
  sessionId?: string;
}

export async function getKey() {
  const secretKey = await getAdminSettingValue("SESSION_SECRET") || process.env.SESSION_SECRET || "default_secret_key_change_me";
  return new TextEncoder().encode(secretKey);
}

export async function verifyToken(token: string) {
  try {
    const key = await getKey();
    const { payload } = await jwtVerify(token, key, {
      algorithms: ["HS256"],
    });
    return payload as SessionPayload;
  } catch (error) {
    return null;
  }
}
