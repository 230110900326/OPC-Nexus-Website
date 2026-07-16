# 本地预览指南

当前 Docker 服务已启动，可直接打开：

- 首页：http://localhost:3000
- 推荐信息流：http://localhost:3000/discover
- 全站热榜：http://localhost:3000/rankings
- 视频频道：http://localhost:3000/videos
- 社区：http://localhost:3000/community
- 活动：http://localhost:3000/events
- API 健康检查：http://localhost:4000/health
- 采集服务健康检查：http://localhost:8000/health

## 下次重新启动

在仓库根目录执行：

```powershell
npm run docker:up
```

首次或需要恢复演示内容时执行：

```powershell
Get-Content -Raw -Encoding utf8 infra/preview-seed.sql | docker compose --env-file .env -f infra/docker-compose.yml exec -T postgres psql -U opc -d opc_nexus -v ON_ERROR_STOP=1
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
