# OPC 新闻与政策智能体

这是一个在本机运行的 Python 脚本，用于清洗、去重、联网补全、筛选并提炼与 OPC（一人公司）生态相关的新闻和政策。项目兼容 Python 3.7，不需要安装第三方依赖。

## 当前能力

- 读取顶层数组，或 `articles`、`items`、`results`、`news`、`data` 下的资讯数组。
- 自动适配常见的标题、正文、来源、时间、链接和关键词字段。
- 根据 URL 和标准化标题去重。
- 识别一人公司、单一股东公司、solopreneur 等核心概念。
- 通过 OPC 生态主题图谱保留 AI、智能体、自动化、低代码、创业、获客、电商、融资、工商、税务、用工、知识产权和数据合规等间接相关资讯。
- 排除 Open Platform Communications、OPC UA、PLC 等工业通信噪声。
- 访问原文链接，补全正文、摘要、真实发布时间和公开互动指标，并对页面结果做本地缓存。
- 将真实阅读/评论/点赞等指标与时效性、来源信号分开，输出可审计的热度分和置信度。
- 输出相关、待复核、无关三类结果，以及 CSV 和 Markdown 报告。
- 可选接入 OpenAI 或本机 Ollama，对候选资讯做语义判断和结构化摘要。

## 立即运行

在 PowerShell 中执行：

```powershell
cd "C:\Users\wo\Desktop\znt"
.\run_agent.ps1 -InputPath "C:\Users\wo\Desktop\pc\exports\finance_news_all_20260716_100553.json"
```

默认 `Provider=none`，不把数据发送给模型 API；但运行入口会访问 JSON 中的公开网页。结果写入 `results\日期_时间`。使用 `-NoFetch` 可以关闭联网补全。

也可以直接执行 Python：

```powershell
python .\news_agent.py "C:\path\to\news.json" --fetch-pages --fetch-scope all
```

## 使用 OpenAI 语义增强

先在当前 PowerShell 会话设置密钥，再指定你账户可用的模型：

```powershell
$env:OPENAI_API_KEY = "你的 API Key"
.\run_agent.ps1 `
  -InputPath "C:\path\to\news.json" `
  -Provider openai `
  -Model "你的模型名称"
```

默认只把规则判定为“相关”或“待复核”的候选发送给模型，以控制调用量。脚本不会保存 API Key。

## 使用本机 Ollama

安装并启动 Ollama、准备好模型后执行：

```powershell
.\run_agent.ps1 `
  -InputPath "C:\path\to\news.json" `
  -Provider ollama `
  -Model "qwen3:8b"
```

模型名称只是示例，请替换成本机 `ollama list` 中实际存在的模型。

## 输出文件

- `report.md`：适合直接阅读的筛选报告。
- `relevant.jsonl`：明确相关资讯。
- `review.jsonl`：需要人工复核的资讯。
- `irrelevant.jsonl`：无关资讯及排除原因。
- `hot_relevant.jsonl`：达到热度阈值的相关资讯，按 OPC 综合优先级排序。
- `verified_hot.jsonl`：热点候选中确实公开了文章级阅读、点赞、收藏、分享或评论指标的资讯。
- `all_results.jsonl`：完整结构化结果。
- `all_results.csv`：最终筛选结果，只包含明确相关和待复核资讯，不包含无关记录。
- `run_metadata.json`：输入文件哈希、数量、运行方式等元数据。
- `duplicates.json`：被去重的记录。

## 数据质量说明

如果爬虫只保存标题，智能体会尝试访问 `url` 补全正文。遇到登录、反爬、已下线页面或超时时，仍会退回标题级筛选并标记为 `title_only`。

## 热度解释

- `heat_basis=article_metrics`：页面公开了文章级阅读、点赞、收藏、分享或评论数据。
- `heat_basis=estimated`：页面没有公开文章级指标，只根据发布时间、来源和事件词估算热度。
- 作者累计阅读量、粉丝数和文章数不会当作单篇文章点击量。
- `priority_score` 由 OPC 相关度占 70%、热度占 30% 计算；政策类再获得少量优先级加成。

很多媒体不公开单篇点击量，因此 `estimated` 只能用于相对排序，不能解释成真实阅读次数。

若要获得高质量政策摘要，建议爬虫至少提供：

```json
{
  "title": "标题",
  "url": "原文链接",
  "source": "来源",
  "publish_time": "发布时间",
  "summary": "摘要",
  "content": "正文",
  "keywords": "关键词"
}
```

## 调整主题规则

编辑 `config.json` 中的：

- `positive_terms`：主题词及权重。
- `context_terms`：公司、创业、监管等辅助语境。
- `negative_terms`：工业通信等排除词。
- `relevant_threshold` 和 `review_threshold`：分类阈值。

修改配置后无需改动 Python 代码。
