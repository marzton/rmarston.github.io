# ---------------------------------------------------------------------------
# Cloudflare Pages Projects
# ---------------------------------------------------------------------------

# goldshore.ai — Astro front-end
resource "cloudflare_pages_project" "goldshore_ai" {
  account_id        = var.cloudflare_account_id
  name              = "goldshore-ai-app"
  production_branch = "main"

  build_config {
    build_command   = "pnpm build"
    destination_dir = "dist"
    root_dir        = "apps/goldshore-ai"
  }

  source {
    type = "github"
    config {
      owner                         = "marzton"
      repo_name                     = "goldshore-core"
      production_branch             = "main"
      pr_comments_enabled           = true
      deployments_enabled           = true
      production_deployment_enabled = true
      preview_deployment_setting    = "custom"
      preview_branch_includes       = ["preview", "feat/*"]
    }
  }
}

# goldshore.org — marketing/product website
resource "cloudflare_pages_project" "goldshore_org" {
  account_id        = var.cloudflare_account_id
  name              = "goldshore-org-web"
  production_branch = "main"

  build_config {
    build_command   = "pnpm build"
    destination_dir = "dist"
    root_dir        = "apps/goldshore-org"
  }

  source {
    type = "github"
    config {
      owner                         = "marzton"
      repo_name                     = "goldshore-core"
      production_branch             = "main"
      pr_comments_enabled           = true
      deployments_enabled           = true
      production_deployment_enabled = true
      preview_deployment_setting    = "custom"
      preview_branch_includes       = ["preview", "feat/*"]
    }
  }
}

# admin.goldshore.org — React/Vite dashboard, protected by CF Access
resource "cloudflare_pages_project" "goldshore_admin" {
  account_id        = var.cloudflare_account_id
  name              = "goldshore-admin-app"
  production_branch = "main"

  build_config {
    build_command   = "pnpm build"
    destination_dir = "dist"
    root_dir        = "apps/admin-dashboard"
  }

  source {
    type = "github"
    config {
      owner                         = "marzton"
      repo_name                     = "goldshore-core"
      production_branch             = "main"
      pr_comments_enabled           = true
      deployments_enabled           = true
      production_deployment_enabled = true
      preview_deployment_setting    = "none"
    }
  }
}

# ---------------------------------------------------------------------------
# Custom Domains for Pages
# ---------------------------------------------------------------------------

resource "cloudflare_pages_domain" "goldshore_ai_domain" {
  account_id   = var.cloudflare_account_id
  project_name = cloudflare_pages_project.goldshore_ai.name
  domain       = "goldshore.ai"
}

resource "cloudflare_pages_domain" "goldshore_org_domain" {
  account_id   = var.cloudflare_account_id
  project_name = cloudflare_pages_project.goldshore_org.name
  domain       = "goldshore.org"
}

resource "cloudflare_pages_domain" "goldshore_admin_domain" {
  account_id   = var.cloudflare_account_id
  project_name = cloudflare_pages_project.goldshore_admin.name
  domain       = "admin.goldshore.org"
}
