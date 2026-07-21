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

## 本地启动

1. 复制 `.env.example` 为 `.env` 并按本地环境调整。
2. 安装 Node.js 依赖：`npm install`。
3. 分别运行 `npm run dev:web` 与 `npm run dev:api`。
4. 打开 `http://localhost:3000`；首页会展示 API 健康状态。

采集服务需要 Python 3.11+。安装完成后，在 `apps/crawler` 创建虚拟环境并安装 `requirements.txt`，再运行 `python -m pytest tests -q`。本地 PostgreSQL 与 Redis 推荐通过 Docker Compose 启动，详见 [infra/README.md](infra/README.md)。未安装 Docker 时，仍可运行 Web、API 和采集服务的健康检查。

## 当前范围

阶段 A–D 已完成：基础设施、账号与角色、内容发布与审核、分类标签、安全首图上传、统一搜索、社区论坛、楼中楼评论、点赞收藏关注，以及举报审核和操作记录。

Docker 可用后，先启动服务，再构建并执行迁移：

```text
npm run build --workspace=@opc/api
npm run migration:run --workspace=@opc/api
```

## 每日采集

采集服务会从后台已授权并启用的来源获取资讯、政策和视频元数据；正文页面仅展示摘要，并保留原文链接。进入 `运营台 → 采集` 添加来源后：

1. 确认来源的版权、robots 规则与采集授权；将其状态设为“已授权”。
2. 仅对新闻和政策按需开启“自动发布”；未开启时会进入内容审核队列。
3. 在 `.env` 设置一个相同的 `CRAWLER_API_TOKEN`（至少 32 个字符），并将 `CRAWLER_SCHEDULER_ENABLED=true`。
4. 使用 `CRAWLER_SCHEDULE_HOUR`、`CRAWLER_SCHEDULE_MINUTE` 和 `CRAWLER_TIMEZONE` 设置每天的执行时间；默认是上海时区 07:30。

Docker Compose 会同时启动 crawler。首次上线后运行数据库迁移，并在运营台使用“立即采集”验证一条已授权来源。

Crawler 已内置 `znt` OPC 新闻与政策智能体。每篇文章在入库前会经过批次去重、OPC 相关性判断、结构化摘要和热点评分：明确无关的内容不会入库，待复核内容始终进入审核队列，只有明确相关且来源开启“自动发布”的内容才会直接发布。完整判断依据保存在文章的 `agentAnalysis` 字段，并显示在后台文章预览中。

默认 `CRAWLER_INTELLIGENCE_PROVIDER=none`，全部使用本地规则且不会把数据发送给模型 API。需要语义增强时，可改为 `openai` 或 `ollama`，并设置模型和对应的 API 地址；OpenAI 密钥只通过运行环境的 `OPENAI_API_KEY` 提供。

图片默认写入本地 `uploads/`；将 `STORAGE_DRIVER` 改为 `s3` 并配置 `.env.example` 中的 S3 参数后，可切换到 S3 兼容对象存储。所有 JWT、数据库和对象存储密钥只放在本地 `.env` 中。

完整检查命令：

```text
npm run lint
npm run test
npm run build
```

后续开发以《财经社群与行业内容聚合平台建设方案》为准。
