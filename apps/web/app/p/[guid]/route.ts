import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { getPrototype, isExpired } from "@/lib/prototypes";
import { buildUnlockCookie, verifyUnlockCookie } from "@/lib/prototype-session";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { guid: string } }) {
  const host = (headers().get("host") ?? "").split(":")[0]!.toLowerCase();
  if (host !== env.viewHost().toLowerCase()) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const p = await getPrototype(params.guid);
  if (!p || isExpired(p)) return new NextResponse("Not Found", { status: 404 });

  if (p.isProtected && !verifyUnlockCookie(p.id)) {
    return NextResponse.redirect(`${env.viewBaseUrl()}/p/${p.id}/locked`, 303);
  }

  const expiresAt = p.expiresAt ? new Date(p.expiresAt) : null;
  const cookie = buildUnlockCookie(p.id, expiresAt);
  const res = NextResponse.redirect(`${env.viewBaseUrl()}/p/${p.id}/${p.entryFile}`, 303);
  res.cookies.set(cookie.name, cookie.value, {
    path: cookie.path,
    expires: cookie.expiresAt,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
  return res;
}
