import {
  ALLOWED_EXTENSIONS,
  ENTRY_FILE_CANDIDATES,
  MAX_FILES_PER_PROTOTYPE,
  MAX_SINGLE_FILE_BYTES,
  MAX_TOTAL_BYTES,
  REJECTED_EXTENSIONS_HINTS,
} from "@protypic/shared";

export class UploadValidationError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
    this.name = "UploadValidationError";
  }
}

function extOf(path: string): string {
  const i = path.lastIndexOf(".");
  return i === -1 ? "" : path.slice(i).toLowerCase();
}

function normalizePath(raw: string): string {
  const trimmed = raw.replace(/^\.\/+/, "").replace(/\\/g, "/");
  if (trimmed.startsWith("/") || trimmed.includes("..")) {
    throw new UploadValidationError(`Illegal path: ${raw}`);
  }
  return trimmed;
}

export type ValidatedFile = { path: string; bytes: Buffer };

export function validateFiles(
  files: Array<{ path: string; contentBase64: string }>,
): { files: ValidatedFile[]; totalBytes: number; entryFile: string } {
  if (files.length === 0) {
    throw new UploadValidationError("At least one file is required.");
  }
  if (files.length > MAX_FILES_PER_PROTOTYPE) {
    throw new UploadValidationError(
      `Too many files (${files.length}); limit is ${MAX_FILES_PER_PROTOTYPE}.`,
    );
  }

  const seen = new Set<string>();
  const out: ValidatedFile[] = [];
  let totalBytes = 0;

  for (const f of files) {
    const path = normalizePath(f.path);
    if (seen.has(path)) {
      throw new UploadValidationError(`Duplicate file path: ${path}`);
    }
    seen.add(path);

    const ext = extOf(path);
    const hint = REJECTED_EXTENSIONS_HINTS[ext];
    if (hint) {
      throw new UploadValidationError(`Unsupported file '${path}'. ${hint}`);
    }
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      throw new UploadValidationError(
        `Unsupported file '${path}'. Only static browser-runnable assets are allowed.`,
      );
    }

    const bytes = Buffer.from(f.contentBase64, "base64");
    if (bytes.length === 0) {
      throw new UploadValidationError(`Empty file: ${path}`);
    }
    if (bytes.length > MAX_SINGLE_FILE_BYTES) {
      throw new UploadValidationError(
        `File '${path}' exceeds ${MAX_SINGLE_FILE_BYTES} bytes.`,
      );
    }
    totalBytes += bytes.length;
    if (totalBytes > MAX_TOTAL_BYTES) {
      throw new UploadValidationError(
        `Prototype exceeds total size limit of ${MAX_TOTAL_BYTES} bytes.`,
      );
    }
    out.push({ path, bytes });
  }

  const entryFile = ENTRY_FILE_CANDIDATES.find((c) => seen.has(c));
  if (!entryFile) {
    throw new UploadValidationError(
      "Prototype must contain an 'index.html' (or 'index.htm') at the root.",
    );
  }

  return { files: out, totalBytes, entryFile };
}

const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".htm": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".avif": "image/avif",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
};

export function contentTypeFor(path: string): string {
  return CONTENT_TYPES[extOf(path)] || "application/octet-stream";
}
