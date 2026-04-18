# ---------------------------------------------------------------------------
# Cloudflare Access — admin.goldshore.org
# ---------------------------------------------------------------------------

resource "cloudflare_access_application" "admin" {
  zone_id          = var.cloudflare_zone_id_org
  name             = "Goldshore Admin Dashboard"
  domain           = "admin.goldshore.org"
  session_duration = "24h"
  type             = "self_hosted"

  # Allow Cloudflare Pages preview URLs to also be gated
  allowed_idps                  = []
  auto_redirect_to_identity     = false
  enable_binding_cookie         = true
  http_only_cookie_attribute    = true
  same_site_cookie_attribute    = "strict"
}

resource "cloudflare_access_policy" "admin_email_allowlist" {
  application_id = cloudflare_access_application.admin.id
  zone_id        = var.cloudflare_zone_id_org
  name           = "Admin email allowlist"
  precedence     = 1
  decision       = "allow"

  include {
    email = var.admin_email_allowlist
  }
}

# ---------------------------------------------------------------------------
# Cloudflare Access — control.goldshore.org (placeholder, no route yet)
# Uncomment when gs-control receives a public route.
# ---------------------------------------------------------------------------

# resource "cloudflare_access_application" "control" {
#   zone_id          = var.cloudflare_zone_id_org
#   name             = "Goldshore Control Worker"
#   domain           = "control.goldshore.org"
#   session_duration = "8h"
#   type             = "self_hosted"
# }

# resource "cloudflare_access_policy" "control_email_allowlist" {
#   application_id = cloudflare_access_application.control.id
#   zone_id        = var.cloudflare_zone_id_org
#   name           = "Control email allowlist"
#   precedence     = 1
#   decision       = "allow"

#   include {
#     email = var.admin_email_allowlist
#   }
# }
