# ---------------------------------------------------------------------------
# DNS — goldshore.org zone
# ---------------------------------------------------------------------------

# Apex: goldshore.org → goldshore-org-web.pages.dev (proxied)
resource "cloudflare_record" "goldshore_org_apex" {
  zone_id = var.cloudflare_zone_id_org
  name    = "@"
  type    = "CNAME"
  value   = cloudflare_pages_project.goldshore_org.subdomain
  proxied = true
}

# www redirect
resource "cloudflare_record" "goldshore_org_www" {
  zone_id = var.cloudflare_zone_id_org
  name    = "www"
  type    = "CNAME"
  value   = "goldshore.org"
  proxied = true
}

# admin.goldshore.org → goldshore-admin-app.pages.dev
resource "cloudflare_record" "goldshore_org_admin" {
  zone_id = var.cloudflare_zone_id_org
  name    = "admin"
  type    = "CNAME"
  value   = cloudflare_pages_project.goldshore_admin.subdomain
  proxied = true
}

# api.goldshore.org → gs-api Worker
resource "cloudflare_record" "goldshore_org_api" {
  zone_id = var.cloudflare_zone_id_org
  name    = "api"
  type    = "CNAME"
  value   = "gs-api.${var.cloudflare_account_id}.workers.dev"
  proxied = true
}

# gateway.goldshore.org → gs-gateway Worker
resource "cloudflare_record" "goldshore_org_gateway" {
  zone_id = var.cloudflare_zone_id_org
  name    = "gateway"
  type    = "CNAME"
  value   = "gs-gateway.${var.cloudflare_account_id}.workers.dev"
  proxied = true
}

# ---------------------------------------------------------------------------
# DNS — goldshore.ai zone
# ---------------------------------------------------------------------------

# Apex: goldshore.ai → goldshore-ai-app.pages.dev (proxied)
resource "cloudflare_record" "goldshore_ai_apex" {
  zone_id = var.cloudflare_zone_id_ai
  name    = "@"
  type    = "CNAME"
  value   = cloudflare_pages_project.goldshore_ai.subdomain
  proxied = true
}

# www.goldshore.ai redirect
resource "cloudflare_record" "goldshore_ai_www" {
  zone_id = var.cloudflare_zone_id_ai
  name    = "www"
  type    = "CNAME"
  value   = "goldshore.ai"
  proxied = true
}

# ---------------------------------------------------------------------------
# REMOVED / DEPRECATED DNS RECORDS
# The following subdomains had no backing Worker or Pages project and must NOT
# be present in DNS. Remove them from the Cloudflare dashboard manually if
# they exist, or add import blocks here and set lifecycle { prevent_destroy }
# to false before running terraform apply.
#
#   control.goldshore.org   — add back only when gs-control gets a public route
#   services.goldshore.org  — no current Worker
#   agent.goldshore.org     — no current Worker
#   preview.goldshore.org   — no current Pages preview domain
# ---------------------------------------------------------------------------
