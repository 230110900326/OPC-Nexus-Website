"""本地运维脚本（不入库）：清理 QA 功能验证留下的测试评论/举报（仅限测试标记前缀）。"""
import sys
import paramiko

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("120.26.129.29", username="root", password="QWqw15990116680", timeout=20, look_for_keys=False, allow_agent=False)

def q(sql):
    _, o, e = c.exec_command(f'docker exec opc-nexus-postgres-1 psql -U opc -d opc_nexus -c "{sql}"', timeout=30)
    return (o.read().decode().strip() or e.read().decode().strip()).split("\n")[-1]

print("先看将删除的测试评论:")
print(q("SELECT id || ' | ' || body FROM comments WHERE body LIKE 'QA-children-check%' OR body LIKE 'QA功能验证%';"))
print("删除测试评论对应的举报(先删):",
      q("DELETE FROM reports WHERE target_type='comment' AND target_id IN (SELECT id FROM comments WHERE body LIKE 'QA-children-check%' OR body LIKE 'QA功能验证%');"))
print("删除测试评论(窄范围):",
      q("DELETE FROM comments WHERE body LIKE 'QA-children-check%' OR body LIKE 'QA功能验证%';"))
print("残留检查:", q("SELECT count(*) FROM comments WHERE body LIKE 'QA-children-check%' OR body LIKE 'QA功能验证%';"))
c.close()
print("=== 完成 ===")
