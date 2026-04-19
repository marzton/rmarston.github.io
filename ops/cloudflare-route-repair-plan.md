# Cloudflare Route Repair Plan

## Domain
- rmarston.com
- www.rmarston.com
- api.rmarston.com
- admin.rmarston.com
- preview.rmarston.com

## Intended ownership
- Apex and `www` stay static-first and must not be intercepted by Worker routes.
- `api.` is reserved for Worker/API traffic only.
- `admin.` may serve a placeholder auth shell until the full app is ready.
- `preview.` may serve a staging or placeholder entry.

## Required Cloudflare configuration
1. Remove any stale Worker routes matching `rmarston.com/*` or `www.rmarston.com/*`.
2. Keep Worker routing limited to subdomains that need runtime behavior.
3. Ensure DNS exists for `api`, `admin`, and `preview` before deploy.
4. Keep Pages or GitHub Pages as the canonical origin for apex traffic.

## Binding requirements
- Deployment must verify all expected environment bindings before publish.
- Missing KV namespaces, secrets, service bindings, or DNS targets must fail CI.
- Staging and production should use separate binding names where applicable.

## Validation checklist
- `https://rmarston.com` serves the static landing site.
- `https://www.rmarston.com` resolves canonically.
- `https://api.rmarston.com/health` returns HTTP 200 once API worker is attached.
- `https://admin.rmarston.com` resolves to placeholder or app.
- `https://preview.rmarston.com` resolves to placeholder or staging target.
- No Pages/Worker route collisions remain.

## Rollback notes
- Record previous Worker script names, route IDs, DNS record IDs, and Pages custom-domain settings before cutover.
