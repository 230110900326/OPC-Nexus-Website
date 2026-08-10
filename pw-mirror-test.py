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

urls = [
    "https://cdn.npmmirror.com/binaries/playwright/chromium-1148.zip",
    "https://npmmirror.com/mirrors/playwright/chromium-1148.zip",
    "https://playwright.azureedge.net/builds/chromium/1148/chromium-linux.zip",
    "https://playwright.download.prss.microsoft.com/dbazure/download/playwright/builds/chromium/1148/chromium-linux.zip",
]
print("=== 各镜像可达性 ===")
for u in urls:
    print(run("curl -s -o /dev/null -w '{host}: %{{http_code}} size=%{{size_download}}\\n' -I --max-time 15 '{url}'".format(host=u.split('/')[2], url=u)))
c.close()
