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

print("停止构建进程:")
print(run("pkill -f 'docker compose.*up -d --build' 2>/dev/null; pkill -f 'buildkit' 2>/dev/null; sleep 2; pgrep -f 'docker compose.*up -d --build' >/dev/null && echo STILL_RUNNING || echo STOPPED"))
c.close()
