"""本地运维脚本（不入库）：列出所有需求（含软删）排查消失原因。"""
import sys
import paramiko

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
c = paramiko.SSHClient(); c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("120.26.129.29", username="root", password="QWqw15990116680", timeout=20, look_for_keys=False, allow_agent=False)

def q(sql):
    _, o, e = c.exec_command(f'docker exec opc-nexus-postgres-1 psql -U opc -d opc_nexus -c "{sql}"', timeout=30)
    return o.read().decode().strip() or e.read().decode().strip()

print("=== 所有需求（含软删）===")
print(q("SELECT title, status, demand_type, deadline, created_at, deleted_at, user_id FROM opc_demands ORDER BY created_at DESC;"))
print("=== 需求关联行业 ===")
print(q("SELECT d.title, s.name FROM opc_demands d LEFT JOIN opc_demand_industries di ON di.demand_id=d.id LEFT JOIN forum_sections s ON s.id=di.section_id ORDER BY d.created_at DESC;"))
print("=== 对接记录 ===")
print(q("SELECT id, demand_id, status, created_at FROM opc_demand_connects ORDER BY created_at DESC;"))
print("=== 审计日志中需求相关最近 15 条 ===")
print(q("SELECT action, target_type, target_id, metadata, created_at FROM audit_logs WHERE target_type='demand' OR action ILIKE '%demand%' ORDER BY created_at DESC LIMIT 15;"))
c.close()
print("=== 完成 ===")
