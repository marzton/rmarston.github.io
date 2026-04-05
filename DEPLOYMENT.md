# Deployment Runbook: Promote `fb43ad81` to Production

This runbook makes the preview deployment
`https://fb43ad81.rmarston-github-io.pages.dev/`
the main production deployment for `rmarston.com`.

## Scope

- Project: `rmarston-github-io` (Cloudflare Pages)
- Target preview URL: `https://fb43ad81.rmarston-github-io.pages.dev/`
- Production hostname: `rmarston.com`

## Dashboard steps (recommended)

1. Open Cloudflare Dashboard → **Workers & Pages** → **rmarston-github-io**.
2. Open the **Deployments** tab.
3. Find deployment `fb43ad81` (or the deployment matching that preview URL).
4. Use **Promote to production** on that deployment.
5. Verify the **Production** badge now points to `fb43ad81`.
6. Open **Custom domains** and confirm `rmarston.com` is attached to this Pages project.
7. Purge cache for `rmarston.com` (optional but recommended).
8. Validate:
   - `https://rmarston.com` loads expected content.
   - `https://www.rmarston.com` (if used) resolves as intended.

## Post-promotion checks

- Confirm there are **no Worker routes** intercepting `rmarston.com`.
- Keep `wrangler.toml` worker `routes = []` so the Worker cannot shadow Pages.
- Keep GitHub Pages disabled for this domain to avoid origin ambiguity.
