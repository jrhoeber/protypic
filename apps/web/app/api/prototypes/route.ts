import { NextRequest, NextResponse } from "next/server";
import { uploadRequestSchema, MAX_UPLOAD_REQUEST_BYTES } from "@protypic/shared";
import { requireUser } from "@/lib/auth";
import { createPrototype, listPrototypesForUser } from "@/lib/prototypes";
import { handleApiError, jsonError } from "@/lib/http";

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

    // Reject oversized requests before reading the body into memory. The
    // per-file and per-array zod bounds catch a well-formed-but-too-big body
    // too, but those run after the JSON is fully materialized; this is the
    // memory-DoS gate. Missing/unparseable Content-Length is treated as
    // oversized to avoid chunked-transfer bypasses.
    const lenHeader = req.headers.get("content-length");
    const len = lenHeader ? Number(lenHeader) : NaN;
    if (!Number.isFinite(len) || len <= 0 || len > MAX_UPLOAD_REQUEST_BYTES) {
      return jsonError("Request too large.", 413);
    }

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
