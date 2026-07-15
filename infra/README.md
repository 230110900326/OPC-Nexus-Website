# Docker 本地运行

Docker 配置是可选的，不会改变现有的 `npm run dev:web`、`npm run dev:api` 本地开发方式。

1. 从 `.env.example` 复制出根目录 `.env`，并替换 `POSTGRES_PASSWORD`、两个 JWT 密钥。
2. 在仓库根目录运行：

   ```powershell
   npm run docker:up
   ```

这会构建并启动完整本地栈：Next.js Web（3000）、NestJS API（4000）、FastAPI crawler（8000）、PostgreSQL（5432）和 Redis（6379）。API 在启动时会执行数据库迁移；上传文件和数据库数据通过 Docker volume 持久化。

常用命令：

```powershell
npm run docker:logs
npm run docker:down
```

若只需要基础设施，使用：

```powershell
docker compose --env-file .env -f infra/docker-compose.yml up -d postgres redis
```

不要提交 `.env` 或其中的真实密码。

如果当前网络无法连接 Docker Hub，可只在本机 `.env` 中覆盖基础镜像，不会影响仓库默认配置：

```dotenv
NODE_IMAGE=docker.m.daocloud.io/library/node:22-alpine
PYTHON_IMAGE=docker.m.daocloud.io/library/python:3.11-slim
POSTGRES_IMAGE=docker.m.daocloud.io/library/postgres:17-alpine
REDIS_IMAGE=docker.m.daocloud.io/library/redis:8-alpine
NPM_REGISTRY=https://registry.npmmirror.com
```
