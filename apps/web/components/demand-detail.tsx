"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Account, refreshSession } from "../lib/auth";
import { addInteraction, createReport, getInteractionSummary, removeInteraction } from "../lib/forum";
import { Demand, DemandConnect, DemandContact, connectDemand, contactTypeLabels, demandBudgetLabels, demandTypeLabels, getDemand, getDemandContact, getDemandConnects, getMyDemandConnects, updateDemandConnect } from "../lib/demands";

export function DemandDetail() {
  const params = useParams<{ id: string }>(); const router = useRouter(); const id = params.id;
  const [demand, setDemand] = useState<Demand | null>(null); const [account, setAccount] = useState<Account | null>(null); const [contacts, setContacts] = useState<DemandContact[] | null>(null); const [connections, setConnections] = useState<DemandConnect[]>([]);
  const [ownConnection, setOwnConnection] = useState<DemandConnect | null>(null);
  const [favorite, setFavorite] = useState({ active: false, count: 0 }); const [connectOpen, setConnectOpen] = useState(false); const [reportOpen, setReportOpen] = useState(false); const [applyMsg, setApplyMsg] = useState(""); const [reportReason, setReportReason] = useState("虚假需求"); const [reportDetails, setReportDetails] = useState("");
  const [error, setError] = useState(""); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);

  useEffect(() => { getDemand(id).then(setDemand).catch((reason) => setError(reason instanceof Error ? reason.message : "需求加载失败")); getInteractionSummary("demand", id).then((value) => setFavorite((current) => ({ ...current, count: value.favorites }))).catch(() => undefined); }, [id]);
  useEffect(() => {
    setOwnConnection(null);
    refreshSession().then(async (user) => {
      setAccount(user);
      const response = await getDemandContact(id);
      setContacts(response.contactInfo);
      if (demand?.author.id === user.id) setConnections(await getDemandConnects(id));
      else setOwnConnection((await getMyDemandConnects("sent")).find((item) => item.demand.id === id) ?? null);
    }).catch(() => undefined);
  }, [id, demand?.author.id]);

  async function toggleFavorite() { if (!account) { router.push(`/auth?next=${encodeURIComponent(`/demands/${id}`)}`); return; } setError(""); try { const value = favorite.active ? await removeInteraction("favorites", "demand", id) : await addInteraction("favorites", "demand", id); setFavorite({ active: value.active, count: value.count }); } catch (reason) { setError(reason instanceof Error ? reason.message : "收藏操作失败"); } }
  async function apply(event: FormEvent) { event.preventDefault(); if (!account) { router.push(`/auth?next=${encodeURIComponent(`/demands/${id}`)}`); return; } setBusy(true); setError(""); try { const saved = await connectDemand(id, applyMsg); setOwnConnection(saved); setConnectOpen(false); setApplyMsg(""); setMessage("对接意向已送达需求方，可在用户中心跟踪状态。"); } catch (reason) { setError(reason instanceof Error ? reason.message : "对接意向提交失败"); } finally { setBusy(false); } }
  async function report(event: FormEvent) { event.preventDefault(); if (!account) { router.push(`/auth?next=${encodeURIComponent(`/demands/${id}`)}`); return; } setBusy(true); setError(""); try { await createReport({ targetType: "demand", targetId: id, reason: reportReason, details: reportDetails || undefined }); setReportOpen(false); setMessage("举报已提交，审核团队会核对原始内容和操作记录。"); } catch (reason) { setError(reason instanceof Error ? reason.message : "举报提交失败"); } finally { setBusy(false); } }
  async function changeConnect(connection: DemandConnect, status: DemandConnect["status"]) { try { const saved = await updateDemandConnect(id, connection.id, status); setConnections((current) => current.map((item) => item.id === saved.id ? saved : item)); } catch (reason) { setError(reason instanceof Error ? reason.message : "对接状态更新失败"); } }

  if (error && !demand) return <main className="demand-detail-state"><p className="form-error" role="alert">{error}</p><Link href="/demands">返回需求广场</Link></main>;
  if (!demand) return <main className="demand-detail-state">正在调取需求工单…</main>;
  const owner = account?.id === demand.author.id; const activeOwnConnection = ownConnection && ownConnection.status !== "cancelled"; const deadline = demand.deadline ? new Date(demand.deadline) : null;

  return <main className="demand-detail-page">
    <section className="demand-detail-head">
      <Link className="back-link" href="/demands">← 返回需求广场</Link>
      <div className="demand-detail-heading"><div><div className="demand-ticket-flags">{demand.isPinned && <strong>人工置顶</strong>}<span>{demandTypeLabels[demand.demandType]}</span>{demand.industries.map((industry) => <span key={industry.id}>{industry.name}</span>)}</div><h1>{demand.title}</h1><p>发布于 {new Date(demand.createdAt).toLocaleString("zh-CN")} · {demand.viewCount} 次浏览</p></div><div className="demand-seal"><small>REQUEST ID</small><b>{demand.id.slice(0, 8).toUpperCase()}</b><span>{demand.status === "published" ? "OPEN" : demand.status.toUpperCase()}</span></div></div>
    </section>
    <section className="demand-detail-layout">
      <article className="demand-brief">
        <header><p className="eyebrow">DELIVERY BRIEF</p><h2>需求与交付说明</h2></header>
        <div className="demand-content">{demand.content.split(/\n+/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
        {demand.imageUrls.length > 0 && <div className="demand-detail-images">{demand.imageUrls.map((url, index) => <img src={url} alt={`需求配图 ${index + 1}`} key={url} />)}</div>}
        <section className="demand-author-block"><div className="profile-monogram">{demand.author.displayName.slice(0, 1)}</div><div><p className="eyebrow">REQUEST OWNER</p><h3>{demand.author.displayName}{demand.author.certification === "institution" ? <span>机构认证</span> : demand.author.certification === "author" ? <span>认证作者</span> : null}</h3><p>{[demand.author.jobTitle, demand.author.company, demand.author.industry].filter(Boolean).join(" · ") || "平台注册用户"}</p></div><Link href={`/users/${demand.author.id}`}>查看主页 →</Link></section>
        {owner && <OwnerConnections connections={connections} onChange={changeConnect} />}
        {demand.related && demand.related.length > 0 && <section className="related-demands"><header><p className="eyebrow">RELATED REQUESTS</p><h2>同类需求</h2></header>{demand.related.map((item) => <article key={item.id}><div><span>{demandTypeLabels[item.demandType]}</span><h3><Link href={`/demands/${item.id}`}>{item.title}</Link></h3></div><b>{demandBudgetLabels[item.budgetRange]}</b></article>)}</section>}
      </article>
      <aside className="demand-action-column">
        <section className="demand-facts"><p className="eyebrow">MATCHING TERMS</p><dl><div><dt>预算</dt><dd>{demandBudgetLabels[demand.budgetRange]}</dd></div><div><dt>截止</dt><dd>{deadline ? deadline.toLocaleString("zh-CN") : "长期有效"}</dd></div><div><dt>对接意向</dt><dd>{demand.connectCount} 人</dd></div><div><dt>需求热度</dt><dd>{Number(demand.heatScore).toFixed(1)}</dd></div></dl></section>
        <section className="demand-contact-card"><p className="eyebrow">DIRECT CONTACT</p><h2>联系需求方</h2>{contacts ? <div className="contact-values">{contacts.map((contact) => <button onClick={() => navigator.clipboard?.writeText(contact.value)} title="点击复制" key={`${contact.type}-${contact.value}`}><span>{contactTypeLabels[contact.type]}</span><b>{contact.value}</b><small>复制</small></button>)}</div> : <div className="contact-gate"><p>联系方式仅向登录用户展示，登录后可直接查看，不收取解锁费用。</p><Link href={`/auth?next=${encodeURIComponent(`/demands/${id}`)}`}>登录查看 →</Link></div>}<p className="contact-disclaimer">平台只提供信息展示，不参与交易、不担保、不抽成。请自行核验身份与交付能力。</p></section>
        {!owner && activeOwnConnection && <Link className="demand-primary demand-connect-button" href="/account/demands?tab=sent">已提交意向 · 查看进度 <span>→</span></Link>}
        {!owner && !activeOwnConnection && <button className="demand-primary demand-connect-button" onClick={() => account ? setConnectOpen(true) : router.push(`/auth?next=${encodeURIComponent(`/demands/${id}`)}`)} disabled={Boolean(demand.expired)}>{ownConnection?.status === "cancelled" ? "重新发起意向对接" : "发起意向对接"} <span>→</span></button>}
        {owner && <Link className="demand-primary demand-connect-button" href="/account/demands">管理这条需求 <span>→</span></Link>}
        <div className="demand-secondary-actions"><button onClick={toggleFavorite}>{favorite.active ? "已收藏" : "收藏"} · {favorite.count}</button><button onClick={() => account ? setReportOpen(true) : router.push(`/auth?next=${encodeURIComponent(`/demands/${id}`)}`)}>举报</button></div>
      </aside>
    </section>
    {error && <p className="form-error demand-floating-message" role="alert">{error}</p>}{message && <p className="form-success demand-floating-message" role="status">{message}</p>}
    {connectOpen && <div className="demand-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setConnectOpen(false); }}><section className="demand-modal" role="dialog" aria-modal="true" aria-labelledby="connect-title"><button className="modal-close" onClick={() => setConnectOpen(false)} aria-label="关闭">×</button><p className="eyebrow">SEND MATCHING NOTE</p><h2 id="connect-title">说明你能提供什么</h2><p>需求方会看到你的平台资料和这段留言。请写清经验、交付方式与可投入时间。</p><form onSubmit={apply}><textarea required minLength={10} maxLength={1000} rows={7} value={applyMsg} onChange={(event) => setApplyMsg(event.target.value)} placeholder="例如：我长期跟踪新能源供应链，可在一周内完成 5 位从业者访谈并交付纪要…" /><button className="demand-primary" disabled={busy}>{busy ? "正在发送…" : "发送对接意向 →"}</button></form></section></div>}
    {reportOpen && <div className="demand-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setReportOpen(false); }}><section className="demand-modal" role="dialog" aria-modal="true" aria-labelledby="report-title"><button className="modal-close" onClick={() => setReportOpen(false)} aria-label="关闭">×</button><p className="eyebrow">TRUST &amp; SAFETY</p><h2 id="report-title">举报这条需求</h2><form onSubmit={report}><label>问题类型<select value={reportReason} onChange={(event) => setReportReason(event.target.value)}><option>虚假需求</option><option>需求广告</option><option>违规金融信息</option><option>骚扰联系方式</option><option>其他违规</option></select></label><label>补充说明<textarea maxLength={1000} rows={5} value={reportDetails} onChange={(event) => setReportDetails(event.target.value)} placeholder="请说明可核验的具体问题" /></label><button className="demand-primary" disabled={busy}>{busy ? "正在提交…" : "提交举报 →"}</button></form></section></div>}
  </main>;
}

function OwnerConnections({ connections, onChange }: { connections: DemandConnect[]; onChange: (connection: DemandConnect, status: DemandConnect["status"]) => void }) {
  return <section className="owner-connections"><header><div><p className="eyebrow">MATCHING INBOX</p><h2>收到的对接申请</h2></div><span>{connections.length} 条</span></header>{connections.length ? connections.map((connection) => <article key={connection.id}><div className="profile-monogram">{connection.applicant.displayName.slice(0, 1)}</div><div><h3>{connection.applicant.displayName}</h3><p>{connection.applyMsg}</p><small>{new Date(connection.createdAt).toLocaleString("zh-CN")}</small></div><select aria-label="更新对接状态" value={connection.status} onChange={(event) => onChange(connection, event.target.value as DemandConnect["status"])}><option value="viewed">已查看</option><option value="communicated">已沟通</option><option value="completed">合作完成</option></select></article>) : <p className="content-state">还没有收到对接申请。</p>}</section>;
}
