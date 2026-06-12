import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { env } from "./env";

const TTL_MS = 60 * 60 * 1000;
const DOMAIN_TAG = "unlock";

function cookieName(guid: string): string {
  return `pu_${guid}`;
}

function sign(guid: string, exp: number): string {
  return createHmac("sha256", env.cookieSecret())
    .update(`${DOMAIN_TAG}:${guid}:${exp}`)
    .digest("base64url");
}

export type UnlockCookie = {
  name: string;
  value: string;
  path: string;
  expiresAt: Date;
};

export function buildUnlockCookie(guid: string, prototypeExpiresAt: Date | null): UnlockCookie {
  const ceiling = prototypeExpiresAt?.getTime() ?? Infinity;
  const exp = Math.min(Date.now() + TTL_MS, ceiling);
  return {
    name: cookieName(guid),
    value: `${exp}.${sign(guid, exp)}`,
    // No trailing slash: matches both the gate (`/p/{guid}`) and the streaming
    // path (`/p/{guid}/...`). Per RFC 6265 §5.1.4, `/p/abc` does not match a
    // request for `/p/abcd` (path-match requires the next char to be `/`).
    path: `/p/${guid}`,
    expiresAt: new Date(exp),
  };
}

export function setUnlockCookie(guid: string, prototypeExpiresAt: Date | null): UnlockCookie {
  const c = buildUnlockCookie(guid, prototypeExpiresAt);
  cookies().set(c.name, c.value, {
    path: c.path,
    expires: c.expiresAt,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
  return c;
}

export function verifyUnlockCookie(guid: string): boolean {
  const raw = cookies().get(cookieName(guid))?.value;
  if (!raw) return false;
  const dot = raw.indexOf(".");
  if (dot <= 0) return false;
  const exp = Number(raw.slice(0, dot));
  const sig = raw.slice(dot + 1);
  if (!Number.isFinite(exp) || exp <= Date.now()) return false;
  const expected = sign(guid, exp);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
