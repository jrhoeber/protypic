import { NextRequest, NextResponse } from "next/server";
import { sweepExpired } from "@/lib/prototypes";
import { adminAuth } from "@/lib/firebase-admin";
import { jsonError } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Invoked hourly by Cloud Scheduler with OIDC auth.
 * The scheduler signs an ID token addressed to this Cloud Run URL; we verify it.
 */
async function authorize(req: NextRequest): Promise<boolean> {
  const header = req.headers.get("authorization");
  if (!header?.toLowerCase().startsWith("bearer ")) return false;
  const idToken = header.slice(7).trim();
  try {
    await adminAuth().verifyIdToken(idToken);
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
