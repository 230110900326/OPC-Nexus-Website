# 本地基础设施

在仓库根目录创建 `.env`（可从 `.env.example` 复制），并将 `POSTGRES_PASSWORD` 改为仅限本地使用的安全值。

Docker 可用后，在此目录执行：

```text
docker compose --env-file ../.env up -d
```

这会启动 PostgreSQL 17 与 Redis 8，并为两者创建持久化卷和健康检查。不要把实际密码提交到 Git。
