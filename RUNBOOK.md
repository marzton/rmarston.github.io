# Gold Shore Labs — Deployment Runbook
# Generated: 2026-04-18
# Execute in order. Do not skip steps.

---

## PHASE 0 — Prerequisites (run once)

```bash
# Authenticate wrangler
wrangler login

# Confirm account
wrangler whoami
# Expected: Gold Shore Labs / f77de112d2019e5456a3198a8bb50bd2

# Set account ID in env for all commands
export CLOUDFLARE_ACCOUNT_ID=f77de112d2019e5456a3198a8bb50bd2
```

---

## PHASE 1 — Create missing resources

```bash
# Queue (gs-events)
wrangler queues create gs-events
wrangler queues create gs-events-dlq

# R2 bucket (user-uploads)
wrangler r2 bucket create user-uploads

# Verify all resources exist
wrangler r2 bucket list
wrangler queues list
wrangler kv namespace list
wrangler d1 list
```

---

## PHASE 2 — Set secrets on existing workers (before rename)

```bash
# goldshore-gateway (currently gs-platform)
wrangler secret put CLOUDFLARE_ACCESS_AUDIENCE --name gs-platform
wrangler secret put GATEWAY_AUTH_TOKEN --name gs-platform

# goldshore-api (currently gs-api)
wrangler secret put OPENAI_API_KEY --name gs-api
wrangler secret put GEMINI_API_KEY --name gs-api
wrangler secret put CONTROL_SYNC_TOKEN --name gs-api

# goldshore-agent (currently gs-agent)
wrangler secret put CLOUDFLARE_ACCESS_AUDIENCE --name gs-agent

# goldshore-mail (currently gs-mail)
wrangler secret put POSTMARK_API_KEY --name gs-mail
wrangler secret put WEBHOOK_SECRET --name gs-mail

# banproof-me
wrangler secret put POA_TOKEN --name banproof-me
wrangler secret put AUDIT_TOKEN --name banproof-me
wrangler secret put OPENAI_API_KEY --name banproof-me
```

---

## PHASE 3 — Deploy renamed workers to staging routes first

Order matters. Gateway depends on API and Agent existing first.

```bash
# 3a. Deploy goldshore-api (from gs-api repo, update wrangler.jsonc name field)
cd /path/to/gs-api
cp wrangler.jsonc wrangler.jsonc.bak
# Edit: "name": "goldshore-api"
wrangler deploy --env staging
# Test: curl https://goldshore-api.<account>.workers.dev/health

# 3b. Deploy goldshore-agent (from gs-agent repo)
cd /path/to/gs-agent
# Edit: "name": "goldshore-agent"
wrangler deploy --env staging
# Test: curl https://goldshore-agent.<account>.workers.dev/health

# 3c. Deploy goldshore-gateway (from gs-platform repo)
cd /path/to/gs-platform
# Edit: "name": "goldshore-gateway"
# Update service bindings: "service": "goldshore-api", "service": "goldshore-agent"
wrangler deploy --env staging
# Test: curl https://goldshore-gateway.<account>.workers.dev/health

# 3d. Deploy goldshore-mail
cd /path/to/gs-mail
# Edit: "name": "goldshore-mail"
wrangler deploy --env staging

# 3e. Deploy goldshore-admin (NEW)
cd /path/to/goldshore-admin  # create this repo/directory
# Use configs/goldshore-admin.wrangler.jsonc as wrangler.jsonc
wrangler deploy --env staging
```

---

## PHASE 4 — Deploy new properties

```bash
# rmarston-com (rebuild)
cd /path/to/rmarston-github-io
# Replace src/ with real content (done separately)
npm run build
wrangler deploy --env staging
# Test: curl https://rmarston-com.<account>.workers.dev/

# armsway (new scaffold)
cd /path/to/armsway
wrangler deploy --env staging
# Test: curl https://armsway.<account>.workers.dev/

# goldshore-web (Pages)
cd /path/to/goldshore-web
npm run build
wrangler pages deploy ./dist --project-name goldshore-web --branch staging
# Test: https://staging.goldshore-web.pages.dev

# banproof-me (add workflow)
cd /path/to/banproof-me
wrangler deploy --env staging
```

---

## PHASE 5 — Health checks (all must pass before DNS cutover)

```bash
# Workers
curl -sf https://goldshore-api.<account>.workers.dev/health | jq .
curl -sf https://goldshore-agent.<account>.workers.dev/health | jq .
curl -sf https://goldshore-gateway.<account>.workers.dev/health | jq .
curl -sf https://rmarston-com.<account>.workers.dev/ | grep -i "rmarston"
curl -sf https://armsway.<account>.workers.dev/ | grep -i "armsway"

# All should return {"status":"ok"} or valid HTML
```

---

## PHASE 6 — Cut production routes

```bash
# Deploy each worker with production routes enabled
# (routes are in each wrangler.jsonc — wrangler deploy applies them)

wrangler deploy --name goldshore-api       # api.goldshore.ai
wrangler deploy --name goldshore-agent     # agent.goldshore.ai
wrangler deploy --name goldshore-gateway   # gw.goldshore.ai
wrangler deploy --name goldshore-admin     # admin.goldshore.ai
wrangler deploy --name goldshore-mail      # (internal)
wrangler deploy --name rmarston-com        # rmarston.com
wrangler deploy --name armsway             # armsway.com
wrangler pages deploy --project-name goldshore-web  # goldshore.org
```

---

## PHASE 7 — Verify DNS + hostname behavior

```bash
# For each domain, confirm:
curl -sI https://goldshore.org | grep -E "HTTP|location|cf-ray"
curl -sI https://www.goldshore.org | grep -E "HTTP|location"
curl -sI https://gw.goldshore.ai/health | grep "HTTP"
curl -sI https://api.goldshore.ai/health | grep "HTTP"
curl -sI https://admin.goldshore.ai/ | grep "HTTP"
curl -sI https://rmarston.com/ | grep "HTTP"
curl -sI https://armsway.com/ | grep "HTTP"
curl -sI https://banproof.me/ | grep "HTTP"

# Expected: all return 200 (or 301 for www -> apex redirects)
# No 502, 522, 1101 errors
```

---

## PHASE 8 — Remove obsolete workers (LAST)

Only after Phase 7 passes completely.

```bash
# Confirm these have zero routes attached before deletion
wrangler delete goldshore-ai    # was redirect stub
wrangler delete goldshore-core  # was stub
wrangler delete gs-control      # was stub

# Confirm old names are gone (renamed workers are now new names)
# gs-api, gs-agent, gs-mail, gs-platform — these get superseded by
# goldshore-api, goldshore-agent, goldshore-mail, goldshore-gateway
# Only delete after you confirm traffic is on new names
```

---

## Resources to create (summary)

```bash
# Queues
wrangler queues create gs-events
wrangler queues create gs-events-dlq

# R2
wrangler r2 bucket create user-uploads

# KV (optional — GATEWAY_KV dedicated namespace)
wrangler kv namespace create GATEWAY_KV
# Note returned ID and update goldshore-gateway.wrangler.jsonc
```

---

## Stubs to delete (Phase 8 only)

| Worker | Reason |
|--------|--------|
| goldshore-ai | Redirect stub, replaced by Pages + alias |
| goldshore-core | Empty stub, no routes |
| gs-control | Empty stub, no routes |
| gs-api | Superseded by goldshore-api (after cutover) |
| gs-agent | Superseded by goldshore-agent (after cutover) |
| gs-mail | Superseded by goldshore-mail (after cutover) |
| gs-platform | Superseded by goldshore-gateway (after cutover) |
