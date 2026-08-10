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

def run(cmd, timeout=60):
    stdin, stdout, stderr = c.exec_command(cmd, timeout=timeout)
    return stdout.read().decode('utf-8', errors='replace').strip() + '\n' + stderr.read().decode('utf-8', errors='replace').strip()

print("备份:", run("cd /opt/opc-nexus && ts=$(date +%Y%m%d-%H%M%S) && cp -a infra infra.pbak-$ts && echo OK") or "(skip)")
sftp = c.open_sftp()
print("上传中...")
sftp.put('E:/OPC Nexus Website/opc-src-deploy.tar.gz', '/tmp/opc-src.tar.gz')
sftp.close()
print("大小:", run("ls -lh /tmp/opc-src.tar.gz | awk '{print $5}'"))
print("解压:", run("cd /opt/opc-nexus && tar -xzf /tmp/opc-src.tar.gz --exclude=pc --exclude=.agents && echo OK"))
print("chmod:", run("chmod +x /opt/opc-nexus/infra/scripts/*.sh && echo OK"))
print(".env:", run("test -s /opt/opc-nexus/.env && echo ENV_OK"))
c.close()
