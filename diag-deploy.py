"""本地运维脚本（不入库）：诊断 API 容器是否运行新代码。"""
import sys
import paramiko

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
c = paramiko.SSHClient(); c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("120.26.129.29", username="root", password="QWqw15990116680", timeout=20, look_for_keys=False, allow_agent=False)

def q(cmd):
    _, o, e = c.exec_command(cmd, timeout=60)
    return (o.read().decode().strip() or e.read().decode().strip())

print("=== dep-build 进程 ===")
print(q("pgrep -af dep-build || echo '无 dep-build 进程'"))
print("=== docker compose ps ===")
print(q("docker compose -f /opt/opc-nexus/infra/docker-compose.yml --profile full ps 2>&1 | head -20"))
print("=== api 容器镜像与创建时间 ===")
print(q("docker inspect --format '{{.Name}} image={{.Image}} created={{.Created}} started={{.State.StartedAt}}' opc-nexus-api-1 2>&1"))
print("=== api 镜像构建时间 ===")
print(q("docker images --format '{{.Repository}}:{{.Tag}} {{.CreatedSince}} {{.ID}}' | grep -i opc-nexus | head"))
print("=== /tmp/dep.log 尾部 30 行 ===")
print(q("tail -n 30 /tmp/dep.log"))
c.close()
print("=== 完成 ===")
