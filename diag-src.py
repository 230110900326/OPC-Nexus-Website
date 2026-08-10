"""本地运维脚本（不入库）：核对服务器源码与镜像是否含新 DTO。"""
import sys
import paramiko

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
c = paramiko.SSHClient(); c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("120.26.129.29", username="root", password="QWqw15990116680", timeout=20, look_for_keys=False, allow_agent=False)

def q(cmd):
    _, o, e = c.exec_command(cmd, timeout=60)
    return (o.read().decode().strip() or e.read().decode().strip())

print("服务器当前时间:", q("date -u +'%Y-%m-%d %H:%M:%S UTC'"))
print("=== 服务器源码 DTO 内容 ===")
print(q("cat /opt/opc-nexus/apps/api/src/users/dto/update-profile.dto.ts"))
print("=== 服务器源码迁移文件 ===")
print(q("ls /opt/opc-nexus/apps/api/src/database/migrations/ | grep avatar || echo '无 avatar 迁移'"))
print("=== api 镜像历史（最近 6 层） ===")
print(q("docker history --no-trunc --format '{{.ID}} {{.CreatedSince}} {{.CreatedBy}}' opc-nexus-api:latest 2>&1 | head -8"))
print("=== compose 里 api 构建上下文 ===")
print(q("grep -n -A 8 'opc-nexus-api:' /opt/opc-nexus/infra/docker-compose.yml | head -30"))
c.close()
print("=== 完成 ===")
