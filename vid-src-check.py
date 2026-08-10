import paramiko
import sys

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('120.26.129.29', username='root', password='QWqw15990116680', timeout=20, look_for_keys=False, allow_agent=False)

def run(cmd, timeout=40):
    stdin, stdout, stderr = c.exec_command(cmd, timeout=timeout)
    return stdout.read().decode('utf-8', errors='replace').strip() + '\n' + stderr.read().decode('utf-8', errors='replace').strip()

psql = ("DBU=$(grep -E '^POSTGRES_USER=' /opt/opc-nexus/.env | cut -d= -f2); "
        "DBP=$(grep -E '^POSTGRES_PASSWORD=' /opt/opc-nexus/.env | cut -d= -f2); "
        "DBN=$(grep -E '^POSTGRES_DB=' /opt/opc-nexus/.env | cut -d= -f2); "
        "docker exec -e PGPASSWORD=\"$DBP\" opc-nexus-postgres-1 psql -U \"$DBU\" -d \"$DBN\" -t -A -c ")

print("=== 全部采集源（含禁用）类型 ===")
print(run(psql + "\"SELECT name, domain, type, fetch_method, is_enabled FROM crawl_sources ORDER BY type, name;\""))
print("=== 视频的 creator_account（来源映射）===")
print(run(psql + "\"SELECT ca.platform, ca.platform_account_id, c.name FROM creator_accounts ca JOIN creators c ON c.id = ca.creator_id GROUP BY ca.platform, ca.platform_account_id, c.name LIMIT 8;\""))
print("=== 视频平台与数量 ===")
print(run(psql + "\"SELECT platform, COUNT(*) FROM videos GROUP BY platform;\""))
c.close()
