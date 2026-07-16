set -eu
echo DOCKER_VERSION
docker --version
docker compose version || true
echo COMPOSE_PROJECTS
docker compose ls || true
echo CONTAINERS
docker ps -a --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}'
echo COMPOSE_LABELS
for container_id in $(docker ps -aq); do
  docker inspect --format '{{.Name}}|project={{index .Config.Labels "com.docker.compose.project"}}|workdir={{index .Config.Labels "com.docker.compose.project.working_dir"}}|files={{index .Config.Labels "com.docker.compose.project.config_files"}}' "$container_id"
done
echo DIRECTORIES
find /opt /srv /root -maxdepth 2 -type f \( -name 'docker-compose.yml' -o -name 'compose.yml' -o -name 'compose.yaml' -o -name 'package.json' \) -print 2>/dev/null | sed -n '1,100p'
echo FIREWALL
if command -v firewall-cmd >/dev/null 2>&1; then
  firewall-cmd --state || true
  firewall-cmd --list-all || true
fi
echo LOCAL_HTTP
for url in http://127.0.0.1:3000 http://127.0.0.1:4000/health http://127.0.0.1:8000/health; do
  status=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 5 "$url" || true)
  echo "$url=$status"
done
