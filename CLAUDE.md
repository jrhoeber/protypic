# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common commands

This is a pnpm workspace; run from the repo root.

```bash
pnpm install
pnpm -F @protypic/shared build   # MUST run before any typecheck/build of web or mcp-server
pnpm dev                          # apps/web on http://localhost:3000
pnpm build                        # builds all packages (recursive)
pnpm typecheck                    # `tsc --noEmit` across all packages
pnpm lint                         # `next lint` (web only)
```

Single-package commands use `-F`:

```bash
pnpm -F @protypic/web typecheck
pnpm -F @protypic/mcp build       # tsc check + esbuild bundle to dist/index.js
```

Local dev also needs Firebase emulators running alongside `pnpm dev`:

```bash
firebase emulators:start          # Auth + Firestore (+ optional Storage)
```

`.env.local` must be populated from `.env.example` (Firebase web config, `GCP_PROJECT_ID`, `GCS_PROTOTYPES_BUCKET`, `PORTAL_HOST`, `VIEW_HOST`, `COOKIE_SECRET`, `API_TOKEN_PEPPER`, emulator hosts).

There is no test runner configured in this repo.

## Architecture

### Origin-isolated streaming (the key invariant)

Prototype content is user-uploaded HTML/JS and **must not** run on the same origin as the portal — otherwise prototype JS could call `/api/*` with the viewer's `__session` cookie attached and act as the logged-in user. To prevent that, the same Cloud Run service is exposed on two hosts:

- `PORTAL_HOST` (e.g. `protypic.ai`) — portal pages, `/api/*`. Prototype routes (`/p/*`) return 404 here.
- `VIEW_HOST` (e.g. `view.protypic.ai`) — prototype gate + streaming only. Everything else returns 404 here.

Host enforcement happens in `apps/web/middleware.ts` and is doubled up by per-route host checks (`app/p/[guid]/page.tsx`, `app/p/[guid]/unlock/route.ts`, `app/p/[guid]/[...path]/route.ts`).

Visitor flow for `VIEW_HOST/p/{guid}`:

1. `app/p/[guid]/page.tsx` looks up the prototype, checks expiration.
2. If unprotected (or already unlocked), set the HMAC unlock cookie via `lib/prototype-session.ts` and redirect to `/p/{guid}/{entryFile}`.
3. If protected, render the unlock form. `POST /p/[guid]/unlock` validates the access code (with per-guid rate limiting via `lib/unlock-throttle.ts`), sets the cookie, redirects.
4. The streaming route (`app/p/[guid]/[...path]/route.ts`) validates the unlock cookie on every request, fetches the object from the **private** GCS bucket (`public_access_prevention = "enforced"`) via the Cloud Run service account, and streams it back with `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, and `Cache-Control: private`. ETag-based revalidation gives 304s on returning visitors.

The unlock cookie (`pu_{guid}`) is `httpOnly`, `secure`, `SameSite=lax`, path-scoped to `/p/{guid}/`, and HMAC-signed with `COOKIE_SECRET` over a domain-tagged payload (`"unlock:{guid}:{exp}"`). TTL is capped by the prototype's `expiresAt`. Rotating `COOKIE_SECRET` invalidates all outstanding unlock sessions.

Do **not** mount prototype routes on `PORTAL_HOST`, do **not** mount portal/API routes on `VIEW_HOST`, do **not** loosen the GCS bucket's `public_access_prevention`. Each collapses the origin isolation.

### Workspace layout

- **`apps/web`** — Next.js 14 App Router, deployed to Cloud Run with `output: "standalone"`.
  - `app/(portal)/*` — authenticated portal (dashboard, upload, settings) gated by Firebase Auth session cookie.
  - `app/api/*` — REST API consumed by both the portal and the MCP server.
  - `app/p/[guid]/*` — the public gate + streaming route (see above).
  - `app/healthz` — Cloud Run health probe.
  - `middleware.ts` — host-based route gate enforcing `PORTAL_HOST` / `VIEW_HOST` origin isolation.
  - `lib/` — server-only helpers (firebase-admin, GCS, unlock-session/throttle, validation, auth).
- **`packages/shared`** — Types, zod schemas, and constants used by both `apps/web` and the MCP server. It compiles to `dist/` via `tsc`; **consumers import from the built output**, so `pnpm -F @protypic/shared build` is required before typechecking/building anything downstream (CI does this explicitly in `.github/workflows/deploy.yml`). `apps/web` lists it in `next.config.mjs#transpilePackages` for the Next runtime.
- **`packages/mcp-server`** — `@protypic/mcp`, an MCP stdio server published to npm. Calls the same `/api/*` endpoints using a bearer API token (`PROTYPIC_API_TOKEN`). Bundled with esbuild to a single ESM file under `dist/`.
- **`terraform/`** — All GCP infra (Cloud Run, Firestore, GCS, LB + managed cert across `domain` + `view_subdomain`, DNS, Cloud Scheduler, Secret Manager, optional WIF for GitHub Actions). See `terraform/README.md` for the bootstrap dance — the Artifact Registry repo and a placeholder image must exist before the first `terraform apply`.

### Two auth paths

Both converge in `apps/web/lib/auth.ts#requireUser`:

- **Session cookie (`__session`)** — minted by `POST /api/session` from a Firebase Auth ID token (`adminAuth().createSessionCookie`). Used by the portal.
- **Bearer API token** — issued from the settings page, stored in Firestore as `hashApiToken(token, API_TOKEN_PEPPER)` (HMAC, never plaintext). Used by `@protypic/mcp` and any external API caller. Tokens are matched by hash + `revokedAt == null`.

The cron sweep endpoint (`app/api/cron/sweep/route.ts`) uses a third path: Cloud Scheduler signs an OIDC ID token for the Cloud Run URL, verified via `adminAuth().verifyIdToken`. Audience comes from `CRON_OIDC_AUDIENCE`.

### Upload validation

`apps/web/lib/file-validation.ts` enforces (limits live in `packages/shared/src/constants.ts`):

- Static browser-runnable assets only — `.ts`/`.jsx`/`.scss`/etc. are rejected with a hint to compile first.
- Must contain a root `index.html` or `index.htm` (becomes `entryFile`).
- ≤200 files, ≤50 MB total, ≤10 MB per file, no `..` or absolute paths.

These constants are imported from `@protypic/shared` by both the API and the MCP server's client-side checks — keep them in sync by editing `packages/shared` only.

### Server-only modules in Next

`firebase-admin` and `@google-cloud/storage` are listed in `next.config.mjs#experimental.serverComponentsExternalPackages`. Don't import them from client components, and don't remove that config — Next will try to bundle them otherwise.

## Deployment

`.github/workflows/deploy.yml` runs on push to `main`:

1. `pnpm install` → `pnpm -F @protypic/shared build` → `pnpm -r typecheck`
2. WIF auth (`secrets.WIF_PROVIDER`, `secrets.DEPLOYER_SA`).
3. `docker build -f apps/web/Dockerfile` from the **repo root** (the Dockerfile reaches into `packages/shared`). The `NEXT_PUBLIC_FIREBASE_*` values are passed as `--build-arg` because they're inlined into client JS at build time.
4. `gcloud run deploy protypic-web --image …`.

Server-side secrets (`API_TOKEN_PEPPER`, `COOKIE_SECRET`) are mounted from Secret Manager onto the Cloud Run service — they are **not** baked into the image. Terraform wires this in `terraform/cloud-run.tf` / `terraform/secret-manager.tf`.
