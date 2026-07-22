#!/bin/sh
set -eu

FILE="${1:-}"
if [ -z "$FILE" ] || [ ! -f "$FILE" ]; then
  echo "usage: restore-postgres.sh /backups/opc_nexus_TIMESTAMP.sql.gz" >&2
  exit 2
fi
if [ "${RESTORE_CONFIRM:-}" != "RESTORE_OPC_NEXUS" ]; then
  echo "set RESTORE_CONFIRM=RESTORE_OPC_NEXUS before restoring" >&2
  exit 2
fi

gzip -t "$FILE"
gzip -dc "$FILE" | psql --host "${DB_HOST:-postgres}" --port "${DB_PORT:-5432}" --username "${POSTGRES_USER:-opc}" --dbname "${POSTGRES_DB:-opc_nexus}" --single-transaction --set ON_ERROR_STOP=on
echo "restore_complete file=$FILE"
