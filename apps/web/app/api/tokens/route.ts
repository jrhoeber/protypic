import { NextRequest, NextResponse } from "next/server";
import { createTokenRequestSchema } from "@protypic/shared";
import { requireUser } from "@/lib/auth";
import { createToken, listTokens } from "@/lib/tokens";
import { handleApiError } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const tokens = await listTokens(user.uid);
    return NextResponse.json({ tokens });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const body = createTokenRequestSchema.parse(await req.json());
    const result = await createToken(user.uid, body.name);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
