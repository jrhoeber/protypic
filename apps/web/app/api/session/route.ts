import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { SESSION_COOKIE, createSessionCookie } from "@/lib/auth";
import { handleApiError } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SESSION_MAX_AGE_MS = 5 * 24 * 60 * 60 * 1000; // 5 days

const bodySchema = z.object({ idToken: z.string().min(10) });

export async function POST(req: NextRequest) {
  try {
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

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
