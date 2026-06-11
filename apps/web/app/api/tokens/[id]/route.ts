import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { revokeToken } from "@/lib/tokens";
import { handleApiError, jsonError } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser(req);
    const ok = await revokeToken(user.uid, params.id);
    if (!ok) return jsonError("Not found.", 404);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return handleApiError(err);
  }
}
