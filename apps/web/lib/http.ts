import { NextResponse } from "next/server";
import { UploadValidationError } from "./file-validation";
import { UnauthorizedError } from "./auth";
import { ZodError } from "zod";

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export function handleApiError(err: unknown): NextResponse {
  if (err instanceof UploadValidationError) return jsonError(err.message, err.status);
  if (err instanceof ZodError) return jsonError("Invalid request body.", 400);
  if (err instanceof UnauthorizedError) return jsonError("Unauthorized.", 401);
  console.error("API error:", err);
  return jsonError("Internal error.", 500);
}
