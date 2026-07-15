# 部署状态日志

更新时间：2026-07-15

## 当前状态

| 项目 | 状态 | 说明 |
| --- | --- | --- |
| 前端 `opc-nexus-website-web` | 已部署 | Vercel 已成功部署主分支提交 `9bcad50`（Next.js 安全补丁已升级至 15.4.11）。页面可用于视觉和导航预览。 |
| 后端 `opc-nexus-website-api` | 构建完成，运行未完成 | 最近一次实际构建来自提交 `9368854`。访问时曾出现 Vercel Serverless Function 崩溃。 |
| 后端最新提交 | 已跳过构建 | 提交 `9bcad50` 仅修改前端依赖，Vercel 判定 API 未受影响，因此没有重新部署后端。 |
| PostgreSQL | 未部署 | 后端尚未连接正式云数据库。 |
| Redis | 未部署 | 缓存与限流服务尚未部署。 |
| 爬虫服务 | 未部署 | `apps/crawler` 目前未接入生产环境。 |

## 已确认问题

1. 后端需要 PostgreSQL 连接信息、JWT 密钥等环境变量；Vercel 不会自动读取 `.env.example`。
2. 后端默认数据库地址为 `localhost`，Vercel 运行环境中没有本地 PostgreSQL。
3. API 项目启用了 Vercel 访问保护。未登录访问 `/health` 时会返回 Vercel 登录页面，而不是 API 数据。
4. NestJS 当前使用 `app.listen()` 启动方式，需要改造成适合 Vercel Serverless Function 的入口，或改部署到适合长期运行的后端平台。

## 建议的下一步

1. 为 API 选择云 PostgreSQL（例如 Supabase 或 Neon）。
2. 在 Vercel API 项目中配置数据库变量、JWT 密钥和前端域名。
3. 调整 API 的部署入口，或将 API 部署到 Railway、Render 等后端平台。
4. API 可用后，在前端设置 `NEXT_PUBLIC_API_BASE_URL` 指向正式 API 地址。

