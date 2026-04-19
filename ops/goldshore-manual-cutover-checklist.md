# Goldshore Manual Cutover Checklist (Dashboard Gate)

This runbook is the **manual cutover gate** and must be executed in this exact order.

## Locked host map decision (freeze now)

Use this map for cutover to avoid split-brain:

- `goldshore.ai` -> served by **gs-web Pages** (primary web surface)
- `gw.goldshore.ai` -> **gs-platform** Worker custom domain
- `api.goldshore.ai` -> **gs-api** Worker custom domain
- `agent.goldshore.ai` -> **gs-agent** Worker custom domain
- `api.goldshore.org` -> **not used in this cutover**

> If architecture changes, update this file first and re-run the full checklist.

---

## 1) Fix Cloudflare Access policy first (highest risk)

Target: active Access application in front of protected surface.

- [ ] Replace Access policy: `non_identity + everyone`
- [ ] With: `identity + email domain @goldshore.ai`
- [ ] Confirm policy save succeeded
- [ ] Confirm protected endpoint no longer allows arbitrary unauthenticated entry

### Then delete stale Access applications

Do cleanup **after** policy correction:

- [ ] `gs-mail` (2 stale)
- [ ] `gs-platform` (2 stale)
- [ ] `gs-api` (2 stale)
- [ ] `goldshore-core` (2 stale)
- [ ] `banproof-me` (2 stale)

Validation:

- [ ] Active app remains intact after stale-app deletion
- [ ] Only one intended active app per surface remains

---

## 2) Attach Worker custom domains

Add and validate one-by-one:

### `gs-platform` Worker

- [ ] Attach custom domain `gw.goldshore.ai`
- [ ] Verify domain is attached to **gs-platform** (intended Worker)
- [ ] Verify no duplicate `gw.goldshore.ai` attachment elsewhere
- [ ] Verify health endpoint responds

### `gs-api` Worker

- [ ] Attach custom domain `api.goldshore.ai`
- [ ] Verify domain is attached to **gs-api** (intended Worker)
- [ ] Verify no duplicate `api.goldshore.ai` attachment elsewhere
- [ ] Verify health endpoint responds

### `gs-agent` Worker

- [ ] Attach custom domain `agent.goldshore.ai`
- [ ] Verify domain is attached to **gs-agent** (intended Worker)
- [ ] Verify no duplicate `agent.goldshore.ai` attachment elsewhere
- [ ] Verify health endpoint responds

---

## 3) Disconnect redundant `goldshore-ai` build

In Workers / Pages / Build settings for `goldshore-ai`:

- [ ] Disconnect Git build
- [ ] Confirm `gs-web` Pages remains source of truth for `goldshore.ai`
- [ ] Do **not** delete the Worker unless explicit dependency audit is complete

Dependency hold-point:

- [ ] Confirm no redirects, routes, or integrations still depend on `goldshore-ai` Worker

---

## 4) Fix `goldshore.org` mail DNS

Add DNS records:

- [ ] SPF TXT at apex (`@`):
  - `v=spf1 include:_spf.mx.cloudflare.net ~all`
- [ ] DMARC TXT at `_dmarc`:
  - `v=DMARC1; p=none; rua=mailto:<reporting-address>`

Notes:

- [ ] If mailbox not ready, use standardized Cloudflare-generated reporting address used elsewhere

---

## 5) Fix `armsway.com` mail routing

Add Cloudflare Email Routing MX records:

- [ ] `route1.mx.cloudflare.net`
- [ ] `route2.mx.cloudflare.net`
- [ ] `route3.mx.cloudflare.net`

Also enforce:

- [ ] Use Cloudflare-expected MX priorities for the zone
- [ ] Ensure valid SPF record exists
- [ ] Remove conflicting legacy MX records

---

## 6) Post-change verification

### Access verification

- [ ] Protected surface rejects arbitrary entry and enforces identity + `@goldshore.ai`

### Worker endpoint verification

Run:

```bash
curl -I https://gw.goldshore.ai/health
curl -I https://api.goldshore.ai/health
curl -I https://agent.goldshore.ai/health
```

Expected:

- [ ] Each returns reachable HTTP response (typically `200` or expected health status)
- [ ] No hostname resolves to the wrong Worker

### DNS / mail verification

Run after propagation:

```bash
dig +short TXT goldshore.org
dig +short TXT _dmarc.goldshore.org
dig +short MX armsway.com
```

Expected:

- [ ] SPF TXT present at `goldshore.org`
- [ ] DMARC TXT present at `_dmarc.goldshore.org`
- [ ] Only intended Cloudflare MX targets present for `armsway.com`

---

## 7) Cutover gate

Proceed to deploy/cutover only when all prior sections are complete.

- [ ] 1. Access policy fix
- [ ] 2. Delete stale Access apps
- [ ] 3. Add Worker custom domains
- [ ] 4. Disconnect redundant `goldshore-ai` build
- [ ] 5. Add `goldshore.org` SPF/DMARC
- [ ] 6. Add `armsway.com` MX
- [ ] 7. Verify hostnames and mail DNS
- [ ] 8. Continue deploy/cutover
