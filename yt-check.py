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

print("=== YouTube 视频来源配置 ===")
print(run(psql + "\"SELECT name, domain, type, fetch_method, entry_url, schedule_minutes, trust_level, authorization_status, is_enabled, auto_publish, keywords FROM crawl_sources WHERE type='video';\""))
print("=== YouTube 来源的最近抓取记录 ===")
print(run(psql + "\"SELECT j.status, j.started_at, j.discovered_count, j.error_message FROM crawl_jobs j JOIN crawl_sources s ON s.id = j.source_id WHERE s.name LIKE '%YouTube%' ORDER BY j.started_at DESC LIMIT 5;\""))
print("=== 爬虫日志（YouTube 相关）===")
print(run("docker logs --tail 30 opc-nexus-crawler-1 2>&1 | grep -iE 'youtube|error|failed' | tail -10"))
c.close()
