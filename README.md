# rmarston.com — Personal Portfolio

Personal career website for Robert Marston, DevOps Engineer & Cloud Architect.  
Live at **[rmarston.com](https://rmarston.com)**.

## Stack

| Layer | Ownership / Technology |
|---|---|
| Site | Static HTML/CSS (single-page portfolio) |
| Hosting | **GitHub Pages (production origin)** |
| Domain | Cloudflare DNS proxy in front of GitHub Pages |
| Worker (`worker/index.ts`) | Optional utility worker only (**no site routes**) |

## Route ownership (authoritative)

This repository uses the **"GitHub Pages origin + Cloudflare DNS/edge"** deployment model:

- `rmarston.com` and `www.rmarston.com` resolve through **Cloudflare DNS**.
- Cloudflare DNS points to the GitHub Pages origin host `marzton.github.io`.
- The site origin is **GitHub Pages** for this repository.
- `wrangler.toml` must keep `routes = []` so no Worker can intercept site traffic.
- Any legacy Cloudflare Worker route for `rmarston.com/*` should be removed in Cloudflare.

This keeps routing deterministic: GitHub Pages serves content, Cloudflare provides DNS/proxy/WAF, and Workers do not own the base web route.

## Cloudflare DNS records (required)

In the `rmarston.com` Cloudflare zone, configure:

- `@` → `CNAME` → `marzton.github.io` (proxied)
- `www` → `CNAME` → `marzton.github.io` (proxied)

GitHub Pages must have custom domain set to `rmarston.com`, and this repo must keep the `CNAME` file committed with `rmarston.com`.

## Contact handling location

Contact handling for `rmarston.com` is **not** hosted in this worker. The site contact path is handled outside this worker (direct email/LinkedIn links on the site and associated external messaging flows).

## Local Development

Open `index.html` directly in a browser — no build step required for the portfolio page.

The `src/` directory contains a legacy Bootstrap/Pug build system (Start Bootstrap "Clean Blog" template) that is no longer used for the main site.

## Legacy archive content

This repository also contains static legacy directories:

- **`/armsway`**: Patented Disposable Blood Pressure Sleeves.
- **`/solefoodny`**: Sneaker Boutique Brand Identity (#SFNY).
- **`index.html`**: Executive bio and directory links.

## Worker Contact Email Configuration

`worker/index.ts` requires contact email settings to be defined via environment variables. There is no fallback address configured in code. Keep these values aligned in staging and production.

Required variables:

- `CONTACT_FROM_EMAIL`: sender address used by the Worker (for example, `contact@rmarston.com`).
- `CONTACT_TO_EMAIL`: destination inbox for contact form submissions (for example, `marstonr6@gmail.com`).

When deploying with Wrangler, set these under `[vars]` in `wrangler.toml`, and keep `[[send_email]].destination_address` aligned with `CONTACT_TO_EMAIL`.

## Contact

- Email: [marstonr6@gmail.com](mailto:marstonr6@gmail.com)
- LinkedIn: [linkedin.com/in/r-marston](https://www.linkedin.com/in/r-marston)
- GitHub: [github.com/marzton](https://github.com/marzton)
