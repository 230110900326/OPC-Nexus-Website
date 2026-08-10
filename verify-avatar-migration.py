"""本地运维脚本（不入库）：验证头像列迁移已上线 + 健康检查。"""
import sys, urllib.request
import paramiko

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
c = paramiko.SSHClient(); c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("120.26.129.29", username="root", password="QWqw15990116680", timeout=20, look_for_keys=False, allow_agent=False)

def q(sql):
    _, o, e = c.exec_command(f'docker exec opc-nexus-postgres-1 psql -U opc -d opc_nexus -t -A -c "{sql}"', timeout=30)
    return o.read().decode().strip() or e.read().decode().strip()

print("迁移记录:", q("SELECT name FROM migrations ORDER BY id DESC LIMIT 3;"))
print("列类型:", q("SELECT column_name || ' | ' || data_type FROM information_schema.columns WHERE table_name='users' AND column_name='avatar_url';"))
try:
    with urllib.request.urlopen(urllib.request.Request("http://120.26.129.29/api/health/ready"), timeout=20) as r:
        print("健康检查:", r.status)
except Exception as e:
    print("健康检查: ERR", e)
c.close()
print("=== 完成 ===")
