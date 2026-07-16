# 阶段 H 进度记录（热度与推荐）

更新日期：2026-07-16

## 已完成：Prompt 47—53

- 新增 `content_metrics` 历史快照和 `interaction_audits` 异常互动表，迁移为 `1710000008000-ranking-schema`。
- 热度算法综合阅读、点赞、评论、收藏、分享、外部公开指标、关键词、来源可信度、编辑评分和按内容类型配置的时间半衰期。
- 外部指标按平台/内容类型、行业分类和发布月份分组计算百分位，避免直接比较不同平台原始数量。
- 重复互动、新账号短时密集互动、异常 IP 和设备频率会单独记录，默认不写入计分指标。
- 提供推荐、最新、热度、关注四种信息流，以及全站、资讯、政策、视频、社区热榜和 24 小时/7 天/30 天范围。
- 新增 `/discover` 推荐信息流和 `/rankings` 热榜页面，导航已接入。

## 测试

- API 单元及代码集成测试：19 suites / 43 tests 全部通过。
- Python crawler：8 tests 全部通过。
- API/Web TypeScript 检查、Nest 构建、Next.js 生产构建通过。
- Docker 真实集成：Web、API、crawler、PostgreSQL、Redis 全部运行；关键迁移表已核查。
- HTTP 冒烟测试：首页、推荐、热榜、API 健康、推荐 API、热榜 API、crawler 健康全部返回 200。

## 本地预览数据

`infra/preview-seed.sql` 只用于本地，可重复运行。当前本地推荐流包含文章、政策、社区和视频四种内容。
