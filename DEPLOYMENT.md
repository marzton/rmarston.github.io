# Deployment Runbook: Cloudflare DNS + GitHub Pages Routing

This runbook repairs and validates production routing for `rmarston.com` so traffic flows:

**Visitor → Cloudflare DNS/Proxy/WAF → GitHub Pages origin (`marzton.github.io`)**

## Scope

- DNS provider / edge: Cloudflare (`rmarston.com` zone)
- Origin host: GitHub Pages (`marzton.github.io`)
- Production hostnames: `rmarston.com`, `www.rmarston.com`
- Worker policy: no worker routes for site traffic

## 1) Verify GitHub Pages settings

1. Open GitHub repo settings for this repository.
2. Go to **Pages**.
3. Confirm:
   - Source is configured for this repo’s site.
   - Custom domain is set to `rmarston.com`.
   - HTTPS enforcement is enabled.
4. Confirm repo has `CNAME` file containing exactly `rmarston.com`.

## 2) Repair Cloudflare DNS records

In Cloudflare DNS for `rmarston.com`, ensure exactly these site records exist:

- `@` `CNAME` `marzton.github.io` (Proxy status: **Proxied**)
- `www` `CNAME` `marzton.github.io` (Proxy status: **Proxied**)

Cleanup tasks:

- Remove stale A/AAAA records for `@` or `www` that conflict with these CNAMEs.
- Remove any stale Pages-origin CNAME targets (for example `*.pages.dev`) for apex/www.

## 3) Remove route conflicts

1. Open Cloudflare dashboard → **Workers & Pages** → **Workers**.
2. Verify no route pattern captures:
   - `rmarston.com/*`
   - `www.rmarston.com/*`
3. Keep this repo’s `wrangler.toml` as `routes = []`.

## 4) Validate end-to-end routing

- `https://rmarston.com` returns current site.
- `https://www.rmarston.com` returns current site (either direct or redirected to apex).
- TLS certificate is valid and issued for both hostnames.
- Optional: purge Cloudflare cache after DNS/route updates.

## 5) Rollback notes

If traffic fails after changes:

1. Re-check DNS record conflicts first (duplicate apex/www records are the most common breakage).
2. Temporarily switch Cloudflare records to DNS-only for troubleshooting, then re-enable proxy.
3. Confirm GitHub Pages custom domain still shows `rmarston.com` and HTTPS is active.
