# ---------------------------------------------------------------------------
# Worker Routes
# Workers are deployed via `wrangler deploy` (see apps/*/wrangler.toml).
# This file manages route associations so they are tracked in state and can
# be cleanly destroyed / reassigned without touching the Cloudflare dashboard.
# ---------------------------------------------------------------------------

# gs-gateway routes
resource "cloudflare_worker_route" "gateway" {
  zone_id     = var.cloudflare_zone_id_org
  pattern     = "gateway.goldshore.org/*"
  script_name = "gs-gateway"
}

# gs-api routes
resource "cloudflare_worker_route" "api_prod" {
  zone_id     = var.cloudflare_zone_id_org
  pattern     = "api.goldshore.org/*"
  script_name = "gs-api"
}

resource "cloudflare_worker_route" "api_preview" {
  zone_id     = var.cloudflare_zone_id_org
  pattern     = "api-preview.goldshore.org/*"
  script_name = "gs-api"
}

# gs-control — no public routes.
# Accessible only via service binding from gs-api.
# Add routes here when/if a controlled public surface is needed.
