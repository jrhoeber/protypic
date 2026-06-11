import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { adminAuth, adminDb } from "./firebase-admin";
import { env } from "./env";
import { hashApiToken } from "./access-code";

export type AuthedUser = { uid: string; via: "session" | "api_token" };

export const SESSION_COOKIE = "__session";

export async function createSessionCookie(idToken: string, maxAgeMs: number): Promise<string> {
  return adminAuth().createSessionCookie(idToken, { expiresIn: maxAgeMs });
}

export async function getUserFromSessionCookie(): Promise<AuthedUser | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const decoded = await adminAuth().verifySessionCookie(token, true);
    return { uid: decoded.uid, via: "session" };
  } catch {
    return null;
  }
}

export async function getUserFromBearer(req: NextRequest): Promise<AuthedUser | null> {
  const header = req.headers.get("authorization");
  if (!header?.toLowerCase().startsWith("bearer ")) return null;
  const token = header.slice(7).trim();
  if (!token) return null;
  const hash = hashApiToken(token, env.apiTokenPepper());
  const snap = await adminDb()
    .collection("apiTokens")
    .where("tokenHash", "==", hash)
    .where("revokedAt", "==", null)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0]!;
  await doc.ref.update({ lastUsedAt: new Date() }).catch(() => {});
  return { uid: doc.get("ownerUid") as string, via: "api_token" };
}

export async function requireUser(req: NextRequest): Promise<AuthedUser> {
  const fromToken = await getUserFromBearer(req);
  if (fromToken) return fromToken;
  const fromSession = await getUserFromSessionCookie();
  if (fromSession) return fromSession;
  throw new UnauthorizedError();
}

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}
