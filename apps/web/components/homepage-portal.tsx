"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { FeedItem } from "../lib/ranking";
import { HomepageCreator, HomepageData, HomepageEvent, HomepageModule, HomepagePublicConfig, getHomepage, trackRecommendation } from "../lib/operations";

const contentLabels: Record<FeedItem["contentType"], string> = { article: "资讯", policy: "政策", video: "视频", post: "社区", demand: "需求" };

export function HomepagePortal() {
  const [data, setData] = useState<HomepageData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const tracked = useRef("");

  async function load() {
    setLoading(true); setError("");
    try { setData(await getHomepage()); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "首页内容暂时无法加载"); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);
  useEffect(() => {
    if (!data) return;
    const ids = [...data.banners, ...data.manualRecommendations].map((item) => item.trackingId);
    const key = [...ids].sort().join(",");
    if (!ids.length || tracked.current === key) return;
    tracked.current = key;
    void trackRecommendation(ids, "impression").catch(() => undefined);
  }, [data]);

  if (loading) return <main className="opc-home"><div className="home-loading"><span /><p>正在编排今日财经信号…</p></div></main>;
  if (error || !data) return <main className="opc-home"><div className="home-failure" role="alert"><p className="eyebrow">HOMEPAGE SIGNAL INTERRUPTED</p><h1>首页内容未能接通。</h1><p>{error || "首页聚合接口没有返回数据。"}</p><button onClick={() => void load()}>重新加载</button></div></main>;

  const focus = data.banners[0];
  const fallback = data.sections.recommendations[0];
  const signals = data.sections.recommendations.slice(0, 4);
  return <main className="opc-home">
    <section className="home-focus">
      <div className="home-focus-copy">
        <p className="eyebrow">OPC DAILY CAPITAL SIGNAL · {formatDay(data.generatedAt)}</p>
        {focus ? <><h1>{focus.title}</h1><p>{focus.subtitle || "由 OPC 运营台选定的今日焦点内容。"}</p><TrackedLink item={focus}>查看今日焦点 <span>↗</span></TrackedLink></> : fallback ? <><h1>{fallback.title}</h1><p>{fallback.excerpt}</p><SmartLink href={fallback.url}>继续阅读 <span>↗</span></SmartLink></> : <><h1>把下一步判断，建立在可靠信号上。</h1><p>今日焦点正在编排。你仍可从资讯、政策、视频与社区模块继续浏览。</p><Link className="focus-action" href="/discover">前往推荐页 <span>→</span></Link></>}
      </div>
      <aside className="capital-signal-band" aria-label="今日资本信号带">
        <header><span>实时信号带</span><time>{new Date(data.generatedAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}</time></header>
        {signals.map((item, index) => <SmartLink href={item.url} key={`${item.contentType}-${item.id}`}><b>{String(index + 1).padStart(2, "0")}</b><span><small>{contentLabels[item.contentType]} · {item.industry ?? "综合"}</small>{item.title}</span><em>{item.heat.toFixed(1)}</em></SmartLink>)}
        {!signals.length && <div className="home-empty compact"><strong>信号带暂无内容</strong><span>发布内容并完成指标同步后，这里会自动更新。</span></div>}
      </aside>
    </section>

    {data.manualRecommendations.length > 0 && <section className="editor-picks" aria-label="人工推荐">
      <span>运营精选</span>{data.manualRecommendations.map((item) => <TrackedLink item={item} key={item.id}>{item.title}<i>→</i></TrackedLink>)}
    </section>}

    <div className="home-module-ledger">
      {data.modules.map((module) => <HomepageSection module={module} data={data} key={module.moduleKey} />)}
    </div>
  </main>;
}

function HomepageSection({ module, data }: { module: HomepageModule; data: HomepageData }) {
  if (module.moduleKey === "recommendations") return <RecommendationSection title={module.title} items={data.sections.recommendations} />;
  if (module.moduleKey === "policies") return <PolicySection title={module.title} items={data.sections.policies} />;
  if (module.moduleKey === "videos") return <VideoSection title={module.title} items={data.sections.videos} />;
  if (module.moduleKey === "discussions") return <DiscussionSection title={module.title} items={data.sections.discussions} />;
  if (module.moduleKey === "events") return <EventSection title={module.title} items={data.sections.events} />;
  return <CreatorSection title={module.title} items={data.sections.creators} />;
}

function SectionHeading({ index, title, href, link }: { index: string; title: string; href: string; link: string }) { return <header className="home-section-heading"><div><span>{index}</span><h2>{title}</h2></div><Link href={href}>{link} →</Link></header>; }

function RecommendationSection({ title, items }: { title: string; items: FeedItem[] }) { return <section className="home-section recommendation-section"><SectionHeading index="SIGNAL / FEED" title={title} href="/discover" link="完整推荐" />{items.length ? <div className="recommendation-ledger">{items.map((item, index) => <article key={`${item.contentType}-${item.id}`}><span className="ledger-index">{String(index + 1).padStart(2, "0")}</span><div><p>{contentLabels[item.contentType]} · {item.reason}</p><h3><SmartLink href={item.url}>{item.title}</SmartLink></h3><small>{item.source} · {formatDate(item.publishedAt)}</small></div><strong>{item.heat.toFixed(1)}</strong></article>)}</div> : <EmptyState text="推荐队列暂无内容" help="已发布内容完成热度计算后会自动进入这里。" />}</section>; }

function PolicySection({ title, items }: { title: string; items: FeedItem[] }) { return <section className="home-section policy-section"><SectionHeading index="POLICY / RADAR" title={title} href="/policies" link="政策频道" />{items.length ? <div className="policy-grid">{items.map((item, index) => <article key={item.id}><span>{String(index + 1).padStart(2, "0")}</span><p>{item.industry ?? "综合政策"}</p><h3><SmartLink href={item.url}>{item.title}</SmartLink></h3><small>{item.source} · {formatDate(item.publishedAt)}</small></article>)}</div> : <EmptyState text="暂时没有政策精选" help="发布政策内容后，本模块会按热度自动补位。" />}</section>; }

function VideoSection({ title, items }: { title: string; items: FeedItem[] }) { return <section className="home-section video-section"><SectionHeading index="VIDEO / WATCH" title={title} href="/videos" link="视频频道" />{items.length ? <div className="video-feature-grid">{items.map((item, index) => <article className={index === 0 ? "featured" : ""} key={item.id}><SmartLink href={item.url}><div className="video-cover" style={item.coverImageUrl ? { backgroundImage: `url(${item.coverImageUrl})` } : undefined}><span>PLAY</span><em>{item.heat.toFixed(1)}</em></div><p>{item.source}</p><h3>{item.title}</h3></SmartLink></article>)}</div> : <EmptyState text="热门视频仍在同步" help="授权视频入库并完成指标同步后会显示在这里。" />}</section>; }

function DiscussionSection({ title, items }: { title: string; items: FeedItem[] }) { return <section className="home-section discussion-section"><SectionHeading index="COMMUNITY / TALK" title={title} href="/community" link="进入社区" />{items.length ? <div className="discussion-list">{items.map((item, index) => <article key={item.id}><b>{String(index + 1).padStart(2, "0")}</b><div><p>{item.industry ?? "社区讨论"} · 热度 {item.heat.toFixed(1)}</p><h3><SmartLink href={item.url}>{item.title}</SmartLink></h3><small>{item.excerpt}</small></div></article>)}</div> : <EmptyState text="社区还没有升温的话题" help="新讨论发布后会按真实互动进入这里。" />}</section>; }

function EventSection({ title, items }: { title: string; items: HomepageEvent[] }) { return <section className="home-section event-section"><SectionHeading index="EVENT / CALENDAR" title={title} href="/events" link="全部活动" />{items.length ? <div className="event-timeline">{items.map((item) => <article key={item.id}><time><strong>{new Date(item.startsAt).toLocaleDateString("zh-CN", { day: "2-digit" })}</strong><span>{new Date(item.startsAt).toLocaleDateString("zh-CN", { month: "short" })}</span></time><div><p>{item.locationName} · {item.registrationCount}{item.capacity ? ` / ${item.capacity}` : ""} 人</p><h3><Link href={item.url}>{item.title}</Link></h3><small>{item.organizer.displayName}</small></div></article>)}</div> : <EmptyState text="近期没有已发布活动" help="运营人员发布活动后，会按开始时间显示在这里。" />}</section>; }

function CreatorSection({ title, items }: { title: string; items: HomepageCreator[] }) { return <section className="home-section creator-section"><SectionHeading index="CREATOR / DESK" title={title} href="/videos" link="查看内容" />{items.length ? <div className="creator-roster">{items.map((item) => <article key={item.id}>{item.avatarUrl ? <img src={item.avatarUrl} alt="" /> : <span>{item.name.slice(0, 1)}</span>}<div><h3>{item.name}</h3><p>{item.industries.join(" · ") || "综合财经"}</p><small>信任等级 {item.trustLevel} · {item.platforms.join(" / ") || "站内作者"}</small></div></article>)}</div> : <EmptyState text="暂无可推荐作者" help="完成创作者授权并启用账号后会显示在这里。" />}</section>; }

function EmptyState({ text, help }: { text: string; help: string }) { return <div className="home-empty"><strong>{text}</strong><span>{help}</span></div>; }
function TrackedLink({ item, children }: { item: HomepagePublicConfig; children: React.ReactNode }) { const href = item.targetUrl || "/discover"; return <SmartLink className="focus-action" href={href} onClick={() => void trackRecommendation([item.trackingId], "click").catch(() => undefined)}>{children}</SmartLink>; }
function SmartLink({ href, children, className, onClick }: { href: string; children: React.ReactNode; className?: string; onClick?: () => void }) { return href.startsWith("/") ? <Link className={className} href={href} onClick={onClick}>{children}</Link> : <a className={className} href={href} target="_blank" rel="noreferrer" onClick={onClick}>{children}</a>; }
function formatDate(value: string) { return new Date(value).toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" }); }
function formatDay(value: string) { return new Date(value).toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" }); }
