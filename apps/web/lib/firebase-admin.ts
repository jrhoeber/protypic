import { getApps, initializeApp, applicationDefault } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { env } from "./env";

function getApp() {
  const existing = getApps()[0];
  if (existing) return existing;
  return initializeApp({
    credential: applicationDefault(),
    projectId: env.projectId(),
  });
}

export const adminAuth = () => getAuth(getApp());
export const adminDb = () => getFirestore(getApp());
