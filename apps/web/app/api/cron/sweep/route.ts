import { NextRequest, NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";
import { sweepExpired } from "@/lib/prototypes";
import { env } from "@/lib/env";
import { jsonError } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let _oauth: OAuth2Client | null = null;
function oauth(): OAuth2Client {
  if (!_oauth) _oauth = new OAuth2Client();
  return _oauth;
}

// Invoked hourly by Cloud Scheduler with a Google-issued OIDC token whose
// audience is the Cloud Run URL. We verify the token against Google's keys
// (issuer accounts.google.com) and require the caller email to match the
// scheduler service account. firebase-admin's verifyIdToken is for Firebase
// Auth tokens (different issuer/audience) and must not be used here — using
// it would let any signed-in app user trigger the sweep.
async function authorize(req: NextRequest): Promise<boolean> {
  const header = req.headers.get("authorization");
  if (!header?.toLowerCase().startsWith("bearer ")) return false;
  const idToken = header.slice(7).trim();
  if (!idToken) return false;
  try {
    const ticket = await oauth().verifyIdToken({
      idToken,
      audience: env.cronOidcAudience(),
    });
    const payload = ticket.getPayload();
    if (!payload) return false;
    if (payload.email !== env.cronSchedulerSa()) return false;
    if (payload.email_verified !== true) return false;
    return true;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) return jsonError("Unauthorized.", 401);
  const result = await sweepExpired();
  return NextResponse.json(result);
}
