set -eu
echo OPC_REMOTE_OK
uname -srm
. /etc/os-release
echo "OS=$PRETTY_NAME"
echo "ARCH=$(uname -m)"
for command_name in docker docker-compose nginx caddy git curl tar; do
  if command -v "$command_name" >/dev/null 2>&1; then
    echo "$command_name=$(command -v "$command_name")"
  else
    echo "$command_name=missing"
  fi
done
awk '/MemTotal/ {printf "MEM_MB=%d\n", $2/1024}' /proc/meminfo
df -h / | awk 'NR==2 {print "DISK=" $4 " free of " $2}'
echo LISTEN_BEGIN
ss -lntp 2>/dev/null | sed -n '1,30p'
echo LISTEN_END
