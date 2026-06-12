import { adminDb } from "./firebase-admin";

const MAX_ATTEMPTS = 10;
const WINDOW_MS = 5 * 60 * 1000;
const COL = "unlock_throttle";

type ThrottleDoc = { count: number; windowStart: number };

export async function consumeUnlockAttempt(guid: string): Promise<boolean> {
  const ref = adminDb().collection(COL).doc(guid);
  const now = Date.now();
  return adminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.exists ? (snap.data() as ThrottleDoc) : null;
    if (!data || now - data.windowStart > WINDOW_MS) {
      tx.set(ref, { count: 1, windowStart: now });
      return true;
    }
    if (data.count >= MAX_ATTEMPTS) return false;
    tx.set(ref, { count: data.count + 1, windowStart: data.windowStart }, { merge: true });
    return true;
  });
}
