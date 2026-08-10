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

n = sys.argv[1] if len(sys.argv) > 1 else "15"
print("=== /tmp/dep.log 最近 {} 行 ===".format(n))
print(run("tail -n {} /tmp/dep.log".format(n)))
print("=== 进程 ===")
print(run("pgrep -f 'docker compose.*up -d --build' >/dev/null && echo BUILD_RUNNING || echo BUILD_DONE"))
c.close()
