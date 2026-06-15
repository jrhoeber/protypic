import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { SESSION_COOKIE, createSessionCookie } from "@/lib/auth";
import { handleApiError, jsonError } from "@/lib/http";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SESSION_MAX_AGE_MS = 5 * 24 * 60 * 60 * 1000; // 5 days

const bodySchema = z.object({ idToken: z.string().min(10) });

// CSRF guard for session mint. Without this, an attacker page could POST
// their own Firebase ID token via the user's browser and "log the user in"
// as the attacker. Use Sec-Fetch-Site (sent by all modern browsers); fall
// back to an Origin hostname match for clients that omit it.
function isSameOrigin(req: NextRequest): boolean {
  const site = req.headers.get("sec-fetch-site");
  if (site === "same-origin") return true;
  if (site && site !== "none") return false;
  const origin = req.headers.get("origin");
  if (!origin) return false;
  try {
    const u = new URL(origin);
    return u.hostname.toLowerCase() === env.portalHost().toLowerCase();
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!isSameOrigin(req)) return jsonError("Forbidden.", 403);
    const { idToken } = bodySchema.parse(await req.json());
    const cookie = await createSessionCookie(idToken, SESSION_MAX_AGE_MS);
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, cookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_MS / 1000,
    });
    return res;
  } catch (err) {
    return handleApiError(err);
  }
}

// No same-origin check on logout: SameSite=lax already prevents __session
// from being attached to cross-site requests, so a cross-site DELETE has
// nothing to clear. Adding an Origin/Sec-Fetch-Site gate here only risks
// breaking the legitimate Sign-out button when a browser or proxy omits
// those headers — exactly the regression observed locally.
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
