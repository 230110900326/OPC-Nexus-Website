#!/bin/sh
set -eu

BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FILE="${BACKUP_DIR}/opc_nexus_${STAMP}.sql.gz"
TMP_DUMP="${BACKUP_DIR}/.opc_nexus_${STAMP}.sql"
TMP_ARCHIVE="${FILE}.partial"

mkdir -p "$BACKUP_DIR"
umask 077

# Do not pipe pg_dump directly to gzip. Without pipefail, a database connection
# error produces a valid but empty gzip archive and looks like a successful backup.
rm -f "$TMP_DUMP" "$TMP_ARCHIVE"
if ! pg_dump --host "${DB_HOST:-postgres}" --port "${DB_PORT:-5432}" --username "${POSTGRES_USER:-opc}" --dbname "${POSTGRES_DB:-opc_nexus}" --no-owner --no-acl > "$TMP_DUMP"; then
  rm -f "$TMP_DUMP" "$TMP_ARCHIVE"
  exit 1
fi
if [ ! -s "$TMP_DUMP" ]; then
  echo "backup_failed empty_dump" >&2
  rm -f "$TMP_DUMP" "$TMP_ARCHIVE"
  exit 1
fi
if ! gzip -9 -c "$TMP_DUMP" > "$TMP_ARCHIVE" || ! gzip -t "$TMP_ARCHIVE"; then
  rm -f "$TMP_DUMP" "$TMP_ARCHIVE"
  exit 1
fi
mv "$TMP_ARCHIVE" "$FILE"
rm -f "$TMP_DUMP"
find "$BACKUP_DIR" -type f -name 'opc_nexus_*.sql.gz' -mtime "+${RETENTION_DAYS}" -delete

echo "backup_complete file=$FILE bytes=$(wc -c < "$FILE")"
