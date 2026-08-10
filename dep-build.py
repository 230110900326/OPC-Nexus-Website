import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('120.26.129.29', username='root', password='QWqw15990116680', timeout=20, look_for_keys=False, allow_agent=False)
cmd = ("cd /opt/opc-nexus && "
       "export NPM_REGISTRY=https://registry.npmmirror.com && "
       "export COMPOSE_PARALLEL_LIMIT=1 && "
       "nohup docker compose --env-file .env -f infra/docker-compose.yml --profile full up -d --build "
       "> /tmp/dep.log 2>&1 & echo LAUNCHED")
stdin, stdout, stderr = c.exec_command(cmd, timeout=10)
print(stdout.read().decode('utf-8', errors='replace').strip())
c.close()
