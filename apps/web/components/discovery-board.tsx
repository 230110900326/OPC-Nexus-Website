"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { FeedItem, getFeed, getRankings } from "../lib/ranking";

const PAGE_SIZE = 20;
const modes = [{ value: "recommended", label: "为你推荐" }, { value: "latest", label: "最新" }, { value: "following", label: "关注" }];
const scopes = [{ value: "all", label: "全站" }, { value: "news", label: "资讯" }, { value: "policy", label: "政策" }, { value: "video", label: "视频" }, { value: "community", label: "社区" }, { value: "demand", label: "需求" }];
const windows = [{ value: "24h", label: "24 小时" }, { value: "7d", label: "7 天" }, { value: "30d", label: "30 天" }];
const labels: Record<FeedItem["contentType"], string> = { article: "资讯", policy: "政策", video: "视频", post: "社区", demand: "需求" };

export function DiscoveryBoard({ initialView }: { initialView: "feed" | "rankings" }) {
  const isFeed = initialView === "feed";
  const [mode, setMode] = useState("recommended");
  const [industry, setIndustry] = useState("");
  const [scope, setScope] = useState("all");
  const [range, setRange] = useState("7d");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<FeedItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true); setError("");
    const fetcher = isFeed ? getFeed(mode, "all", industry, page, PAGE_SIZE) : getRankings(scope, range, industry, page, PAGE_SIZE);
    fetcher.then((data) => { setItems(data.items); setTotal(data.pagination.total); setTotalPages(data.pagination.totalPages); })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "内容加载失败"))
      .finally(() => setLoading(false));
  }, [isFeed, mode, industry, scope, range, page]);

  const goPage = (next: number) => { setPage(next); if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" }); };
  const feedEmpty = !loading && !error && !items.length;
  const feedItem = (item: FeedItem, key: string) => (
    <article key={key}><div className="signal-reason">{item.reason}</div><div className="signal-type">{labels[item.contentType]}<span>{item.industry ?? "综合"}</span></div><div><h2>{item.contentType === "video" ? <a href={item.url} target="_blank" rel="noreferrer">{item.title}</a> : <Link href={item.url}>{item.title}</Link>}</h2><p>{item.excerpt}</p><footer><span>{item.source} · {new Date(item.publishedAt).toLocaleDateString("zh-CN")}</span><span>热度 {item.heat.toFixed(1)}</span></footer></div></article>
  );
  const rankItem = (item: FeedItem, index: number, key: string) => (
    <article key={key}><span className="rank-number">{String((page - 1) * PAGE_SIZE + index + 1).padStart(2, "0")}</span><div><p>{item.contentType.toUpperCase()} · {item.industry ?? "综合"}</p><h2>{item.contentType === "video" ? <a href={item.url} target="_blank" rel="noreferrer">{item.title}</a> : <Link href={item.url}>{item.title}</Link>}</h2><small>{item.source} · {item.reason}</small></div><strong>{item.heat.toFixed(1)}</strong></article>
  );

  return <main className={isFeed ? "signal-feed" : "ranking-page"}>
    <nav className="discovery-tabs" aria-label="视图切换">
      <Link href="/discover" className={isFeed ? "active" : undefined}>推荐流</Link>
      <Link href="/rankings" className={isFeed ? undefined : "active"}>热榜</Link>
    </nav>

    {isFeed ? (
      <>
        <header className="signal-feed-hero"><div><p className="eyebrow">OPC SIGNAL LEDGER</p><h1>今天，什么值得<br /><span>继续判断。</span></h1></div><aside><p>资讯、政策、视频与社区讨论进入同一套热度口径；每条推荐都说明原因。</p></aside></header>
        <section className="signal-toolbar" aria-label="信息流筛选"><div>{modes.map((item) => <button className={mode === item.value ? "active" : ""} onClick={() => { setMode(item.value); setPage(1); }} key={item.value}>{item.label}</button>)}</div><label>行业偏好<input value={industry} onChange={(event) => { setIndustry(event.target.value); setPage(1); }} placeholder="例如：人工智能" /></label></section>
        {error && <p className="content-state" role="alert">{error}</p>}
        {loading ? <p className="content-state">正在计算推荐…</p> : (
          <div className="signal-layout"><section className="signal-list">{items.map((item) => feedItem(item, `${item.contentType}-${item.id}`))}{feedEmpty && <p className="content-state">当前筛选下还没有内容。</p>}</section><aside className="signal-method"><p className="eyebrow">HOW IT READS</p><h2>热度不是音量。</h2><p>互动经过异常过滤，跨平台指标使用百分位归一化，再考虑时间、主题匹配和来源可信度。</p><dl><div><dt>01</dt><dd>站内真实互动</dd></div><div><dt>02</dt><dd>跨平台标准化</dd></div><div><dt>03</dt><dd>时间与质量修正</dd></div></dl></aside></div>
        )}
      </>
    ) : (
      <>
        <header><p className="eyebrow">OPC MARKET ATTENTION</p><h1>全站热榜</h1><p>把不同内容、平台和发布时间放进同一把尺子，再看今天真正升温的议题。</p></header>
        <div className="ranking-controls"><div>{scopes.map((item) => <button className={scope === item.value ? "active" : ""} onClick={() => { setScope(item.value); setPage(1); }} key={item.value}>{item.label}</button>)}</div><div>{windows.map((item) => <button className={range === item.value ? "active" : ""} onClick={() => { setRange(item.value); setPage(1); }} key={item.value}>{item.label}</button>)}</div></div>
        {error && <p className="content-state" role="alert">{error}</p>}
        {loading ? <p className="content-state">正在生成热榜…</p> : (
          <section className="ranking-list">{items.map((item, index) => rankItem(item, index, `${item.contentType}-${item.id}`))}{feedEmpty && <p className="content-state">当前时段还没有可排行内容。</p>}</section>
        )}
        <footer>更新时间：{new Date().toLocaleString("zh-CN")} · 异常互动默认不计入</footer>
      </>
    )}

    {!loading && !error && totalPages > 1 && (
      <nav className="pagination" aria-label="分页">
        <button disabled={page === 1} onClick={() => goPage(page - 1)}>上一页</button>
        <span>第 {page} / {totalPages} 页 · {total} 条</span>
        <button disabled={page >= totalPages} onClick={() => goPage(page + 1)}>下一页</button>
      </nav>
    )}
  </main>;
}
