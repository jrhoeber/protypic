import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { deletePrototype, getPrototype } from "@/lib/prototypes";
import { handleApiError, jsonError } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { guid: string } }) {
  try {
    const user = await requireUser(req);
    const p = await getPrototype(params.guid);
    if (!p || p.ownerUid !== user.uid) return jsonError("Not found.", 404);
    const { accessCodeHash: _ach, ...rest } = p;
    return NextResponse.json(rest);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { guid: string } }) {
  try {
    const user = await requireUser(req);
    const ok = await deletePrototype(params.guid, user.uid);
    if (!ok) return jsonError("Not found.", 404);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return handleApiError(err);
  }
}
