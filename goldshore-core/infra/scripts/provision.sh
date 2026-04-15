#!/usr/bin/env bash
# provision.sh — Idempotent Cloudflare resource provisioner for goldshore-core.
#
# Creates (or no-ops if already present) every D1, KV, R2, and Queue resource
# declared in infra/bindings.json, then writes the returned IDs back into that
# file so that all wrangler.toml configs can reference real UUIDs.
#
# Prerequisites:
#   - wrangler v3+ installed and authenticated  (wrangler login)
#   - jq installed
#
# Usage:
#   chmod +x infra/scripts/provision.sh
#   ./infra/scripts/provision.sh
#
# Safe to re-run: existing resources are detected and skipped.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
BINDINGS="${REPO_ROOT}/infra/bindings.json"

echo "==> goldshore-core provisioner"
echo "    bindings file: ${BINDINGS}"
echo ""

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

update_binding() {
  # update_binding <jq_path> <new_value>
  local path="$1" value="$2"
  tmp=$(mktemp)
  jq "${path} = \"${value}\"" "${BINDINGS}" > "${tmp}" && mv "${tmp}" "${BINDINGS}"
}

wrangler_d1_id() {
  # Returns the database_id for a D1 database by name, empty string if not found.
  wrangler d1 list --json 2>/dev/null | jq -r --arg name "$1" '.[] | select(.name==$name) | .uuid' || true
}

wrangler_kv_id() {
  wrangler kv namespace list --json 2>/dev/null | jq -r --arg title "$1" '.[] | select(.title==$title) | .id' || true
}

wrangler_queue_exists() {
  wrangler queues list --json 2>/dev/null | jq -e --arg name "$1" '.[] | select(.queue_name==$name)' > /dev/null 2>&1
}

wrangler_r2_exists() {
  wrangler r2 bucket list --json 2>/dev/null | jq -e --arg name "$1" '.[] | select(.name==$name)' > /dev/null 2>&1
}

# ---------------------------------------------------------------------------
# D1 Database
# ---------------------------------------------------------------------------
echo "--- D1: goldshore-platform"
D1_ID=$(wrangler_d1_id "goldshore-platform")
if [[ -z "${D1_ID}" ]]; then
  echo "    creating..."
  D1_ID=$(wrangler d1 create goldshore-platform --json | jq -r '.uuid')
else
  echo "    already exists — skipping"
fi
echo "    id: ${D1_ID}"
update_binding '.d1.id' "${D1_ID}"

# ---------------------------------------------------------------------------
# KV Namespaces
# ---------------------------------------------------------------------------
for KV_NAME in GS_CONFIG GS_SESSIONS GS_CACHE; do
  echo "--- KV: ${KV_NAME}"
  KV_ID=$(wrangler_kv_id "${KV_NAME}")
  if [[ -z "${KV_ID}" ]]; then
    echo "    creating..."
    KV_ID=$(wrangler kv namespace create "${KV_NAME}" --json | jq -r '.id')
  else
    echo "    already exists — skipping"
  fi
  echo "    id: ${KV_ID}"
  update_binding ".kv.${KV_NAME}.id" "${KV_ID}"
done

# ---------------------------------------------------------------------------
# R2 Buckets
# ---------------------------------------------------------------------------
for BUCKET in goldshore-public goldshore-logs goldshore-images; do
  echo "--- R2: ${BUCKET}"
  if wrangler_r2_exists "${BUCKET}"; then
    echo "    already exists — skipping"
  else
    echo "    creating..."
    wrangler r2 bucket create "${BUCKET}"
  fi
done

# ---------------------------------------------------------------------------
# Queues
# ---------------------------------------------------------------------------
for QUEUE in goldshore-events goldshore-dlq; do
  echo "--- Queue: ${QUEUE}"
  if wrangler_queue_exists "${QUEUE}"; then
    echo "    already exists — skipping"
  else
    echo "    creating..."
    wrangler queues create "${QUEUE}"
  fi
done

echo ""
echo "==> Done. infra/bindings.json updated with real IDs."
echo "    Review the file, then run:"
echo "      wrangler deploy --config apps/gateway-worker/wrangler.toml"
echo "      wrangler deploy --config apps/api-worker/wrangler.toml"
echo "      wrangler deploy --config apps/control-worker/wrangler.toml"
echo ""
echo "    Apply Terraform:"
echo "      cd infra/terraform && terraform init && terraform apply"
