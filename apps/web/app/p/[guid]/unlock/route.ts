import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPrototype, isExpired } from "@/lib/prototypes";
import { verifyAccessCode } from "@/lib/access-code";
import { buildPrototypeCookie } from "@/lib/signed-cookie";
import { env } from "@/lib/env";
import { handleApiError, jsonError } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({ accessCode: z.string().min(1) });

export async function POST(req: NextRequest, { params }: { params: { guid: string } }) {
  try {
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
    const cdnCookie = buildPrototypeCookie(p.id, expiresAt);
    const entry = env.cdnBaseUrl().replace(/\/+$/, "") + `/p/${p.id}/${p.entryFile}`;

    const res = NextResponse.redirect(entry, { status: 303 });
    res.cookies.set(cdnCookie.name, cdnCookie.value, {
      path: cdnCookie.path,
      expires: cdnCookie.expiresAt,
      secure: true,
    });
    res.cookies.set(`protypic_unlocked_${p.id}`, "1", {
      path: `/p/${p.id}`,
      expires: cdnCookie.expiresAt,
      secure: true,
      httpOnly: true,
      sameSite: "lax",
    });
    return res;
  } catch (err) {
    return handleApiError(err);
  }
}
