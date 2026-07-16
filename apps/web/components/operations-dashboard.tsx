"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Account, refreshSession } from "../lib/auth";
import { DashboardData, getOperationsDashboard } from "../lib/operations";
import { OperationsAdminNav } from "./operations-admin-nav";

const today = new Date();
const initialTo = localDate(today);
const initialFrom = localDate(new Date(today.getTime() - 29 * 86_400_000));

export function OperationsDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<Account | null>(null);
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load(nextFrom = from, nextTo = to) { setLoading(true); setError(""); try { setData(await getOperationsDashboard(nextFrom, nextTo)); } catch (reason) { setError(reason instanceof Error ? reason.message : "运营数据加载失败"); } finally { setLoading(false); } }
  useEffect(() => { refreshSession().then((account) => { if (!account.roles.some((role) => ["operator", "admin"].includes(role))) { setError("当前账号没有查看运营数据的权限"); setLoading(false); return; } setUser(account); void load(initialFrom, initialTo); }).catch(() => router.replace("/auth")); }, [router]);
  function submit(event: FormEvent) { event.preventDefault(); void load(); }
  const chartMax = useMemo(() => Math.max(1, ...(data?.series.map((row) => row.newUsers + row.posts + row.interactions + row.eventRegistrations + row.recommendationClicks) ?? [1])), [data]);

  return <main className="ops-admin-page"><OperationsAdminNav active="dashboard" userName={user?.displayName} /><div className="ops-admin-shell">
    <section className="ops-title dashboard-title"><div><p className="eyebrow">OPERATIONS SIGNAL ROOM</p><h1>运营数据看板</h1><p>从用户增长到采集质量，再到推荐转化；所有指标使用同一日期窗口。</p></div><form onSubmit={submit}><label>开始<input type="date" value={from} max={to} onChange={(event) => setFrom(event.target.value)} /></label><span>—</span><label>结束<input type="date" value={to} min={from} onChange={(event) => setTo(event.target.value)} /></label><button disabled={loading}>更新</button></form></section>
    {error && <p className="ops-error" role="alert">{error}</p>}
    {loading ? <p className="ops-state">正在汇总运营数据…</p> : data && <>
      <section className="ops-kpi-ledger" aria-label="核心运营指标">
        <Metric label="新增用户" value={formatNumber(data.summary.newUsers)} note="日期窗口内注册" />
        <Metric label="活跃用户" value={formatNumber(data.summary.activeUsers)} note="产生内容或互动" />
        <Metric label="阅读" value={formatNumber(data.summary.reads)} note="指标快照增量" />
        <Metric label="发帖" value={formatNumber(data.summary.posts)} note="社区新主题" />
        <Metric label="互动" value={formatNumber(data.summary.interactions)} note="评论 / 赞 / 收藏 / 关注" />
        <Metric label="活动报名" value={formatNumber(data.summary.eventRegistrations)} note="含待确认与已确认" />
        <Metric label="采集成功率" value={`${data.summary.crawlSuccessRate.toFixed(1)}%`} note="成功 / 已结束任务" />
        <Metric label="推荐点击率" value={`${data.summary.recommendationCtr.toFixed(1)}%`} note={`${data.summary.recommendationClicks} 点击 / ${data.summary.recommendationImpressions} 曝光`} accent />
      </section>

      <section className="ops-trend"><header><div><p className="eyebrow">DAILY PULSE</p><h2>每日运营脉冲</h2></div><p>每条横线是一日真实行为总量，颜色分别代表互动、发帖、新增用户、活动报名与推荐点击。</p></header>{data.series.length ? <div className="pulse-chart" role="img" aria-label="每日运营数据条形图">{data.series.map((row) => { const total = row.newUsers + row.posts + row.interactions + row.eventRegistrations + row.recommendationClicks; return <div className="pulse-row" key={row.date}><time>{row.date.slice(5)}</time><div className="pulse-track" title={`${row.date}：${total} 次`}><i className="interactions" style={{ width: `${row.interactions / chartMax * 100}%` }} /><i className="posts" style={{ width: `${row.posts / chartMax * 100}%` }} /><i className="users" style={{ width: `${row.newUsers / chartMax * 100}%` }} /><i className="registrations" style={{ width: `${row.eventRegistrations / chartMax * 100}%` }} /><i className="clicks" style={{ width: `${row.recommendationClicks / chartMax * 100}%` }} /></div><b>{total}</b></div>; })}</div> : <p className="ops-state">这个日期范围还没有可绘制的运营行为。</p>}<footer><span className="interactions">互动</span><span className="posts">发帖</span><span className="users">新增用户</span><span className="registrations">报名</span><span className="clicks">推荐点击</span></footer></section>

      <section className="popular-content"><header><div><p className="eyebrow">CONTENT ATTENTION</p><h2>热门内容</h2></div><Link href="/rankings">查看公开热榜 →</Link></header>{data.popularContent.length ? <div className="popular-table"><table><thead><tr><th>排名</th><th>内容</th><th>类型</th><th>阅读</th><th>互动</th><th>综合值</th></tr></thead><tbody>{data.popularContent.map((item, index) => <tr key={`${item.contentType}-${item.contentId}`}><td>{String(index + 1).padStart(2, "0")}</td><td>{item.url.startsWith("/") ? <Link href={item.url}>{item.title}</Link> : <a href={item.url} target="_blank" rel="noreferrer">{item.title}</a>}</td><td>{item.contentType}</td><td>{formatNumber(item.reads)}</td><td>{formatNumber(item.interactions)}</td><td>{formatNumber(Math.round(item.score))}</td></tr>)}</tbody></table></div> : <p className="ops-state">该日期范围没有同步过内容指标。</p>}</section>
    </>}
  </div></main>;
}

function Metric({ label, value, note, accent = false }: { label: string; value: string; note: string; accent?: boolean }) { return <article className={accent ? "accent" : ""}><p>{label}</p><strong>{value}</strong><small>{note}</small></article>; }
function formatNumber(value: number) { return new Intl.NumberFormat("zh-CN").format(value); }
function localDate(value: Date) { const local = new Date(value.getTime() - value.getTimezoneOffset() * 60_000); return local.toISOString().slice(0, 10); }
