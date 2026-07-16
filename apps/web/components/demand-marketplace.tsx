"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { ForumSection, getForumSections } from "../lib/forum";
import { Demand, DemandBoardConfig, DemandList, demandBudgetLabels, demandTypeLabels, getDemandBoardConfig, getDemands, getHotDemands } from "../lib/demands";

const types = Object.entries(demandTypeLabels) as [keyof typeof demandTypeLabels, string][];
const budgets = Object.entries(demandBudgetLabels) as [keyof typeof demandBudgetLabels, string][];

export function DemandMarketplace() {
  const [sections, setSections] = useState<ForumSection[]>([]);
  const [config, setConfig] = useState<DemandBoardConfig | null>(null);
  const [data, setData] = useState<DemandList | null>(null);
  const [hot, setHot] = useState<Demand[]>([]);
  const [hotWindow, setHotWindow] = useState<"24h" | "7d">("24h");
  const [filters, setFilters] = useState({ demandType: "", industryId: "", budgetRange: "", sort: "latest", activeOnly: true, q: "", page: 1 });
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([getForumSections(), getDemandBoardConfig()]).then(([industryValues, boardConfig]) => { setSections(industryValues); setConfig(boardConfig); }).catch((reason) => setError(reason instanceof Error ? reason.message : "板块信息加载失败"));
  }, []);
  useEffect(() => {
    setData(null); setError("");
    getDemands(filters).then(setData).catch((reason) => setError(reason instanceof Error ? reason.message : "需求列表加载失败"));
  }, [filters]);
  useEffect(() => { getHotDemands(hotWindow).then(setHot).catch(() => setHot([])); }, [hotWindow]);

  function update<K extends keyof typeof filters>(key: K, value: (typeof filters)[K]) { setFilters((current) => ({ ...current, [key]: value, page: key === "page" ? Number(value) : 1 })); }
  function submitSearch(event: FormEvent) { event.preventDefault(); update("q", search.trim()); }

  return <main className="demand-marketplace">
    <section className="demand-hero">
      <div>
        <p className="eyebrow">OPC MATCHING DESK · OPEN REQUESTS</p>
        <h1>{config?.bannerTitle ?? "把具体需求，交给可信的同行。"}</h1>
        <p>{config?.bannerSubtitle ?? "发布真实、清晰、可交付的财经与产业需求，让合适的人更快找到你。"}</p>
        <div className="demand-hero-actions"><Link className="demand-primary" href="/demands/new">发布需求 <span>→</span></Link><Link href="/account/demands">管理我的需求</Link></div>
      </div>
      <aside className="matching-manifest" aria-label="需求撮合流程">
        <p>撮合工作流</p>
        <ol><li><b>01</b><span>写清交付物<small>范围、预算与截止时间</small></span></li><li><b>02</b><span>平台合规审核<small>联系方式仅登录可见</small></span></li><li><b>03</b><span>同行发起对接<small>所有动作完整留痕</small></span></li></ol>
      </aside>
    </section>

    <section className="demand-filter-deck" aria-label="需求筛选">
      <form onSubmit={submitSearch}><label><span>关键词</span><input value={search} onChange={(event) => setSearch(event.target.value)} maxLength={100} placeholder="搜索标题、内容或行业" /></label><button type="submit">检索</button></form>
      <label><span>需求类型</span><select value={filters.demandType} onChange={(event) => update("demandType", event.target.value)}><option value="">全部类型</option>{types.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
      <label><span>行业</span><select value={filters.industryId} onChange={(event) => update("industryId", event.target.value)}><option value="">全部行业</option>{sections.map((section) => <option value={section.id} key={section.id}>{section.name}</option>)}</select></label>
      <label><span>预算</span><select value={filters.budgetRange} onChange={(event) => update("budgetRange", event.target.value)}><option value="">全部预算</option>{budgets.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
      <label><span>排序</span><select value={filters.sort} onChange={(event) => update("sort", event.target.value)}><option value="latest">最新发布</option><option value="hot">热门优先</option><option value="pinned">置顶优先</option></select></label>
      <label className="demand-switch"><input type="checkbox" checked={filters.activeOnly} onChange={(event) => update("activeOnly", event.target.checked)} /><span>只看未截止</span></label>
    </section>

    {error && <p className="form-error demand-error" role="alert">{error}</p>}
    <section className="demand-board-layout">
      <section className="demand-ledger" aria-live="polite">
        <header><div><p className="eyebrow">REQUEST LEDGER</p><h2>开放需求</h2></div><span>{data ? `${data.pagination.total} 条在册` : "正在同步"}</span></header>
        {!data ? <p className="content-state">正在读取撮合工单…</p> : data.items.length ? <>{data.items.map((demand, index) => <DemandTicket demand={demand} index={(filters.page - 1) * data.pagination.limit + index + 1} key={demand.id} />)}<nav className="pagination" aria-label="需求分页"><button disabled={filters.page <= 1} onClick={() => update("page", filters.page - 1)}>上一页</button><span>第 {filters.page} / {data.pagination.totalPages || 1} 页</span><button disabled={filters.page >= data.pagination.totalPages} onClick={() => update("page", filters.page + 1)}>下一页</button></nav></> : <div className="demand-empty"><strong>当前筛选下没有开放需求</strong><p>调整条件，或者发布一条边界清晰的新需求。</p><Link href="/demands/new">发布需求 →</Link></div>}
      </section>

      <aside className="demand-sidecar">
        <section className="hot-demand-panel"><header><div><p className="eyebrow">LIVE SIGNAL</p><h2>热门需求</h2></div><div><button className={hotWindow === "24h" ? "active" : ""} onClick={() => setHotWindow("24h")}>24h</button><button className={hotWindow === "7d" ? "active" : ""} onClick={() => setHotWindow("7d")}>7天</button></div></header><ol>{hot.map((item, index) => <li key={item.id}><span>{String(index + 1).padStart(2, "0")}</span><div><Link href={`/demands/${item.id}`}>{item.title}</Link><small>{item.connectCount} 次对接 · 热度 {Number(item.heatScore).toFixed(1)}</small></div></li>)}{!hot.length && <li className="hot-empty">当前时段暂无热度数据</li>}</ol></section>
        <section className="demand-rules-card"><p className="eyebrow">BOARD RULES</p><h2>真实信息，直接对接</h2><p>{config?.rulesText ?? "请明确需求范围、交付标准、时间和预算，不发布违规金融中介信息。"}</p><Link href="/demands/rules">查看服务规范与免责声明 →</Link></section>
      </aside>
    </section>
  </main>;
}

function DemandTicket({ demand, index }: { demand: Demand; index: number }) {
  const deadline = demand.deadline ? new Date(demand.deadline) : null;
  const days = deadline ? Math.ceil((deadline.getTime() - Date.now()) / 86_400_000) : null;
  return <article className={`demand-ticket${demand.isPinned ? " pinned" : ""}`}>
    <div className="demand-ticket-code"><span>REQ</span><b>{String(index).padStart(3, "0")}</b><small>{new Date(demand.createdAt).toLocaleDateString("zh-CN")}</small></div>
    <div className="demand-ticket-body">
      <div className="demand-ticket-flags">{demand.isPinned && <strong>人工置顶</strong>}<span>{demandTypeLabels[demand.demandType]}</span>{demand.industries.map((industry) => <span key={industry.id}>{industry.name}</span>)}</div>
      <h3><Link href={`/demands/${demand.id}`}>{demand.title}</Link></h3>
      <p>{demand.content}</p>
      <footer><span className={`certification ${demand.author.certification ?? ""}`}>{demand.author.displayName}{demand.author.certification === "institution" ? " · 机构认证" : demand.author.certification === "author" ? " · 认证作者" : ""}</span><span>{demand.viewCount} 浏览 · {demand.connectCount} 对接</span><Link href={`/demands/${demand.id}`}>查看并对接 →</Link></footer>
    </div>
    <aside className="match-rail" aria-label="撮合关键指标"><div><i /><span>预算</span><b>{demandBudgetLabels[demand.budgetRange]}</b></div><div><i /><span>截止</span><b>{days === null ? "长期有效" : days < 0 ? "已截止" : days === 0 ? "今日截止" : `${days} 天后`}</b></div><div><i /><span>意向</span><b>{demand.connectCount} 人</b></div></aside>
  </article>;
}
