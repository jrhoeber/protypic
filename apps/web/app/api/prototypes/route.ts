import { NextRequest, NextResponse } from "next/server";
import { uploadRequestSchema } from "@protypic/shared";
import { requireUser } from "@/lib/auth";
import { createPrototype, listPrototypesForUser } from "@/lib/prototypes";
import { handleApiError } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const items = await listPrototypesForUser(user.uid);
    return NextResponse.json({ prototypes: items });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const body = uploadRequestSchema.parse(await req.json());
    const result = await createPrototype({
      ownerUid: user.uid,
      name: body.name,
      expirationDays: body.expirationDays,
      isProtected: body.isProtected,
      files: body.files,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
