export type Prototype = {
  id: string;
  ownerUid: string;
  name: string;
  createdAt: string;
  expiresAt: string | null;
  isProtected: boolean;
  gcsPrefix: string;
  entryFile: string;
  sizeBytes: number;
  fileCount: number;
};

export type PrototypeWithAccessCode = Prototype & {
  accessCode: string | null;
  url: string;
};

export type ApiToken = {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
};

export type ApiTokenWithSecret = ApiToken & {
  token: string;
};
