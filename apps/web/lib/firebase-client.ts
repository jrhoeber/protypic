"use client";

import { getApp, getApps, initializeApp } from "firebase/app";
import {
  GoogleAuthProvider,
  connectAuthEmulator,
  getAuth,
  signInWithPopup,
  signOut as fbSignOut,
  type Auth,
} from "firebase/auth";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

export function clientApp() {
  return getApps().length ? getApp() : initializeApp(config);
}

let _auth: Auth | null = null;
export function clientAuth(): Auth {
  if (_auth) return _auth;
  _auth = getAuth(clientApp());
  const emuHost = process.env.NEXT_PUBLIC_AUTH_EMULATOR_HOST;
  if (emuHost) {
    connectAuthEmulator(_auth, `http://${emuHost}`, { disableWarnings: true });
  }
  return _auth;
}

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  await signInWithPopup(clientAuth(), provider);
}

export async function signOut() {
  await fbSignOut(clientAuth());
}
