# rmarston.com — Personal Portfolio

Personal career website for Robert Marston, DevOps Engineer & Cloud Architect.  
Live at **[rmarston.com](https://rmarston.com)** · Hosted on GitHub Pages · Edge-routed via Cloudflare.

## Stack

| Layer | Technology |
|---|---|
| Site | Static HTML/CSS (single-page portfolio) |
| Hosting | GitHub Pages |
| Domain | Cloudflare DNS + CNAME |
| Edge | Cloudflare Worker (`worker/index.ts`) |

## Local Development

Open `index.html` directly in a browser — no build step required for the portfolio page.

The `src/` directory contains a legacy Bootstrap/Pug build system (Start Bootstrap "Clean Blog" template) that is no longer used for the main site.

## Cloudflare Worker

The worker in `worker/index.ts` handles domain-level redirects.  
Deploy with [Wrangler](https://developers.cloudflare.com/workers/wrangler/):

```bash
npm install -g wrangler
wrangler deploy
```

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
# 📂 rmarston.github.io
**Legacy Registry & Patent Archive**

A minimalist, high-performance static repository serving as the permanent home for legacy brands and intellectual property.

## 📁 Active Directories
- **/armsway**: Patented Disposable Blood Pressure Sleeves.
- **/solefoodny**: Sneaker Boutique Brand Identity (#SFNY).
- **index.html**: Executive Bio & Directory linking to `rmarston.com`.

## 🛠️ Architecture
- **Tech Stack**: Vanilla HTML5, CSS3, JS.
- **Performance**: 100/100 Lighthouse score goal.
- **Hosting**: GitHub Pages (Personal Tier).
