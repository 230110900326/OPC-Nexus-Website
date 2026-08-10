"""本地运维脚本（不入库）：延长"寻找能源产业相关的合作者"截止时间 +30 天，使其重新可见。"""
import sys
import paramiko

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
c = paramiko.SSHClient(); c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("120.26.129.29", username="root", password="QWqw15990116680", timeout=20, look_for_keys=False, allow_agent=False)

def q(sql):
    _, o, e = c.exec_command(f'docker exec opc-nexus-postgres-1 psql -U opc -d opc_nexus -c "{sql}"', timeout=30)
    return o.read().decode().strip() or e.read().decode().strip()

print("=== 更新前 ===")
print(q("SELECT title, status, deadline FROM opc_demands WHERE title='寻找能源产业相关的合作者';"))
print("=== 更新截止时间 +30 天 ===")
print(q("UPDATE opc_demands SET deadline = NOW() + interval '30 days', updated_at = NOW() WHERE title='寻找能源产业相关的合作者';"))
print("=== 更新后 ===")
print(q("SELECT title, status, deadline, (deadline > NOW()) AS not_expired FROM opc_demands WHERE title='寻找能源产业相关的合作者';"))
c.close()
print("=== 完成 ===")
