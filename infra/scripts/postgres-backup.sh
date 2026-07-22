#!/bin/sh
set -eu

BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FILE="${BACKUP_DIR}/opc_nexus_${STAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"
umask 077
pg_dump --host "${DB_HOST:-postgres}" --port "${DB_PORT:-5432}" --username "${POSTGRES_USER:-opc}" --dbname "${POSTGRES_DB:-opc_nexus}" --no-owner --no-acl | gzip -9 > "$FILE"
gzip -t "$FILE"
find "$BACKUP_DIR" -type f -name 'opc_nexus_*.sql.gz' -mtime "+${RETENTION_DAYS}" -delete

echo "backup_complete file=$FILE bytes=$(wc -c < "$FILE")"
