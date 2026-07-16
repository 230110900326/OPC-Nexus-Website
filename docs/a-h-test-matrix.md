# A–H 测试矩阵

| 阶段 | 单元测试重点 | 主要测试文件 |
| --- | --- | --- |
| A 项目基础 | API/FastAPI 健康检查、统一响应 | `health.controller.spec.ts`、`test_health.py` |
| B 账号权限 | JWT 活跃用户、角色守卫 | `jwt-auth.guard.spec.ts`、`roles.guard.spec.ts` |
| C 内容系统 | 文章状态流、来源规范化、上传、迁移 | `articles.service.spec.ts`、`uploads*.spec.ts`、`content-community-migrations.spec.ts` |
| D 社区 | 发帖所有权、评论层级、互动去重、举报审核 | `forum.service.spec.ts`、`interactions.service.spec.ts`、`moderation.service.spec.ts` |
| E 活动通知 | 截止/容量/必填字段、通知已读隔离 | `events.service.spec.ts`、`notifications.service.spec.ts` |
| F 资讯采集 | 来源授权、关键词、解析、发现、政策适配、去重分类 | `crawl.service.spec.ts`、crawler pytest |
| G 视频 | 字幕授权状态机、合法字幕概要 | `videos.service.spec.ts` |
| H 推荐热榜 | 时间衰减、半衰期、百分位、防刷、迁移 | `heat-score.spec.ts`、`interaction-risk.service.spec.ts`、`ranking-migration.spec.ts` |

跨阶段集成测试：`integration/a-h-platform.integration.spec.ts`，覆盖健康检查、权限、F 分类后的 C 文章、D 帖子、G 视频、H 统一排序和 E 通知落库。
