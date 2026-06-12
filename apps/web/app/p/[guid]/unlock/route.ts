import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { getPrototype, isExpired } from "@/lib/prototypes";
import { verifyAccessCode } from "@/lib/access-code";
import { buildUnlockCookie } from "@/lib/prototype-session";
import { consumeUnlockAttempt } from "@/lib/unlock-throttle";
import { env } from "@/lib/env";
import { handleApiError, jsonError } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({ accessCode: z.string().min(1).max(256) });

export async function POST(req: NextRequest, { params }: { params: { guid: string } }) {
  try {
    const host = (headers().get("host") ?? "").split(":")[0]!.toLowerCase();
    if (host !== env.viewHost().toLowerCase()) return jsonError("Not found.", 404);

    const allowed = await consumeUnlockAttempt(params.guid);
    if (!allowed) return jsonError("Too many attempts. Try again later.", 429);

    const { accessCode } = bodySchema.parse(await req.json());
    const p = await getPrototype(params.guid);
    if (!p || isExpired(p)) return jsonError("Not found.", 404);
    if (!p.isProtected || !p.accessCodeHash) {
      return jsonError("Not protected.", 400);
    }
    if (!verifyAccessCode(accessCode, p.accessCodeHash)) {
      return jsonError("Wrong access code.", 401);
    }

    const expiresAt = p.expiresAt ? new Date(p.expiresAt) : null;
    const cookie = buildUnlockCookie(p.id, expiresAt);
    const target = `${env.viewBaseUrl()}/p/${p.id}/${p.entryFile}`;

    const res = NextResponse.redirect(target, { status: 303 });
    res.cookies.set(cookie.name, cookie.value, {
      path: cookie.path,
      expires: cookie.expiresAt,
      httpOnly: true,
      secure: true,
      sameSite: "lax",
    });
    return res;
  } catch (err) {
    return handleApiError(err);
  }
}
