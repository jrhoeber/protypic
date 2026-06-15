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
  cookieSecret: () => required("COOKIE_SECRET"),
  apiTokenPepper: () => required("API_TOKEN_PEPPER"),
  portalHost: () => required("PORTAL_HOST"),
  viewHost: () => required("VIEW_HOST"),
  // VIEW_BASE_URL lets local dev override the scheme/port (e.g. http://view.lvh.me:3000).
  // In prod we derive https://${VIEW_HOST} since the LB terminates TLS on 443.
  viewBaseUrl: () => process.env.VIEW_BASE_URL || `https://${required("VIEW_HOST")}`,
  publicAppUrl: () => process.env.NEXT_PUBLIC_APP_URL || "https://protypic.ai",
  cronOidcAudience: () => required("CRON_OIDC_AUDIENCE"),
  cronSchedulerSa: () => required("CRON_SCHEDULER_SA"),

  firestoreEmulator: () => optional("FIRESTORE_EMULATOR_HOST"),
  authEmulator: () => optional("FIREBASE_AUTH_EMULATOR_HOST"),
  storageEmulator: () => optional("STORAGE_EMULATOR_HOST"),
};

export const isDev = process.env.NODE_ENV !== "production";
