function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

function optional(name: string): string | undefined {
  return process.env[name] || undefined;
}

export const env = {
  projectId: () => required("GCP_PROJECT_ID"),
  bucket: () => required("GCS_PROTOTYPES_BUCKET"),
  cdnBaseUrl: () => required("CDN_BASE_URL"),
  cdnKeyName: () => required("CDN_SIGNING_KEY_NAME"),
  cdnKeyValue: () => required("CDN_SIGNING_KEY_VALUE"),
  apiTokenPepper: () => required("API_TOKEN_PEPPER"),
  publicAppUrl: () => process.env.NEXT_PUBLIC_APP_URL || "https://protypic.ai",

  firestoreEmulator: () => optional("FIRESTORE_EMULATOR_HOST"),
  authEmulator: () => optional("FIREBASE_AUTH_EMULATOR_HOST"),
  storageEmulator: () => optional("STORAGE_EMULATOR_HOST"),
};

export const isDev = process.env.NODE_ENV !== "production";
