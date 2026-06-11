import { createHash, randomBytes, timingSafeEqual, scryptSync } from "node:crypto";

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LEN = 32;
const SALT_LEN = 16;

export function hashAccessCode(code: string): string {
  const salt = randomBytes(SALT_LEN);
  const key = scryptSync(code, salt, KEY_LEN, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P });
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

export function verifyAccessCode(code: string, encoded: string): boolean {
  const parts = encoded.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const N = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  const salt = Buffer.from(parts[4]!, "base64url");
  const expected = Buffer.from(parts[5]!, "base64url");
  if (!Number.isFinite(N) || !Number.isFinite(r) || !Number.isFinite(p)) return false;
  const actual = scryptSync(code, salt, expected.length, { N, r, p });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function hashApiToken(token: string, pepper: string): string {
  return createHash("sha256").update(token + ":" + pepper).digest("hex");
}
