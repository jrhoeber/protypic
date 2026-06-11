# protypic

Share vibe-coded frontend prototypes via short URLs. Drop in a single HTML file or a folder of static assets; get back a `protypic.ai/p/{GUID}` link, an access code, and an expiration date.

Upload from a web portal — or from any MCP-compatible harness via [`@protypic/mcp`](packages/mcp-server).

## How it works

```
                  ┌────────────────┐
  Visitor  ──HTTPS──► Cloud LB +    │
                  │  Cloud CDN     │
                  └──┬──────────┬──┘
                     │          │
             /p/{g}* │          │ /p/{g}/<asset>  (signed cookie required)
                     ▼          ▼
             ┌──────────────┐  ┌──────────────────┐
             │  Cloud Run   │  │  GCS              │
             │  Next.js gate│  │  prototype files  │
             └──────┬───────┘  └──────────────────┘
                    │
                    ▼
             ┌──────────────┐
             │  Firestore   │
             │  metadata    │
             └──────────────┘
```

Gate-then-edge: Cloud Run handles one request per session — looks up the prototype, checks expiration, validates the access code if protected, then mints a Cloud CDN signed cookie scoped to that prototype's path. All subsequent asset loads go straight from Cloud CDN with no backend involvement. Expiration is enforced at the edge via the cookie's TTL.

## Repo layout

| Path | What |
| --- | --- |
| `apps/web` | Next.js (App Router) — portal, API, and the `/p/{GUID}` gate. Deployed to Cloud Run. |
| `packages/shared` | Types and zod schemas shared by web + MCP. |
| `packages/mcp-server` | [`@protypic/mcp`](packages/mcp-server/README.md) — stdio MCP server (npm). |
| `terraform/` | GCP infrastructure: Cloud Run, Firestore, GCS, Cloud CDN with signed cookies, DNS, Cloud Scheduler, Secret Manager, WIF. |
| `docs/spec.md` | Original feature spec. |

## Local development

Working on this locally requires a Firebase project (see `terraform/README.md` for first-time setup). Once you have one:

```bash
pnpm install
cp .env.example .env.local      # fill NEXT_PUBLIC_FIREBASE_* + dev values
firebase emulators:start        # Auth + Firestore emulators
pnpm dev                        # web at http://localhost:3000
```

## Deployment

Infrastructure is in `terraform/`. CI in `.github/workflows/deploy.yml` builds and pushes the image to Artifact Registry on every push to `main`, then deploys to Cloud Run. Full setup runbook: [`terraform/README.md`](terraform/README.md).

## MCP server

```bash
npx @protypic/mcp
```

See [`packages/mcp-server/README.md`](packages/mcp-server/README.md) for harness config examples.

## License

MIT — see [LICENSE](LICENSE).
