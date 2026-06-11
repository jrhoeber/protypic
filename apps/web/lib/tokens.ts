import { adminDb } from "./firebase-admin";
import { hashApiToken } from "./access-code";
import { env } from "./env";
import { newApiToken } from "./guid";
import { Timestamp } from "firebase-admin/firestore";
import type { ApiToken, ApiTokenWithSecret } from "@protypic/shared";

const COL = "apiTokens";

type DocFields = {
  ownerUid: string;
  name: string;
  tokenHash: string;
  createdAt: Timestamp;
  lastUsedAt: Timestamp | null;
  revokedAt: Timestamp | null;
};

function toApiToken(id: string, d: DocFields): ApiToken {
  return {
    id,
    name: d.name,
    createdAt: d.createdAt.toDate().toISOString(),
    lastUsedAt: d.lastUsedAt ? d.lastUsedAt.toDate().toISOString() : null,
  };
}

export async function createToken(ownerUid: string, name: string): Promise<ApiTokenWithSecret> {
  const token = newApiToken();
  const ref = adminDb().collection(COL).doc();
  const doc: DocFields = {
    ownerUid,
    name,
    tokenHash: hashApiToken(token, env.apiTokenPepper()),
    createdAt: Timestamp.fromDate(new Date()),
    lastUsedAt: null,
    revokedAt: null,
  };
  await ref.set(doc);
  return { ...toApiToken(ref.id, doc), token };
}

export async function listTokens(ownerUid: string): Promise<ApiToken[]> {
  const snap = await adminDb()
    .collection(COL)
    .where("ownerUid", "==", ownerUid)
    .where("revokedAt", "==", null)
    .orderBy("createdAt", "desc")
    .get();
  return snap.docs.map((d) => toApiToken(d.id, d.data() as DocFields));
}

export async function revokeToken(ownerUid: string, id: string): Promise<boolean> {
  const ref = adminDb().collection(COL).doc(id);
  const snap = await ref.get();
  if (!snap.exists || snap.get("ownerUid") !== ownerUid) return false;
  await ref.update({ revokedAt: Timestamp.fromDate(new Date()) });
  return true;
}
