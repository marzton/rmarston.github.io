# Deployment Fix: Cloudflare Pages "root directory not found"

The build failure `2026-04-26T03:54:11.504Z Failed: root directory not found` occurs when the Cloudflare Pages project is configured with a "Root directory" that does not exist in the repository (e.g., if it was recently moved or renamed).

## Resolution Steps

To fix this for `rmarston.com`, update the Cloudflare Pages project settings to point to the correct location:

1.  **Open Cloudflare Dashboard**: Go to **Workers & Pages** > **Pages**.
2.  **Select Project**: Click on the `rmarston-github-io` project (or the project serving `rmarston.com`).
3.  **Go to Settings**: Navigate to **Settings** > **Build & deployments**.
4.  **Edit Build Settings**:
    *   **Root directory**: Ensure this is set to `/` (the repository root). If it currently points to a subdirectory (like `apps/rmarston-com`), clear it.
    *   **Build command**: `npm run build`
    *   **Build output directory**: `dist`
5.  **Save and Redeploy**: Save the changes and trigger a new deployment from the "Deployments" tab.

## Technical Context

The repository contains the build source in the root (controlled by `package.json`). Cloudflare Pages must be configured to run the build from the root directory to find the required scripts and configuration files.

**Note on Worker Routing**:
Per `AGENT_RULES.md`, the apex domain `rmarston.com` should not be intercepted by Worker routes. I have updated `wrangler.toml` and `wrangler.jsonc` to move the Worker logic to `api.rmarston.com/*`.
