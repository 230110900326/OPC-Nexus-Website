# Docker 接入与验证日志

更新日期：2026-07-16（Asia/Shanghai）

## 最终结果

Docker Desktop、WSL 2 和项目完整容器栈已验证可用。最终检查时五个服务均保持运行：

| 服务 | 容器 | 端口 | 验证结果 |
| --- | --- | --- | --- |
| Next.js Web | `opc-nexus-web-1` | 3000 | `GET /` 返回 HTTP 200 |
| NestJS API | `opc-nexus-api-1` | 4000 | `GET /health` 返回 HTTP 200 |
| FastAPI crawler | `opc-nexus-crawler-1` | 8000 | `GET /health` 返回 HTTP 200 |
| PostgreSQL 17 | `opc-nexus-postgres-1` | 5432 | Docker healthcheck 为 healthy |
| Redis 8 | `opc-nexus-redis-1` | 6379 | Docker healthcheck 为 healthy |

API 启动时会自动执行 TypeORM 迁移；本次日志显示 `No migrations are pending`，随后 Nest 应用成功启动。PostgreSQL、Redis 与上传文件使用 Docker named volumes 持久化。

## 故障与处理记录

### 1. WSL 后端无法启动

- 现象：Docker Desktop 长时间加载，Docker API 返回 500。
- 原因：Windows 的 WSL 版本过旧。
- 处理：更新至 WSL 2.7.10，重启 Windows。
- 验证：`docker run hello-world` 成功。

### 2. Docker Hub 认证连接失败

- 现象：拉取 `node:22-alpine`、`python:3.11-slim` 时访问 `auth.docker.io` 超时。
- 根因：本机 DNS 将 `auth.docker.io` 与 `registry-1.docker.io` 错误解析到 Meta/Facebook 等无关地址；普通公共 DNS 查询同样受到影响。
- 处理：Dockerfile 支持通过构建参数覆盖基础镜像；本机 Git 忽略的 `.env` 使用可访问的镜像源。仓库默认值仍是 Docker Hub 官方镜像，不影响其他环境。

### 3. npm 官方仓库连接重置

- 现象：基础镜像下载成功后，容器内 `npm ci` 报 `ECONNRESET`。
- 处理：新增 `NPM_REGISTRY` 构建参数，本机 `.env` 使用 `https://registry.npmmirror.com`。

### 4. Docker 构建上下文过大

- 现象：首次构建传输约 737 MB 上下文。
- 原因：嵌套的 `.next`、`node_modules` 和 TypeScript 构建缓存未被递归排除。
- 处理：补充根目录 `.dockerignore`。修复后 Web/API 上下文降至 KB 级，且保留 `apps/api/src/uploads` 源码模块。

### 5. workspace 运行依赖缺失

- 现象：API 报 `typeorm: not found`，Web 报 `next: not found`，退出码为 127。
- 原因：npm workspace 的运行依赖位于应用自己的 `node_modules` 中。
- 处理：生产镜像同时复制根依赖和对应 workspace 依赖，并使用 `npm prune --omit=dev` 清理开发依赖。

### 6. API 依赖注入失败

- 现象：Nest 无法在 `UploadsModule` 中解析 `JwtAuthGuard` 的 `JwtService`。
- 处理：`AuthModule` 同时导出 `JwtModule` 与 `TypeOrmModule`，守卫依赖可以跨模块解析。

### 7. Web 生产启动尝试安装 TypeScript

- 现象：`next start` 读取 `next.config.ts` 后尝试通过 Yarn 在线安装 TypeScript，导致启动等待。
- 处理：配置仍在构建阶段使用，但不复制到已完成构建的生产运行镜像。

### 8. PostgreSQL 端口冲突

- 现象：5432 被早期验证遗留的 `infra-postgres-1` 占用。
- 处理：停止旧容器但保留数据卷，正式项目容器 `opc-nexus-postgres-1` 成功接管端口。

## 新增或修改的 Docker 文件

- `.dockerignore`
- `apps/api/Dockerfile`
- `apps/web/Dockerfile`
- `apps/crawler/Dockerfile`
- `infra/docker-compose.yml`
- `infra/README.md`
- 根 `package.json` 的 Docker 快捷命令
- `apps/api/src/auth/auth.module.ts` 的运行时依赖修复

本机 `.env` 包含开发环境密码、镜像源覆盖与 npm 源覆盖，已由 `.gitignore` 排除，禁止提交。

## 日常命令

在仓库根目录运行：

```powershell
npm run docker:up
npm run docker:logs
npm run docker:down
```

只启动 PostgreSQL 和 Redis：

```powershell
docker compose --env-file .env -f infra/docker-compose.yml up -d postgres redis
```

查看状态或最近日志：

```powershell
docker compose --env-file .env -f infra/docker-compose.yml ps
docker compose --env-file .env -f infra/docker-compose.yml logs --tail 100
```

Docker 栈运行时占用 3000、4000、8000、5432、6379。切换回本机 `npm run dev:*` 前先运行 `npm run docker:down`，避免端口冲突。

## 已知非阻塞警告

- Next.js 构建会提示 lockfile 缺少 SWC 平台依赖并尝试修补，但当前镜像构建成功。
- CSS 构建会提示部分 `start/end` 浏览器兼容性警告，不影响当前运行。
- Redis 当前配置仅用于本地开发且未启用认证，不应直接用于公网生产环境。
