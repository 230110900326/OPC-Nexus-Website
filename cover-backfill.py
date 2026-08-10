"""本地运维脚本（不入库）：生产 DB 封面回填 + 健康检查。"""
import paramiko, sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect("120.26.129.29", username="root", password="QWqw15990116680", timeout=20, look_for_keys=False, allow_agent=False)

def run(cmd, timeout=60):
    _, stdout, stderr = c.exec_command(cmd, timeout=timeout)
    return (stdout.read().decode("utf-8", errors="replace").strip()
            + "\n" + stderr.read().decode("utf-8", errors="replace").strip())

print("=== 回填前 NULL 封面数 ===")
print(run('docker exec opc-nexus-postgres-1 psql -U opc -d opc_nexus -t -c "SELECT count(*) FROM articles WHERE cover_image_url IS NULL OR cover_image_url=\'\';"'))
print("=== 执行回填 ===")
print(run('docker exec opc-nexus-postgres-1 psql -U opc -d opc_nexus -c "UPDATE articles SET cover_image_url = \'/api/covers/\' || slug WHERE cover_image_url IS NULL OR cover_image_url=\'\';"'))
print("=== 回填后剩余 ===")
print(run('docker exec opc-nexus-postgres-1 psql -U opc -d opc_nexus -t -c "SELECT count(*) FROM articles WHERE cover_image_url IS NULL OR cover_image_url=\'\';"'))
print("=== 健康检查 ===")
print(run("curl -s -o /dev/null -w 'ready:%{http_code}\\n' http://127.0.0.1/api/health/ready"))
c.close()
