# 阶段 A 架构说明

```text
Browser ──> Next.js (apps/web, :3000) ──> NestJS API (apps/api, :4000)
                                                │
                            FastAPI crawler (:8000)  [阶段 A 仅健康检查]
                                                │
                                PostgreSQL + Redis (Docker Compose)
```

- Web 只通过 `NEXT_PUBLIC_API_BASE_URL` 访问业务 API。
- API 统一返回 `{ success, data }` 或 `{ success: false, error }`。
- Crawler 不在阶段 A 访问外部网站。
- 所有密码仅来自本地环境变量，仓库不保存真实凭据。
