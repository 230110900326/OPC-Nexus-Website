#!/bin/sh
set -u

INTERVAL="${BACKUP_INTERVAL_SECONDS:-86400}"
while true; do
  if ! /scripts/postgres-backup.sh; then
    echo "backup_failed timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)" >&2
  fi
  sleep "$INTERVAL"
done
