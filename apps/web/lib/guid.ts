import { randomUUID, randomBytes } from "node:crypto";

export function newGuid(): string {
  return randomUUID();
}

export function newApiToken(): string {
  return "ptk_" + randomBytes(24).toString("base64url");
}
