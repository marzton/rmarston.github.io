terraform {
  required_version = ">= 1.6"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }

  # Terraform Cloud workspace — single workspace for the entire goldshore-core silo.
  cloud {
    organization = "goldshore"
    workspaces {
      name = "goldshore-core"
    }
  }
}

provider "cloudflare" {
  # Sourced from TF_VAR_cloudflare_api_token environment variable or
  # the Terraform Cloud variable set named "goldshore-cloudflare".
  api_token = var.cloudflare_api_token
}

# ---------------------------------------------------------------------------
# Variables
# ---------------------------------------------------------------------------

variable "cloudflare_api_token" {
  description = "Cloudflare API token with Edit permissions on Workers, Pages, DNS, and Access."
  type        = string
  sensitive   = true
}

variable "cloudflare_account_id" {
  description = "Cloudflare account ID."
  type        = string
}

variable "cloudflare_zone_id_org" {
  description = "Zone ID for goldshore.org."
  type        = string
}

variable "cloudflare_zone_id_ai" {
  description = "Zone ID for goldshore.ai."
  type        = string
}

variable "admin_email_allowlist" {
  description = "Emails permitted to access admin.goldshore.org via CF Access."
  type        = list(string)
  default     = ["rob@goldshore.ai"]
}
