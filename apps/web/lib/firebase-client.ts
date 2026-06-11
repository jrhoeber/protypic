"use client";

import { getApp, getApps, initializeApp } from "firebase/app";
import {
  GoogleAuthProvider,
  getAuth,
  signInWithPopup,
  signOut as fbSignOut,
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

export function clientAuth() {
  return getAuth(clientApp());
}

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  await signInWithPopup(clientAuth(), provider);
}

export async function signOut() {
  await fbSignOut(clientAuth());
}
