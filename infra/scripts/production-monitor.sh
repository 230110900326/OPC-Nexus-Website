#!/bin/sh
set -u

BASE_URL="${BASE_URL:-http://127.0.0.1}"
DISK_ALERT_PERCENT="${DISK_ALERT_PERCENT:-85}"
COMPOSE_FILE="${COMPOSE_FILE:-infra/docker-compose.yml}"
ENV_FILE="${ENV_FILE:-.env}"
failures=""

check_url() {
  label="$1"; url="$2"
  if ! curl --fail --silent --show-error --max-time 10 "$url" >/dev/null; then failures="${failures}${label};"; fi
}

check_url "gateway" "${BASE_URL}/healthz"
check_url "homepage" "${BASE_URL}/"
check_url "api_readiness" "${BASE_URL}/api/health/ready"

if ! docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T postgres pg_isready -U "${POSTGRES_USER:-opc}" -d "${POSTGRES_DB:-opc_nexus}" >/dev/null 2>&1; then failures="${failures}database;"; fi

disk_percent="$(df -P . | awk 'NR==2 {gsub(/%/,"",$5); print $5}')"
if [ "${disk_percent:-100}" -ge "$DISK_ALERT_PERCENT" ]; then failures="${failures}disk_${disk_percent}pct;"; fi

if docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" logs --since 10m api crawler 2>/dev/null | grep -Eqi '(^| )ERROR|outcome=error|crawler_job_result.*failed'; then failures="${failures}recent_application_errors;"; fi

if [ -n "$failures" ]; then
  message="OPC Nexus monitor failed: ${failures} host=$(hostname) time=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "$message" >&2
  if [ -n "${ALERT_WEBHOOK_URL:-}" ]; then curl --fail --silent --show-error --max-time 10 -H 'Content-Type: application/json' -d "{\"text\":\"$message\"}" "$ALERT_WEBHOOK_URL" >/dev/null || true; fi
  exit 1
fi

echo "monitor_ok disk=${disk_percent}% time=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
