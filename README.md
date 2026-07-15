# OPC Nexus

OPC 财经社群与行业内容聚合平台。品牌主张：**洞察 · 链接 · 增长**。

## 项目结构

```text
apps/
  web/       Next.js 用户端与管理端
  api/       NestJS 业务 API
  crawler/   FastAPI 采集与内容处理服务
packages/
  shared/    跨应用的类型与常量
  ui/        可复用 UI 组件
infra/       本地与生产基础设施配置
docs/        架构、接口和运维文档
```

## 本地启动（阶段 A）

1. 复制 `.env.example` 为 `.env` 并按本地环境调整。
2. 安装 Node.js 依赖：`npm install`。
3. 分别运行 `npm run dev:web` 与 `npm run dev:api`。
4. 打开 `http://localhost:3000`；首页会展示 API 健康状态。

采集服务需要 Python 3.11+。安装完成后，在 `apps/crawler` 创建虚拟环境并安装 `requirements.txt`，再运行 `python -m pytest tests -q`。本地 PostgreSQL 与 Redis 推荐通过 Docker Compose 启动，详见 [infra/README.md](infra/README.md)。未安装 Docker 时，仍可运行 Web、API 和采集服务的健康检查。

## 当前范围

阶段 B 已加入 PostgreSQL 迁移、账号认证、角色权限与个人资料模块。Docker 可用后，先启动基础设施，再从 `apps/api` 执行 `npm run migration:run`；所有 JWT 密钥只放在本地 `.env` 中。

后续开发以《财经社群与行业内容聚合平台建设方案》为准。
