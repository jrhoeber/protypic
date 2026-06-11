export const EXPIRATION_OPTIONS = [1, 7, 30, 90, null] as const;
export type ExpirationDays = (typeof EXPIRATION_OPTIONS)[number];

export const MAX_FILES_PER_PROTOTYPE = 200;
export const MAX_TOTAL_BYTES = 50 * 1024 * 1024;
export const MAX_SINGLE_FILE_BYTES = 10 * 1024 * 1024;

export const ALLOWED_EXTENSIONS = new Set([
  ".html", ".htm", ".css", ".js", ".mjs", ".json", ".map",
  ".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".ico", ".avif",
  ".woff", ".woff2", ".ttf", ".otf",
  ".txt", ".md",
]);

export const REJECTED_EXTENSIONS_HINTS: Record<string, string> = {
  ".ts": "TypeScript must be compiled to .js before upload.",
  ".tsx": "TSX must be compiled to .js before upload.",
  ".jsx": "JSX must be compiled to .js before upload.",
  ".vue": "Vue components must be compiled to .js before upload.",
  ".svelte": "Svelte components must be compiled to .js before upload.",
  ".scss": "SCSS must be compiled to .css before upload.",
  ".sass": "Sass must be compiled to .css before upload.",
  ".less": "Less must be compiled to .css before upload.",
};

export const ENTRY_FILE_CANDIDATES = ["index.html", "index.htm"] as const;
