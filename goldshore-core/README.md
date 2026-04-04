# goldshore-core

> **Single-silo monorepo** for the entire Goldshore platform — `goldshore.org` + `goldshore.ai`.

---

## Repository structure

```
goldshore-core/
├── apps/
│   ├── goldshore-ai/       ← goldshore.ai front-end  (Astro → CF Pages)
│   ├── goldshore-org/      ← goldshore.org website    (Astro → CF Pages)
│   ├── admin-dashboard/    ← admin.goldshore.org      (React/Vite → CF Pages + CF Access)
│   ├── gateway-worker/     ← gs-gateway               (Hono → CF Worker, public entry point)
│   ├── api-worker/         ← gs-api                   (Hono → CF Worker, business logic)
│   └── control-worker/     ← gs-control               (CF Worker, internal-only queue consumer)
├── packages/
│   ├── db/                 ← Drizzle ORM schema + D1 migrations
│   ├── auth/               ← CF Access JWT validation helper
│   └── types/              ← Shared TypeScript types
├── infra/
│   ├── bindings.json       ← ★ Canonical Cloudflare resource ID registry
│   ├── terraform/          ← CF Pages projects, DNS, Access policies, worker routes
│   └── scripts/
│       └── provision.sh    ← Idempotent: creates D1 / KV / R2 / Queues and writes IDs
├── wrangler.base.jsonc     ← Binding contract reference (documentation only)
├── package.json            ← pnpm workspaces root
└── tsconfig.base.json      ← Shared TypeScript config
```

---

## Worker topology

```
  goldshore.ai        goldshore.org
       │                   │
       └──── CF Edge ───────┘
                  │
          [gs-gateway]          ← gateway.goldshore.org  (AI, Images, R2, Queue producer)
                  │
        ┌─────────┴─────────┐
        │                   │
   [gs-api]          [gs-control]   ← internal only (no public route)
  api.goldshore.org   queue consumer
```

- **gs-gateway** is the sole public entry point for all API/AI traffic. It holds the `AI`, `IMAGES`, `R2`, and `QUEUE_EVENTS` bindings.
- **gs-api** handles business logic, auth, and database access. Calls the gateway via service binding for AI/Images.
- **gs-control** has **no public route**. Reachable only via service binding from gs-api; consumes the `goldshore-events` queue.
- **admin-dashboard** is a CF Pages app protected by CF Access. Communicates with gs-api via HTTPS.

---

## First-time setup

### 1. Provision Cloudflare resources

```bash
wrangler login
./infra/scripts/provision.sh
```

This creates the D1 database, three KV namespaces, three R2 buckets, and two Queues, then writes all real UUIDs into `infra/bindings.json`.

### 2. Populate wrangler configs

Copy the resource IDs from `infra/bindings.json` into the `<placeholder>` fields in each `apps/*/wrangler.toml`.

### 3. Set secrets

```bash
# gateway-worker
wrangler secret put AIPROXYSIGNING_KEY --config apps/gateway-worker/wrangler.toml

# api-worker
wrangler secret put RESEND_API_KEY    --config apps/api-worker/wrangler.toml
wrangler secret put CF_ACCESS_AUD     --config apps/api-worker/wrangler.toml

# control-worker
wrangler secret put RESEND_API_KEY    --config apps/control-worker/wrangler.toml
```

### 4. Apply Terraform (Pages projects, DNS, CF Access)

```bash
cd infra/terraform
terraform init
terraform apply
```

Requires Terraform Cloud workspace `goldshore/goldshore-core` and the following TF variables set:
- `cloudflare_api_token`
- `cloudflare_account_id`
- `cloudflare_zone_id_org`
- `cloudflare_zone_id_ai`
- `admin_email_allowlist`

### 5. Run D1 migrations

```bash
wrangler d1 migrations apply goldshore-platform --config apps/api-worker/wrangler.toml
```

### 6. Deploy workers

```bash
pnpm deploy:all
# or individually:
pnpm deploy:gateway
pnpm deploy:api
pnpm deploy:control
```

---

## Bindings quick-reference

| Binding | Type | Owner | Purpose |
|---|---|---|---|
| `AI` | Workers AI | gs-gateway | All AI inference |
| `IMAGES` | CF Images | gs-gateway | Image upload/transform |
| `DB` | D1 | all workers | goldshore-platform database |
| `GS_CONFIG` | KV | gateway, api, control | Feature flags + app config |
| `GS_SESSIONS` | KV | api, control | User auth sessions |
| `GS_CACHE` | KV | (as needed) | Ephemeral cache |
| `R2_PUBLIC` | R2 | gs-gateway | Public CDN assets |
| `R2_LOGS` | R2 | gs-gateway | Audit/access logs |
| `QUEUE_EVENTS` | Queue (producer) | gs-gateway | Platform event bus |
| `QUEUE_EVENTS` | Queue (consumer) | gs-control | Event processing |
| `GATEWAY` | Service binding | gs-api | Calls gs-gateway |
| `CONTROL` | Service binding | gs-api | Calls gs-control |
| `API` | Service binding | gs-gateway | Calls gs-api |

---

## Deprecated repos

The following standalone repos are **deprecated** and should be archived read-only after migration:

| Repo | Reason |
|---|---|
| `goldshore-gateway` | Merged into `apps/gateway-worker` |
| `goldshore-api` | Merged into `apps/api-worker` + `apps/control-worker` |
| `goldshore-admin` | Merged into `apps/admin-dashboard` + `infra/terraform/access.tf` |
| `goldshore-web` | Merged into `apps/goldshore-org` |
