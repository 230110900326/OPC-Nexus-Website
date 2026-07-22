# 阶段 A 架构说明

```text
Browser ──> Next.js (apps/web, :3000) ──> NestJS API (apps/api, :4000)
                                                │
                            FastAPI crawler (:8000)  [授权来源的每日采集]
                                                │
                                PostgreSQL + Redis (Docker Compose)
```

- Web 只通过 `NEXT_PUBLIC_API_BASE_URL` 访问业务 API。
- API 统一返回 `{ success, data }` 或 `{ success: false, error }`。
- Crawler 仅从 API 下发的、已授权且启用的来源采集。它通过 `x-crawler-token` 调用 API 内部接口，API 记录采集任务、发现链接、去重和入库结果。
- 新闻与政策默认入审核队列；来源可显式开启自动发布。视频仅入库标题、封面、描述和原链接等元数据。
- 所有密码仅来自本地环境变量，仓库不保存真实凭据。
