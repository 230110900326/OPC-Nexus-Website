#!/bin/bash
# ==========================================
# OPC Nexus 快速部署脚本
# 用法: ./deploy.sh [api|web|all]
#   ./deploy.sh web   → 只部署前端
#   ./deploy.sh api   → 只部署后端
#   ./deploy.sh all   → 部署全部（默认）
# ==========================================
set -e

HOST="120.26.129.29"
PASS="QWqw15990116680"
TARGET="${1:-all}"
NPM_MIRROR="https://registry.npmmirror.com"

echo "🚀 OPC Nexus 部署: $TARGET"

# ---- 构建 ----
if [ "$TARGET" = "all" ] || [ "$TARGET" = "api" ]; then
  echo "📦 构建 API 镜像..."
  docker build -t opc-nexus-api:latest -f apps/api/Dockerfile \
    --build-arg NPM_REGISTRY="$NPM_MIRROR" .
fi

if [ "$TARGET" = "all" ] || [ "$TARGET" = "web" ]; then
  echo "📦 构建 Web 镜像..."
  docker build -t opc-nexus-web:latest -f apps/web/Dockerfile \
    --build-arg NEXT_PUBLIC_API_BASE_URL=/api \
    --build-arg NEXT_PUBLIC_SITE_URL=http://120.26.129.29 \
    --build-arg NPM_REGISTRY="$NPM_MIRROR" .
fi

# ---- 导出 ----
echo "📤 导出镜像..."
IMAGES="opc-nexus-api:latest opc-nexus-web:latest"
docker save $IMAGES -o /tmp/opc-deploy.tar

# ---- 上传 & 部署 ----
echo "📡 上传到服务器..."
python3 -c "
import paramiko, time

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('$HOST', username='root', password='$PASS', timeout=20, look_for_keys=False, allow_agent=False)

# Upload
sftp = c.open_sftp()
sftp.put('/tmp/opc-deploy.tar', '/tmp/opc-deploy.tar')
sftp.close()
print('✅ 上传完成')

# Stop → Load → Start
c.exec_command('cd /opt/opc-nexus && docker compose --env-file .env -f infra/docker-compose.yml down 2>&1', timeout=30)
c.exec_command('docker rmi opc-nexus-api:latest opc-nexus-web:latest 2>&1 || true', timeout=10)
print('⏳ 加载镜像...')
stdin,stdout,stderr = c.exec_command('docker load -i /tmp/opc-deploy.tar 2>&1', timeout=120)
out = stdout.read().decode('utf-8', errors='replace')
for line in out.split(chr(10)):
    if 'Loaded' in line: print(' ', line.strip())

stdin,stdout,stderr = c.exec_command('cd /opt/opc-nexus && docker compose --env-file .env -f infra/docker-compose.yml up -d 2>&1', timeout=120)
out = stdout.read().decode('utf-8', errors='replace')
err = stderr.read().decode('utf-8', errors='replace')
if out.strip(): print(out.strip()[-300:])
if err.strip(): print('⚠️', err.strip()[-300:])

time.sleep(40)
stdin,stdout,stderr = c.exec_command('docker ps --format \"table {{.Names}}\t{{.Status}}\"')
print(chr(10) + '📊 容器状态:' + chr(10) + stdout.read().decode('utf-8', errors='replace'))

c.close()
"

echo ""
echo "=========================================="
echo "✅ 部署完成！访问: http://120.26.129.29"
echo "=========================================="
