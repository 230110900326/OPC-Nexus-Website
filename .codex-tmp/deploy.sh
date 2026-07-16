set -eu

archive=/tmp/opc-nexus-release.tar.gz
current=/opt/opc-nexus
stamp=$(date +%Y%m%d-%H%M%S)
release="/opt/opc-nexus-release-$stamp"
backup="/opt/opc-nexus-backup-$stamp"

test -s "$archive"
test -s "$current/.env"
mkdir -p "$release"
tar -xzf "$archive" -C "$release"
cp -p "$current/.env" "$release/.env"
chmod 600 "$release/.env"

set_env() {
  key=$1
  value=$2
  if grep -q "^${key}=" "$release/.env"; then
    sed -i "s|^${key}=.*|${key}=${value}|" "$release/.env"
  else
    printf '%s=%s\n' "$key" "$value" >> "$release/.env"
  fi
}

set_env NEXT_PUBLIC_API_BASE_URL /api
set_env API_PUBLIC_URL http://121.40.224.152/api
set_env WEB_ORIGIN http://121.40.224.152
set_env PUBLIC_HTTP_PORT 80
set_env NGINX_IMAGE docker.m.daocloud.io/library/nginx:1.27-alpine

cd "$release"
docker compose --env-file .env -f infra/docker-compose.yml config --quiet

echo BUILD_API
docker compose --env-file .env -f infra/docker-compose.yml build api
echo BUILD_CRAWLER
docker compose --env-file .env -f infra/docker-compose.yml build crawler
echo BUILD_WEB
docker compose --env-file .env -f infra/docker-compose.yml build web
echo PULL_GATEWAY
docker compose --env-file .env -f infra/docker-compose.yml pull gateway

echo ACTIVATE_RELEASE
mv "$current" "$backup"
mv "$release" "$current"
cd "$current"

docker compose --env-file .env -f infra/docker-compose.yml up -d --remove-orphans
docker compose --env-file .env -f infra/docker-compose.yml up -d --force-recreate --no-deps gateway

wait_url() {
  name=$1
  url=$2
  attempts=60
  while [ "$attempts" -gt 0 ]; do
    code=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 3 "$url" || true)
    if [ "$code" = 200 ]; then
      echo "$name=200"
      return 0
    fi
    attempts=$((attempts - 1))
    sleep 2
  done
  echo "$name=FAILED"
  return 1
}

wait_url WEB http://127.0.0.1:3000
wait_url API http://127.0.0.1:4000/health
wait_url CRAWLER http://127.0.0.1:8000/health
wait_url GATEWAY_WEB http://127.0.0.1/
wait_url GATEWAY_API http://127.0.0.1/api/health

echo COMPOSE_STATUS
docker compose --env-file .env -f infra/docker-compose.yml ps
echo BACKUP=$backup
rm -f "$archive"
