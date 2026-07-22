# OPC Nexus 生产运行手册

## 启动

1. 从 `.env.example` 创建服务器 `.env`，设置不同的 32 字节以上 JWT 密钥、强数据库密码、站点地址与允许来源。
2. 验证配置：`docker compose --env-file .env -f infra/docker-compose.yml config --quiet`。
3. 发布：`BASE_URL=http://your-host sh infra/scripts/deploy-production.sh`。

默认启动 PostgreSQL、API、Web、Nginx 和每日备份；Redis 与 Crawler 只在 `--profile full` 时启动。

## 健康与日志

- 网关：`/healthz`
- API 存活：`/api/health`
- API 与数据库就绪：`/api/health/ready`
- 容器状态：`docker compose --env-file .env -f infra/docker-compose.yml ps`
- 日志：`docker compose --env-file .env -f infra/docker-compose.yml logs --tail=200 api web gateway`

Docker 日志按单文件 10 MB、最多 5 个文件轮转。API 会记录接口状态、耗时、慢请求和错误；Crawler 会记录任务结果。

每 5 分钟监控示例：

```cron
*/5 * * * * cd /opt/opc-nexus && BASE_URL=http://127.0.0.1 PUBLIC_HTTP_PORT=80 sh infra/scripts/production-monitor.sh >> /var/log/opc-nexus-monitor.log 2>&1
```

设置 `ALERT_WEBHOOK_URL` 后，失败会发送企业消息 Webhook；未配置时仅记录日志并返回非零状态。

## 备份与恢复

备份容器每 24 小时执行一次 `pg_dump`，以 gzip 保存并校验，默认保留 14 天。查看文件：

```bash
docker compose --env-file .env -f infra/docker-compose.yml exec backup ls -lh /backups
```

恢复必须显式确认，建议先在隔离环境演练：

```bash
docker compose --env-file .env -f infra/docker-compose.yml exec \
  -e RESTORE_CONFIRM=RESTORE_OPC_NEXUS backup \
  sh /scripts/restore-postgres.sh /backups/opc_nexus_TIMESTAMP.sql.gz
```

对象存储同步是可选 profile：配置 `S3_BACKUP_URI`、标准 AWS 凭据后运行 `docker compose --profile backup-s3 up -d backup-uploader`。所有密钥只从环境变量读取。

## HTTPS

IP 地址部署先使用 HTTP。域名解析完成后，按 `infra/nginx.https.conf.example` 挂载真实证书、启用 443，并将 `COOKIE_SECURE=true`、`NEXT_PUBLIC_SITE_URL`、`WEB_ORIGIN` 和 `API_PUBLIC_URL` 改为 HTTPS 地址后重建 Web/API。

## 上线后低风险验证

运行 `node infra/scripts/smoke-test.mjs https://your-domain`。随后人工验证一次正常账号登录/退出、文章原文跳转、社区互动、活动报名和管理员审核；不要用生产冒烟脚本批量创建数据。
