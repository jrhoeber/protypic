import { createHmac } from "node:crypto";
import { env } from "./env";

const COOKIE_NAME = "Cloud-CDN-Cookie";

export type SignedCookieOptions = {
  urlPrefix: string;
  expiresAt: Date;
};

/**
 * Build a Cloud CDN signed cookie value.
 * Spec: https://cloud.google.com/cdn/docs/using-signed-cookies
 *   URLPrefix=<base64url-of-prefix>:Expires=<unix>:KeyName=<name>:Signature=<base64url-hmac-sha1>
 */
export function buildSignedCookieValue(opts: SignedCookieOptions): string {
  const urlPrefixB64 = Buffer.from(opts.urlPrefix, "utf8").toString("base64url");
  const expiresUnix = Math.floor(opts.expiresAt.getTime() / 1000);
  const policy = `URLPrefix=${urlPrefixB64}:Expires=${expiresUnix}:KeyName=${env.cdnKeyName()}`;
  const key = Buffer.from(env.cdnKeyValue(), "base64url");
  const sig = createHmac("sha1", key).update(policy).digest("base64url");
  return `${policy}:Signature=${sig}`;
}

export type PrototypeCookie = {
  name: string;
  value: string;
  path: string;
  expiresAt: Date;
};

const ONE_HOUR_MS = 60 * 60 * 1000;

export function buildPrototypeCookie(id: string, prototypeExpiresAt: Date | null): PrototypeCookie {
  const cdnBase = env.cdnBaseUrl().replace(/\/+$/, "");
  const urlPrefix = `${cdnBase}/p/${id}/`;
  const sessionExpiry = new Date(Date.now() + ONE_HOUR_MS);
  const effective =
    prototypeExpiresAt && prototypeExpiresAt < sessionExpiry ? prototypeExpiresAt : sessionExpiry;
  return {
    name: COOKIE_NAME,
    value: buildSignedCookieValue({ urlPrefix, expiresAt: effective }),
    path: `/p/${id}/`,
    expiresAt: effective,
  };
}
