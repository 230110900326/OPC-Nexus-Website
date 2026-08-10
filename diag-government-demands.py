"""本地运维脚本（不入库）：排查"政府"类需求从需求广场消失的原因。"""
import sys
import paramiko

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
c = paramiko.SSHClient(); c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("120.26.129.29", username="root", password="QWqw15990116680", timeout=20, look_for_keys=False, allow_agent=False)

def q(sql):
    _, o, e = c.exec_command(f'docker exec opc-nexus-postgres-1 psql -U opc -d opc_nexus -c "{sql}"', timeout=30)
    return o.read().decode().strip() or e.read().decode().strip()

print("=== 行业分类中含'政府'的板块 ===")
print(q("SELECT id, name, slug, is_active FROM forum_sections WHERE name ILIKE '%政府%' OR slug ILIKE '%gov%' OR slug ILIKE '%government%';"))
print("=== 全部论坛板块（名称+is_active） ===")
print(q("SELECT id, name, is_active FROM forum_sections ORDER BY sort_order NULLS LAST, name;"))
print("=== 需求数量按状态 ===")
print(q("SELECT status, count(*) FROM opc_demands WHERE deleted_at IS NULL GROUP BY status ORDER BY status;"))
c.close()
print("=== 完成 ===")
