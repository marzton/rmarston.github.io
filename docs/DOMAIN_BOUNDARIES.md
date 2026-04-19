# Domain Boundaries

## Authoritative surface

This repository is the source for the `rmarston.com` personal website content and static landing page assets.

## Intended deployment model

- Attach `rmarston.com` and `www.rmarston.com` only to the portfolio surface that actually deploys this repository.
- Keep `www.rmarston.com` canonicalized back to the apex.
- Do not attach `goldshore.ai`, `goldshore.org`, `gw.goldshore.ai`, `gateway.goldshore.ai`, `banproof.me`, or `armsway.com` here.

## Current operational notes

- DNS should point the apex to the active Pages surface.
- If the wrong template appears, verify the connected branch and Pages project before changing DNS again.
- Remove stale domain bindings from legacy Pages projects before re-binding this repo.

## Why this file exists

The goal is to reduce routing drift, prevent stale landing pages from reclaiming the apex, and make the ownership boundary obvious during deployment recovery.
