# 开发与验证日志

## 2026-07-17 — 阶段 K：全局 Footer 与首页导航

- 完成阶段 K Prompt 70：根布局统一挂载品牌 Footer，提供平台频道、服务支持、合规协议、版权与统一风险提示；移动端目录使用原生折叠结构。
- 顶部主导航新增「首页」、当前页标记与移动端可展开菜单，修复旧响应式规则误隐藏部分菜单项的问题。
- Web TypeScript 与生产构建通过；静态产物确认公共页面输出 Footer、运营后台保持独立，后续 `/about`、`/faq` 与合规内容页按阶段 K / L 对应 Prompt 继续实现。

## 2026-07-16 — 阶段 J：OPC 需求广场

- 已完成需求数据模型、PostgreSQL 迁移、用户端/运营端 API、公开列表与详情、发布编辑、用户供需工作台、运营审核台、看板、CSV、板块配置、通知、举报、收藏、热榜与审计接入。
- 真实 PostgreSQL 已执行阶段 J 迁移并核对 `opc_demands`、`opc_demand_connect`、`opc_demand_industries`、`demand_board_configs` 的约束与索引；登录态 API 全链路和公开接口均通过。
- 最终回归为 API 32 个测试套件、72 项测试和 crawler 8 项测试全部通过；API/Web TypeScript 检查和生产构建通过。
- 浏览器验收覆盖游客、需求方、协作者和运营账号：联系方式权限、收藏、对接申请/取消/重新申请、用户中心、审核稿、数据看板、配置、CSV 入口，以及发布/编辑表单的桌面与移动布局。
- 验收发现并修复三项交互问题：登录页未使用 `next` 参数；公开主页通过中文错误文本判断未登录；已有有效对接仍显示“发起意向”。现改为安全回跳、依据 HTTP 401 判断，并展示“已提交意向 · 查看进度”。
- crawler 首轮回归从仓库根目录运行，因模块搜索路径不包含 `apps/crawler` 而出现 5 个 `ModuleNotFoundError`；改为在 `apps/crawler` 工作目录运行后 8 项测试全部通过，确认是命令作用域问题而非代码缺陷。
- 最新 Docker 镜像已重建，六个服务均运行；需求广场、API 健康检查和网关健康检查均返回 HTTP 200，预览种子已恢复为待审核需求和已查看对接的初始状态。
- 既有构建警告仍为 Next.js 尝试联网修补 SWC 可选依赖失败，以及旧 CSS 的 Autoprefixer `start/end` 兼容提示；两者均未导致构建失败。浏览器控制服务自身的 Statsig 请求超时不来自本站代码。

## 2026-07-16 — 阶段 I（进行中）

- 已建立首页配置、推荐曝光/点击事件和管理员审计日志模型；运营看板使用曝光作为推荐点击率分母，并按日期计算指标。
- 首次后端 TypeScript 检查发现两个既有测试未补充新注入的审计依赖，以及首页模块配置的 `flatMap` 联合类型被过度收窄；已改为显式模块结果类型和顺序构建，并补齐测试 mock。该问题未涉及运行时数据或迁移。
- Python 回归时发现旧 `.venv` 指向已不存在的 Python 3.12 安装；已使用工作区 Python 重新创建虚拟环境并按锁定 requirements 安装依赖。
- 新虚拟环境暴露出爬虫配置会把根 `.env` 中非 `CRAWLER_` 字段判为非法额外输入；已在 `SettingsConfigDict` 设置 `extra="ignore"`，爬虫仍只从 `CRAWLER_` 前缀读取自身配置。
- Windows 受限环境下 pytest 的缓存插件在会话结束创建临时缓存目录时卡住；测试命令增加 `-p no:cacheprovider`，不影响测试收集或断言，仅关闭非必要的失败用例缓存。
- 浏览器可视化验收发现阶段 H 早期通过 Windows 文本管道导入的中文预览数据已被转成 `?`。已将 `infra/preview-seed.sql` 的既有演示行改为 `ON CONFLICT DO UPDATE`，并改用 `docker cp` 后在容器内执行 `psql -f`，重新导入时会以 UTF-8 修复旧数据。

## 2026-07-16 — 阶段 H 与 A–H 总体验证

- 新增统一指标快照、异常互动审计、热度算法、分组百分位归一化、推荐/最新/热度/关注信息流与多范围热榜。
- 推荐与热榜采用“财经信号台账”页面结构，明确展示内容类型、推荐原因、来源、热度和更新时间。
- A–H 单元测试矩阵已补齐；代码级跨阶段集成测试覆盖健康、权限、采集分类文章、社区帖子、授权视频、统一排序和通知落库。
- 验证结果：API 19 suites / 43 tests、crawler 8 tests 全部通过；API/Web 构建通过。
- Docker `up --build` 两次因等待构建超过命令时限退出，但 API/Web 镜像实际已成功生成；随后使用缓存镜像启动成功。该超时不是代码或镜像失败。
- 真实集成检查：五个服务运行，PostgreSQL 中确认 `events`、`crawl_sources`、`videos`、`content_metrics`、`interaction_audits` 等迁移表存在；首页、推荐页、热榜页及三个健康/API端点均返回 HTTP 200。
- 本地数据库原本没有已发布内容，导致推荐和热榜正常返回空数组。新增并执行 `infra/preview-seed.sql` 后，推荐和热榜均返回文章、政策、社区、视频四类演示内容。

## 2026-07-16 — 阶段 G

- 已完成创作者、平台账号、视频、同步日志及本地假数据发现适配器；未连接真实平台，也未抓取任何平台字幕或音频。
- 字幕状态机强制“已授权 → 处理中 → 已完成”的顺序；无权限状态不可绕过进入概要生成。
- 视频频道已加入站点导航，采用 16:9 视频卡片，支持平台筛选并跳转至原视频。
- 验证通过：API Jest 12 suites / 30 tests、Python crawler 8 tests、API/Web 类型检查、API 构建、Web 生产构建。
- 构建仍有受限网络下 Next.js 尝试修补可选 SWC lockfile 的警告，但生产构建成功，未影响产物。

## 2026-07-16 — 阶段 F 前半段

- 已实现来源管理、任务与日志数据模型，新增阶段 F 迁移 `1710000005000-crawl-sources`；管理 API 只允许 `admin`、`operator`、`editor` 角色使用。
- 关键词策略以“OPC 一人公司”“OPC财经”“OPC超级个体”为优先词，同时覆盖一人公司、超级个体、个体创业、个人品牌、灵活就业、小微企业、专精特新、数字经济、人工智能、普惠金融、减税降费、营商环境等关联主题。
- 爬虫默认仅允许 `127.0.0.1` 和 `localhost` 本地测试页；未将任何未获许可的第三方财经或政策网站标记为可抓取。来源必须处于 `authorized` 状态才能启用。
- 已实现 Redis 本地测试队列、定时入队/执行、通用 HTML 文章解析、RSS/Atom/Sitemap URL 发现与固定样例政策适配器。
- 环境问题：初始 Python 运行时未配置在 PATH，且未安装爬虫依赖。已使用工作区 Python 安装 `apps/crawler/requirements.txt` 后完成验证。
- 验证结果：Python 爬虫测试 5/5 通过；API TypeScript 检查和既有 Jest 测试将在阶段 F 合并检查中再次执行。
- 管理 API 补充任务列表与任务日志只读端点，便于后台查看 Python 服务写入的采集状态与错误日志。

## 2026-07-16 — 阶段 F 后半段（进行中）

- 已新增正文指纹、canonical URL、分类置信度、摘要版本与人工审核标记；低置信度或规则生成的摘要默认需要人工审核。
- 已新增来源发现记录、配置化关键词、原文链接检查记录，并提供采集审核队列、拒绝和合并 API。
- 已补充原文链接检查记录接口；连续失败阈值的定时巡检需要在可用 Redis/PostgreSQL 部署后启用，以避免在当前无数据库环境中伪造运行结果。
- 最终验证：API TypeScript 检查、Nest 构建和 Jest（11 suites / 28 tests）通过；爬虫 pytest（8 tests）通过；Web TypeScript 检查和生产构建通过。Next.js 仍提示无法通过受限网络修补可选 SWC lockfile 条目，但构建成功，未影响产物。

## 2026-07-15 — 阶段 E 收尾

- 已补充活动运营端的创建和编辑页面：`/admin/events/new`、`/admin/events/[id]/edit`；活动列表页已加入入口。
- 修复 CSV 导出入口：浏览器下载请求会附加当前访问令牌，避免仅靠链接访问受保护接口而失败。
- 新增活动服务边界测试时发现 Jest mock 会保留上一用例的返回实现，导致必填字段用例误报为“报名已截止”；已改为每次测试重置 mock 实现，避免测试之间串扰。
- 回归测试进一步发现真实报名逻辑缺陷：`existing?.status !== cancelled` 会在首次报名时把 `undefined` 误判为重复报名。已改为仅在存在报名记录且状态不是已取消时拒绝请求，并由测试覆盖。
- 本地 PostgreSQL 验证尝试：Docker CLI 可以调用，但项目没有 `.env`，Compose 要求 `POSTGRES_PASSWORD`。使用会话级开发密码启动 `postgres` 服务时，镜像初始化超过 60 秒超时；再次查询未发现运行中的容器。未执行迁移，也未对任何数据库写入数据。
- 后续：准备可用的本地 PostgreSQL 或已部署数据库连接后，执行 `npm run build --workspace=@opc/api`、`npm run migration:run --workspace=@opc/api`，再查询 `events`、`event_registrations`、`notifications`。
- 验证结果：API Jest 全部通过（11 suites / 28 tests）；API 与 Web TypeScript 检查通过；API Nest 构建通过；Web 生产构建通过，已包含活动创建、编辑与运营页面路由。
- 阶段 A–E 静态检查：公共导航已包含活动和通知入口；活动创建与管理列表要求 `admin`、`operator` 或 `editor` 角色；报名名单、状态更新和 CSV 导出在服务层复用活动管理权限校验。生产环境仍缺 PostgreSQL、Redis、JWT 与 API 运行平台配置，详见 `docs/deployment-status.md`。
