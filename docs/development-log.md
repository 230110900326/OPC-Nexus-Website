# 开发与验证日志

## 2026-07-15 — 阶段 E 收尾

- 已补充活动运营端的创建和编辑页面：`/admin/events/new`、`/admin/events/[id]/edit`；活动列表页已加入入口。
- 修复 CSV 导出入口：浏览器下载请求会附加当前访问令牌，避免仅靠链接访问受保护接口而失败。
- 新增活动服务边界测试时发现 Jest mock 会保留上一用例的返回实现，导致必填字段用例误报为“报名已截止”；已改为每次测试重置 mock 实现，避免测试之间串扰。
- 回归测试进一步发现真实报名逻辑缺陷：`existing?.status !== cancelled` 会在首次报名时把 `undefined` 误判为重复报名。已改为仅在存在报名记录且状态不是已取消时拒绝请求，并由测试覆盖。
- 本地 PostgreSQL 验证尝试：Docker CLI 可以调用，但项目没有 `.env`，Compose 要求 `POSTGRES_PASSWORD`。使用会话级开发密码启动 `postgres` 服务时，镜像初始化超过 60 秒超时；再次查询未发现运行中的容器。未执行迁移，也未对任何数据库写入数据。
- 后续：准备可用的本地 PostgreSQL 或已部署数据库连接后，执行 `npm run build --workspace=@opc/api`、`npm run migration:run --workspace=@opc/api`，再查询 `events`、`event_registrations`、`notifications`。
- 验证结果：API Jest 全部通过（11 suites / 28 tests）；API 与 Web TypeScript 检查通过；API Nest 构建通过；Web 生产构建通过，已包含活动创建、编辑与运营页面路由。
- 阶段 A–E 静态检查：公共导航已包含活动和通知入口；活动创建与管理列表要求 `admin`、`operator` 或 `editor` 角色；报名名单、状态更新和 CSV 导出在服务层复用活动管理权限校验。生产环境仍缺 PostgreSQL、Redis、JWT 与 API 运行平台配置，详见 `docs/deployment-status.md`。
