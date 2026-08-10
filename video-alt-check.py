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

targets = [
    ("bilibili(基线)", "https://www.bilibili.com/"),
    ("腾讯视频", "https://v.qq.com/"),
    ("西瓜视频", "https://www.ixigua.com/"),
    ("好看视频", "https://haokan.baidu.com/"),
    ("抖音(基线)", "https://www.douyin.com/"),
    ("爱奇艺", "https://www.iqiyi.com/"),
]
print("=== 平台连通性（HTTP 状态码）===")
for name, url in targets:
    print(run("curl -s -o /dev/null -w '{name}: %{{http_code}} (%{{time_total}}s)\\n' --max-time 12 -L '{url}'".format(name=name, url=url)))

print("=== 腾讯视频搜索页（是否可解析）===")
print(run("curl -s --max-time 12 'https://v.qq.com/x/search/?q=人工智能' | head -c 200"))
print("=== 西瓜视频 API 探测 ===")
print(run("curl -s -o /dev/null -w 'ixigua 首页: %{http_code}\\n' --max-time 12 'https://www.ixigua.com/'"))
c.close()
