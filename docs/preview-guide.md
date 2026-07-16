# 本地预览指南

当前 Docker 服务已启动，可直接打开：

- 首页：http://localhost:3000
- 推荐信息流：http://localhost:3000/discover
- 全站热榜：http://localhost:3000/rankings
- 视频频道：http://localhost:3000/videos
- 社区：http://localhost:3000/community
- 需求广场：http://localhost:3000/demands
- 发布需求：http://localhost:3000/demands/new
- 活动：http://localhost:3000/events
- 需求运营台：http://localhost:3000/admin/demands
- API 健康检查：http://localhost:4000/health
- 采集服务健康检查：http://localhost:8000/health
- 网关：http://localhost:8080

## 本地预览账号

统一密码：`OpcPreview!2026`

- 普通需求方：`preview@opc.local`
- 协作者：`partner@opc.local`
- 运营账号：`operator@opc.local`

推荐验收顺序：先以游客打开需求广场，再用普通需求方检查联系方式和收到的申请，用协作者检查发布/编辑和“我的对接意向”，最后用运营账号进入需求运营台。

## 下次重新启动

在仓库根目录执行：

```powershell
npm run docker:up
```

首次或需要恢复演示内容时执行：

```powershell
docker compose --env-file .env -f infra/docker-compose.yml cp infra/preview-seed.sql postgres:/tmp/preview-seed.sql
docker compose --env-file .env -f infra/docker-compose.yml exec -T postgres psql -U opc -d opc_nexus -v ON_ERROR_STOP=1 -f /tmp/preview-seed.sql
```

查看状态：

```powershell
docker compose --env-file .env -f infra/docker-compose.yml ps
```

停止全部服务：

```powershell
npm run docker:down
```

预览数据只使用 `example.invalid` 外链，不连接真实平台，也不应导入生产数据库。
