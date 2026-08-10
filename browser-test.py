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

def run(cmd, timeout=320):
    stdin, stdout, stderr = c.exec_command(cmd, timeout=timeout)
    return stdout.read().decode('utf-8', errors='replace').strip() + '\n' + stderr.read().decode('utf-8', errors='replace').strip()

print("=== 容器状态 ===")
print(run("docker ps --format '{{.Names}} | {{.Status}}' | grep crawler"))

# 在容器内用 BrowserSearcher 测试腾讯/抖音
script = '''
from app.browser_adapter import BrowserSearcher
from app.tencent_video_adapter import discover_tencent_videos
from app.douyin_adapter import discover_douyin_videos
b = BrowserSearcher()
print("playwright 可用:", b.available)
u1 = discover_tencent_videos("https://v.qq.com/", 15, b)
print("腾讯视频发现数量:", len(u1))
for x in u1[:5]: print("  ", x)
u2 = discover_douyin_videos("https://www.douyin.com/", 15, b)
print("抖音发现数量:", len(u2))
for x in u2[:5]: print("  ", x)
b.close()
'''
sftp = c.open_sftp()
with sftp.open('/tmp/browser_test.py', 'w') as f:
    f.write(script)
sftp.close()
print("=== 浏览器适配器测试 ===")
print(run("docker cp /tmp/browser_test.py opc-nexus-crawler-1:/tmp/browser_test.py && docker exec -w /app -e PYTHONPATH=/app opc-nexus-crawler-1 python /tmp/browser_test.py 2>&1 | tail -20"))
c.close()
