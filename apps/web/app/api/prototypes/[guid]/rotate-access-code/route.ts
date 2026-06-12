import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { rotateAccessCode } from "@/lib/prototypes";
import { handleApiError, jsonError } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { guid: string } }) {
  try {
    const user = await requireUser(req);
    const result = await rotateAccessCode(params.guid, user.uid);
    if (result.status === "not_found") return jsonError("Not found.", 404);
    if (result.status === "not_protected") {
      return jsonError("Prototype is not access-protected.", 400);
    }
    return NextResponse.json({ accessCode: result.accessCode });
  } catch (err) {
    return handleApiError(err);
  }
}
