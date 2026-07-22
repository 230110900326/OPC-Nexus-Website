#!/bin/sh
set -eu

BASE_URL="${BASE_URL:?Set BASE_URL to the public site URL}"
test -f .env
docker compose --env-file .env -f infra/docker-compose.yml config --quiet
docker compose --env-file .env -f infra/docker-compose.yml up -d --build --remove-orphans

attempt=0
until curl --fail --silent --max-time 5 "${BASE_URL%/}/api/health/ready" >/dev/null; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 36 ]; then
    docker compose --env-file .env -f infra/docker-compose.yml ps
    docker compose --env-file .env -f infra/docker-compose.yml logs --tail=100 api web gateway
    exit 1
  fi
  sleep 5
done

node infra/scripts/smoke-test.mjs "$BASE_URL"
docker compose --env-file .env -f infra/docker-compose.yml ps
