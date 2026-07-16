"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Account, refreshSession } from "../lib/auth";
import { Demand, DemandConnect, DemandStatus, completeDemand, deleteDemand, demandBudgetLabels, demandStatusLabels, demandTypeLabels, getMyDemandConnects, getMyDemands, offlineDemand, submitDemand, updateDemandConnect } from "../lib/demands";

type Tab = "published" | "sent" | "received";
const statuses: (DemandStatus | "")[] = ["", "draft", "pending_review", "published", "completed", "offline", "blocked"];
const tabs: Tab[] = ["published", "sent", "received"];

export function DemandAccount() {
  const router = useRouter(); const [account, setAccount] = useState<Account | null>(null); const [tab, setTab] = useState<Tab>("published"); const [status, setStatus] = useState<DemandStatus | "">("");
  const [demands, setDemands] = useState<Demand[]>([]); const [connections, setConnections] = useState<DemandConnect[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [message, setMessage] = useState("");

  useEffect(() => { const search = new URLSearchParams(window.location.search); const queryStatus = search.get("status") as DemandStatus | null; const queryTab = search.get("tab") as Tab | null; if (queryStatus && statuses.includes(queryStatus)) setStatus(queryStatus); if (queryTab && tabs.includes(queryTab)) setTab(queryTab); refreshSession().then(setAccount).catch(() => router.replace(`/auth?next=${encodeURIComponent("/account/demands")}`)); }, [router]);
  useEffect(() => { if (!account) return; void load(); }, [account, tab, status]);

  async function load() { setLoading(true); setError(""); try { if (tab === "published") { const result = await getMyDemands(status ? { status } : {}); setDemands(result.items); } else setConnections(await getMyDemandConnects(tab)); } catch (reason) { setError(reason instanceof Error ? reason.message : "需求记录加载失败"); } finally { setLoading(false); } }
  async function act(id: string, action: "submit" | "offline" | "complete" | "delete") { setError(""); setMessage(""); try { if (action === "submit") await submitDemand(id); else if (action === "offline") await offlineDemand(id); else if (action === "complete") await completeDemand(id); else { if (!window.confirm("确认删除这条草稿？删除后无法恢复。")) return; await deleteDemand(id); } setMessage({ submit: "需求已提交审核。", offline: "需求已下架。", complete: "需求已标记为完成。", delete: "草稿已删除。" }[action]); await load(); } catch (reason) { setError(reason instanceof Error ? reason.message : "操作未完成"); } }
  async function change(connection: DemandConnect, next: DemandConnect["status"]) { try { const saved = await updateDemandConnect(connection.demand.id, connection.id, next); setConnections((current) => current.map((item) => item.id === saved.id ? saved : item)); } catch (reason) { setError(reason instanceof Error ? reason.message : "状态更新失败"); } }

  return <main className="demand-account-page">
    <header className="account-header"><Link className="auth-brand" href="/"><span>OPC</span> NEXUS</Link><div className="account-header-actions"><Link href="/account">个人资料</Link><Link href="/demands">需求广场</Link><Link className="demand-primary" href="/demands/new">发布需求 →</Link></div></header>
    <section className="demand-account-shell">
      <div className="demand-account-heading"><div><p className="eyebrow">MY MATCHING DESK</p><h1>我的供需工作台</h1><p>{account ? `${account.displayName}，在这里跟进发布、申请和收到的对接。` : "正在核验身份…"}</p></div><div className="account-tally"><b>{tab === "published" ? demands.length : connections.length}</b><span>当前记录</span></div></div>
      <nav className="demand-account-tabs" aria-label="需求工作台"><button className={tab === "published" ? "active" : ""} onClick={() => setTab("published")}>我的需求</button><button className={tab === "sent" ? "active" : ""} onClick={() => setTab("sent")}>我的对接意向</button><button className={tab === "received" ? "active" : ""} onClick={() => setTab("received")}>收到的对接申请</button></nav>
      {tab === "published" && <div className="demand-status-tabs">{statuses.map((value) => <button className={status === value ? "active" : ""} onClick={() => setStatus(value)} key={value || "all"}>{value ? demandStatusLabels[value] : "全部"}</button>)}</div>}
      {error && <p className="form-error" role="alert">{error}</p>}{message && <p className="form-success" role="status">{message}</p>}
      {loading ? <p className="content-state">正在同步你的撮合记录…</p> : tab === "published" ? <DemandRows items={demands} onAction={act} /> : <ConnectRows items={connections} direction={tab} onChange={change} />}
    </section>
  </main>;
}

function DemandRows({ items, onAction }: { items: Demand[]; onAction: (id: string, action: "submit" | "offline" | "complete" | "delete") => void }) {
  if (!items.length) return <div className="demand-empty"><strong>这里还没有需求记录</strong><p>从一个具体、可交付的问题开始。</p><Link href="/demands/new">发布第一条需求 →</Link></div>;
  return <section className="my-demand-list">{items.map((demand) => <article key={demand.id}><div className="my-demand-index"><span>{demandTypeLabels[demand.demandType]}</span><b className={`status-${demand.status}`}>{demandStatusLabels[demand.status]}</b></div><div><h2>{demand.status === "published" ? <Link href={`/demands/${demand.id}`}>{demand.title}</Link> : demand.title}</h2><p>{demand.content}</p><footer><span>{demandBudgetLabels[demand.budgetRange]}</span><span>{demand.connectCount} 个对接意向</span><span>更新于 {new Date(demand.updatedAt).toLocaleString("zh-CN")}</span></footer>{demand.reviewReason && <p className="review-reason">审核说明：{demand.reviewReason}</p>}</div><div className="my-demand-actions">{["draft", "offline"].includes(demand.status) && <Link href={`/demands/${demand.id}/edit`}>编辑</Link>}{demand.status === "draft" && <><button onClick={() => onAction(demand.id, "submit")}>提交审核</button><button onClick={() => onAction(demand.id, "delete")}>删除</button></>}{demand.status === "published" && <><button onClick={() => onAction(demand.id, "complete")}>标记完成</button><button onClick={() => onAction(demand.id, "offline")}>下架</button></>}</div></article>)}</section>;
}

function ConnectRows({ items, direction, onChange }: { items: DemandConnect[]; direction: "sent" | "received"; onChange: (item: DemandConnect, status: DemandConnect["status"]) => void }) {
  if (!items.length) return <div className="demand-empty"><strong>{direction === "sent" ? "尚未发起对接" : "尚未收到对接申请"}</strong><p>{direction === "sent" ? "浏览开放需求，向合适的需求方说明你的能力。" : "需求通过审核后，意向会出现在这里。"}</p><Link href="/demands">浏览需求广场 →</Link></div>;
  return <section className="my-connect-list">{items.map((item) => <article key={item.id}><div className="connect-party"><div className="profile-monogram">{(direction === "sent" ? item.demand.author.displayName : item.applicant.displayName).slice(0, 1)}</div><span>{direction === "sent" ? "需求方" : "申请人"}<b>{direction === "sent" ? item.demand.author.displayName : item.applicant.displayName}</b></span></div><div><p className="eyebrow">{connectStatusLabel(item.status)}</p><h2><Link href={`/demands/${item.demand.id}`}>{item.demand.title}</Link></h2><blockquote>{item.applyMsg}</blockquote><small>{new Date(item.createdAt).toLocaleString("zh-CN")}</small></div><div className="my-demand-actions">{direction === "sent" ? !["cancelled", "completed"].includes(item.status) && <button onClick={() => onChange(item, "cancelled")}>取消意向</button> : <select value={item.status} onChange={(event) => onChange(item, event.target.value as DemandConnect["status"])}><option value="viewed">已查看</option><option value="communicated">已沟通</option><option value="completed">合作完成</option></select>}<Link href={`/users/${direction === "sent" ? item.demand.author.id : item.applicant.id}`}>查看对方主页</Link></div></article>)}</section>;
}
function connectStatusLabel(value: DemandConnect["status"]) { return { pending_view: "等待需求方查看", viewed: "需求方已查看", communicated: "已进入沟通", completed: "合作完成", cancelled: "意向已取消" }[value]; }
