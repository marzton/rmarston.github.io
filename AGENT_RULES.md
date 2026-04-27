# 🤖 Antigravity & AI Agent Instructions

This document acts as the definitive source of truth, boundaries, and guardrails for any AI agent (Antigravity, Copilot, Cursor, etc.) interacting with this repository. **All AI Agents MUST adhere to these architectural guidelines prior to executing changes.**

## 1. Core Architecture & Stack
- **Project Structure:** Single-page application focusing entirely on native HTML/CSS/JS.
- **Hosting Strategy:** Deployed statically to **GitHub Pages**.
- **Edge Routing & Security:** Served to `rmarston.com` via Cloudflare proxy.
  - **Bot Defense:** Cloudflare WAF and native AI Bot Blocking are active at edge routing.
  - **Email Routing:** Handled serverless via Cloudflare (e.g., `hello@rmarston.com` forwarding to actual inbox).
- **Secrets Management:** `GH_PERSONAL_ACCESS_TOKEN`, `RESEND_API_KEY`, and other operational secrets are stored STRICTLY inside Cloudflare SECRETS and GitHub Settings. **Never write secrets to local `.env` files.**

## 2. Code Rules & Aesthetics
- **Frontend Frameworks:** NONE. No TailwindCSS, no Bootstrap components, no massive dependencies.
- **Design System:** Lean, hand-written modern CSS using CSS custom variables (e.g., `var(--brand)`, `var(--accent)`).
- **Styling Rules:** Ensure beautiful modern design: Dark mode default, smooth `mix-blend-mode: screen` on overlapping SVG layers, subtle gradient backgrounds, and responsive layout constraints (`display: grid`, `flexbox`).
- **Dependencies:** Keep `node_modules` completely absent or explicitly ignored by Git and the IDE watcher to keep the laptop OS lightweight and fast.

## 3. IDE Config Requirements
- When working within this project, Agents must respect the `.vscode/settings.json` boundary configs designed to keep the DevOps laptop performant:
  - Do not index binary folders or deep `node_modules/`.
  - Disable overly aggressive live-linters for non-essential languages.
  - Assume Port Forwarding and lightweight SSH/Remote handling workflows are enabled.

## 4. Workflows & Handling
- **No Reverse Proxy Logic:** Previously, Cloudflare Workers proxied this domain to `goldshore.ai`. This is DEPRECATED and strictly forbidden. `wrangler.toml` should only be used if building small microservices on a route, NOT for serving the base HTML content. GitHub Pages serves the base content natively.
- **Asset Handling:** Any new assets (images, SVGs) should be directly embedded paths (or native `svg` code) and pushed through standard `git add`.
- **Committing Changes:** All systemic rewrites must be performed on feature branches (e.g., `feat/portfolio-cleanup-and-rewrite`) before merging to `master`.
