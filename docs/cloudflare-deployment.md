# Cloudflare 部署方案

本文针对 OPC Nexus 当前的运行形态（Next.js Web、NestJS API、PostgreSQL、Redis、Python/Playwright crawler）整理迁移方案。

## 先说结论

Cloudflare 的 DNS/CDN/WAF 可以直接接入当前项目，但 Cloudflare Pages/Workers 不能不改代码就运行整套 Docker Compose：

- NestJS API 使用 Express、TypeORM、PostgreSQL TCP 连接和本地文件系统；
- crawler 使用长驻 FastAPI、Redis 和 Playwright/Chromium；
- Web 还有使用 `node:fs` 读取法律文档的 Node.js 路由。

因此，保留现有功能的最快方案是：

```text
用户 → Cloudflare DNS / HTTPS / WAF
                  ↓
       一台可运行 Docker 的主机（Web + API + crawler）
                  ↓
       PostgreSQL + Redis       Cloudflare R2（图片）
```

Cloudflare 负责域名和边缘网络，应用仍按仓库现有的 `infra/docker-compose.yml` 运行。Docker 主机可以是新的低价 VPS、其他云厂商实例，或者临时使用已有机器配合 Cloudflare Tunnel。

## 推荐迁移步骤

### 1. 准备外部依赖

至少需要：

1. 一台能运行 Docker Compose 的 Linux 主机（建议 2 vCPU、4 GB RAM 起步；启用 crawler/Playwright 时留出更多内存）。
2. 一个可访问的 PostgreSQL 17 数据库。可以运行在同一主机，也可以使用托管 PostgreSQL。
3. Redis（crawler 的队列和部分后台任务需要）。
4. Cloudflare R2 bucket，用于替代 API 容器的本地 `uploads` volume。

Cloudflare 本身不提供与当前 PostgreSQL/Redis/Playwright 代码直接兼容的 Docker Compose 运行环境。不要把 PostgreSQL 端口或 Redis 端口公开到互联网。

### 2. 在 Cloudflare 创建 R2 存储

创建 bucket 和一对 S3 API 凭据后，建议给 bucket 绑定独立资源域名，例如 `assets.example.com`。生产环境不要依赖临时的 `r2.dev` 公共地址。

API 使用的环境变量如下（值仅放在服务器密钥管理或 `.env`，不要提交 Git）：

```dotenv
STORAGE_DRIVER=s3
S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
S3_REGION=auto
S3_BUCKET=opc-assets
S3_ACCESS_KEY_ID=<r2-access-key>
S3_SECRET_ACCESS_KEY=<r2-secret-key>
S3_PUBLIC_BASE_URL=https://assets.example.com
```

### 3. 配置生产环境变量

如果 Web 和 API 通过现有 Nginx 使用同一个域名，推荐这样设置：

```dotenv
NEXT_PUBLIC_SITE_URL=https://example.com
NEXT_PUBLIC_API_BASE_URL=/api
API_PUBLIC_URL=https://example.com/api
API_INTERNAL_URL=http://api:4000
WEB_ORIGIN=https://example.com
COOKIE_SECURE=true
REFRESH_COOKIE_PATH=/api

DB_HOST=<postgres-host>
DB_PORT=5432
DB_NAME=opc_nexus
DB_USER=<database-user>
DB_PASSWORD=<strong-password>
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=true

CRAWLER_API_URL=http://api:4000
CRAWLER_SERVICE_URL=http://crawler:8000
CRAWLER_API_TOKEN=<at-least-32-random-characters>
```

`API_PUBLIC_URL` 要带 `/api`，因为当前网关把 `/api/uploads/*` 转发到 API；使用 R2 后图片链接会由 `S3_PUBLIC_BASE_URL` 生成。

如果 PostgreSQL 服务商强制 SSL，需要在上线前确认当前 TypeORM 配置是否已开启 SSL，或在代码中增加 `DB_SSL`/连接串支持；不要把数据库改成明文公网连接。

### 4. 迁移数据库和图片

旧阿里云主机仍可访问时，先做一致性备份：

```bash
pg_dump --format=custom --no-owner --no-acl \
  --host "$OLD_DB_HOST" --port "$OLD_DB_PORT" \
  --username "$OLD_DB_USER" --dbname "$OLD_DB_NAME" \
  --file opc_nexus.dump
```

在新 PostgreSQL 恢复：

```bash
pg_restore --clean --if-exists --no-owner --dbname "$NEW_DATABASE_URL" opc_nexus.dump
```

旧 API 使用本地 `uploads` 时，还要单独把上传目录同步到 R2；仅恢复 PostgreSQL 不会恢复图片文件。如果旧主机已经无法启动，先保留磁盘/容器卷，不要直接删除，数据库和图片需要分别抢救。

### 5. 启动应用

在新主机上：

```bash
git clone git@github.com:230110900326/OPC-Nexus-Website.git /opt/opc-nexus
cd /opt/opc-nexus
cp .env.example .env
# 编辑 .env，填入上面的生产值和 JWT/SMTP 配置
docker compose --env-file .env -f infra/docker-compose.yml config --quiet
docker compose --env-file .env -f infra/docker-compose.yml --profile full up -d --build
docker compose --env-file .env -f infra/docker-compose.yml ps
```

先确认以下接口在主机本地返回成功：

```text
/healthz
/api/health
/api/health/ready
```

### 6. 将域名接到 Cloudflare

可以选择两种方式：

#### 直接代理到主机

- 创建 `A` 记录指向主机公网 IP；
- 打开 Cloudflare 代理（橙色云）；
- SSL/TLS 选择 `Full (strict)`，在源站配置 Cloudflare Origin Certificate 或 Let's Encrypt；
- 只开放 80/443，数据库和 Redis 仅允许内网访问。

#### 使用 Cloudflare Tunnel

如果不想开放源站端口，可以使用仓库新增的可选 Compose 覆盖文件。先在 Cloudflare 创建 remotely-managed tunnel，把 public hostname 的 origin 设置为 `http://gateway:80`，然后在服务器 `.env` 中加入私密 token：

控制台操作路径通常是 `Zero Trust → Networks → Tunnels → Create tunnel`：选择 Docker connector，添加 public hostname，并把 service 填为 `http://gateway:80`。创建后复制 connector token 到服务器；不要把 token 提交到 Git 或发到聊天中。

```dotenv
CLOUDFLARE_TUNNEL_TOKEN=<keep-this-private>
# 可选：固定 cloudflared 镜像版本，而不是使用 latest
CLOUDFLARED_TAG=latest
# Tunnel 容器通过 Docker 网络访问 gateway；不需要开放宿主机端口。
GATEWAY_BIND_ADDRESS=127.0.0.1
```

启动完整服务和 tunnel：

```bash
docker compose --env-file .env \
  -f infra/docker-compose.yml \
  -f infra/docker-compose.cloudflare.yml \
  --profile full --profile cloudflare up -d --build
```

Tunnel 方式不需要把源站 IP 暴露给公网，但 Docker 主机仍必须持续运行。若使用直接 `A` 记录代理，则不需要这个 Compose 覆盖文件。

#### Windows 主机连接器（Docker Hub 不可用时）

如果应用运行在 Windows 的 Docker Desktop 中、但 Docker 守护进程无法下载 `cloudflare/cloudflared` 镜像，可以让官方 Windows 版 `cloudflared` 直接访问宿主机网关。此时不要同时启用 Compose 中的 `cloudflared` 服务。

```powershell
winget install --id Cloudflare.cloudflared --exact
cloudflared tunnel login
cloudflared tunnel create opc-nexus
cloudflared tunnel route dns --overwrite-dns opc-nexus example.com
```

在用户目录下的 `.cloudflared` 创建 `config.yml`，将 `tunnel` 和 `credentials-file` 替换为实际值，并让 origin 指向 Docker 已发布的本机端口：

```yaml
tunnel: <tunnel-uuid>
credentials-file: 'C:\Users\<user>\.cloudflared\<tunnel-uuid>.json'

ingress:
  - hostname: example.com
    service: http://127.0.0.1:8080
  - service: http_status:404
```

随后执行 `powershell -File infra/scripts/run-cloudflared-tunnel.ps1`。为避免凭据进入 Git，`.cloudflared/` 必须保持在 `.gitignore` 中；Windows 主机需要持续运行，并在用户登录后启动该命令。

若使用直接 `A` 记录而不是 Tunnel，则将 `GATEWAY_BIND_ADDRESS=0.0.0.0`，并由防火墙仅放行 80/443；不要向公网开放 PostgreSQL、Redis、API 或 crawler 端口。

## 不建议直接改成 Cloudflare Workers 的原因

当前项目不能直接通过 Pages 的“静态站点”方式部署：页面中有动态服务端渲染、`force-dynamic` 路由和 Node 文件读取。把 API 全部搬到 Workers 还需要同时重写 Express/Nest 启动层、数据库访问（D1/Hyperdrive）、文件存储、Redis 队列和定时爬虫，属于一次架构迁移，不是重新上传一次代码。

如果后续确实要“全部 Cloudflare 原生化”，建议分阶段：

1. 先把图片迁到 R2；
2. API 继续放容器，稳定域名和数据；
3. 再单独评估 Next.js 的 Workers 适配；
4. 最后才考虑把部分 API/队列迁到 Workers、D1、Queues 或 Hyperdrive。

## 上线验收

```bash
node infra/scripts/smoke-test.mjs https://example.com
```

随后手工验证：注册/登录/刷新会话、文章读取、图片上传、社区互动、活动报名、管理员审核和 crawler 的一次手动采集。确认 Cloudflare 的 SSL 模式、缓存规则没有缓存 `/api/*`、登录响应中的 `refresh_token` cookie 带有 `Secure` 且路径为 `/api`。
