set -eu
cd /opt/opc-nexus
echo PUBLIC_ENV
awk -F= '$1 ~ /^(NEXT_PUBLIC_API_BASE_URL|API_PUBLIC_URL|WEB_ORIGIN|API_PORT|WEB_PORT|CRAWLER_PORT|NODE_IMAGE|PYTHON_IMAGE|POSTGRES_IMAGE|REDIS_IMAGE|NPM_REGISTRY)$/ {print}' .env
echo SECRET_ENV_STATUS
for key in POSTGRES_PASSWORD JWT_ACCESS_SECRET JWT_REFRESH_SECRET DB_PASSWORD; do
  value=$(awk -F= -v wanted="$key" '$1 == wanted {sub(/^[^=]*=/, ""); print; exit}' .env)
  if [ -n "$value" ]; then echo "$key=SET"; else echo "$key=EMPTY"; fi
done
echo FILE_STATUS
stat -c '%y %s %n' package.json package-lock.json infra/docker-compose.yml apps/web/app/page.tsx apps/api/src/app.module.ts
echo RESOURCES
free -h
swapon --show || true
docker stats --no-stream --format 'table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}'
du -sh /opt/opc-nexus
