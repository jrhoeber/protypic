import type { Prototype, PrototypeWithAccessCode, ExpirationDays } from "@protypic/shared";
import { adminDb } from "./firebase-admin";
import { deletePrototypeFiles, uploadPrototypeFiles } from "./gcs";
import { validateFiles } from "./file-validation";
import { hashAccessCode } from "./access-code";
import { newGuid } from "./guid";
import { env } from "./env";
import { Timestamp } from "firebase-admin/firestore";

const COL = "prototypes";

function computeExpiresAt(days: ExpirationDays): Date | null {
  if (days === null) return null;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

type DocFields = {
  ownerUid: string;
  name: string;
  createdAt: Timestamp;
  expiresAt: Timestamp | null;
  isProtected: boolean;
  accessCodeHash: string | null;
  entryFile: string;
};

function toPrototype(id: string, d: DocFields): Prototype {
  return {
    id,
    ownerUid: d.ownerUid,
    name: d.name,
    createdAt: d.createdAt.toDate().toISOString(),
    expiresAt: d.expiresAt ? d.expiresAt.toDate().toISOString() : null,
    isProtected: d.isProtected,
    entryFile: d.entryFile,
  };
}

export async function createPrototype(input: {
  ownerUid: string;
  name: string;
  expirationDays: ExpirationDays;
  isProtected: boolean;
  files: Array<{ path: string; contentBase64: string }>;
}): Promise<PrototypeWithAccessCode> {
  const { files: validated, entryFile } = validateFiles(input.files);
  const id = newGuid();
  const accessCode = input.isProtected ? newGuid() : null;
  const accessCodeHash = accessCode ? hashAccessCode(accessCode) : null;
  const expiresAt = computeExpiresAt(input.expirationDays);

  await uploadPrototypeFiles(id, validated);

  const doc: DocFields = {
    ownerUid: input.ownerUid,
    name: input.name,
    createdAt: Timestamp.fromDate(new Date()),
    expiresAt: expiresAt ? Timestamp.fromDate(expiresAt) : null,
    isProtected: input.isProtected,
    accessCodeHash,
    entryFile,
  };
  await adminDb().collection(COL).doc(id).set(doc);

  return {
    ...toPrototype(id, doc),
    accessCode,
    url: `${env.viewBaseUrl()}/p/${id}`,
  };
}

export async function getPrototype(id: string): Promise<
  (Prototype & { accessCodeHash: string | null }) | null
> {
  const snap = await adminDb().collection(COL).doc(id).get();
  if (!snap.exists) return null;
  const data = snap.data() as DocFields;
  return { ...toPrototype(id, data), accessCodeHash: data.accessCodeHash };
}

export async function listPrototypesForUser(ownerUid: string): Promise<Prototype[]> {
  const snap = await adminDb()
    .collection(COL)
    .where("ownerUid", "==", ownerUid)
    .orderBy("createdAt", "desc")
    .get();
  return snap.docs.map((d) => toPrototype(d.id, d.data() as DocFields));
}

export type RotateAccessCodeResult =
  | { status: "ok"; accessCode: string }
  | { status: "not_found" }
  | { status: "not_protected" };

export async function rotateAccessCode(
  id: string,
  ownerUid: string,
): Promise<RotateAccessCodeResult> {
  const ref = adminDb().collection(COL).doc(id);
  const snap = await ref.get();
  if (!snap.exists) return { status: "not_found" };
  if (snap.get("ownerUid") !== ownerUid) return { status: "not_found" };
  if (!snap.get("isProtected")) return { status: "not_protected" };
  const accessCode = newGuid();
  await ref.update({ accessCodeHash: hashAccessCode(accessCode) });
  return { status: "ok", accessCode };
}

export async function deletePrototype(id: string, ownerUid: string): Promise<boolean> {
  const ref = adminDb().collection(COL).doc(id);
  const snap = await ref.get();
  if (!snap.exists) return false;
  if (snap.get("ownerUid") !== ownerUid) return false;
  await deletePrototypeFiles(id);
  await ref.delete();
  return true;
}

export function isExpired(p: { expiresAt: string | null }, now = Date.now()): boolean {
  if (!p.expiresAt) return false;
  return new Date(p.expiresAt).getTime() <= now;
}

export async function sweepExpired(): Promise<{ deleted: number }> {
  const cutoff = Timestamp.fromDate(new Date());
  const snap = await adminDb()
    .collection(COL)
    .where("expiresAt", "<=", cutoff)
    .limit(200)
    .get();
  let deleted = 0;
  for (const doc of snap.docs) {
    await deletePrototypeFiles(doc.id);
    await doc.ref.delete();
    deleted += 1;
  }
  return { deleted };
}
