"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Account, refreshSession } from "../lib/auth";
import { AuditAction, AuditLogPage, getAuditLogs } from "../lib/operations";
import { OperationsAdminNav } from "./operations-admin-nav";

const actionLabels: Record<AuditAction, string> = {
  "admin.login": "管理员登录", "content.create": "创建内容", "content.edit": "修改内容", "content.submit": "提交审核", "content.publish": "发布内容",
  "content.offline": "下线内容", "content.restore": "恢复内容", "moderation.review": "审核处置", "user.ban": "封禁用户", "ranking.weight_adjust": "调整权重",
  "homepage.config_create": "创建首页配置", "homepage.config_update": "修改首页配置", "homepage.config_delete": "删除首页配置",
};
type Filters = { actor: string; action: string; from: string; to: string };
const emptyFilters: Filters = { actor: "", action: "", from: "", to: "" };

export function AuditLogViewer() {
  const router = useRouter();
  const [user, setUser] = useState<Account | null>(null);
  const [draft, setDraft] = useState<Filters>(emptyFilters);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [data, setData] = useState<AuditLogPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load(query = filters, page = 1) { setLoading(true); setError(""); try { setData(await getAuditLogs({ ...query, page })); } catch (reason) { setError(reason instanceof Error ? reason.message : "操作日志加载失败"); } finally { setLoading(false); } }
  useEffect(() => { refreshSession().then((account) => { if (!account.roles.some((role) => ["operator", "admin"].includes(role))) { setError("当前账号没有查看管理员日志的权限"); setLoading(false); return; } setUser(account); void load(emptyFilters, 1); }).catch(() => router.replace("/auth")); }, [router]);
  function submit(event: FormEvent) { event.preventDefault(); setFilters(draft); void load(draft, 1); }
  function reset() { setDraft(emptyFilters); setFilters(emptyFilters); void load(emptyFilters, 1); }

  return <main className="ops-admin-page"><OperationsAdminNav active="audit" userName={user?.displayName} /><div className="ops-admin-shell">
    <section className="ops-title"><div><p className="eyebrow">ADMIN AUDIT TRAIL</p><h1>操作日志</h1><p>管理员登录、内容发布与修改、审核封禁、权重调整和首页配置变更均保留可查询记录。</p></div><span className="audit-retention">APPEND ONLY<br />按时间倒序</span></section>
    <form className="audit-filters" onSubmit={submit}>
      <label>人员<input value={draft.actor} onChange={(event) => setDraft((current) => ({ ...current, actor: event.target.value }))} placeholder="姓名、邮箱或用户 ID" /></label>
      <label>动作<select value={draft.action} onChange={(event) => setDraft((current) => ({ ...current, action: event.target.value }))}><option value="">全部动作</option>{Object.entries(actionLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
      <label>开始<input type="date" value={draft.from} max={draft.to || undefined} onChange={(event) => setDraft((current) => ({ ...current, from: event.target.value }))} /></label>
      <label>结束<input type="date" value={draft.to} min={draft.from || undefined} onChange={(event) => setDraft((current) => ({ ...current, to: event.target.value }))} /></label>
      <div><button type="submit">查询日志</button><button type="button" onClick={reset}>清空</button></div>
    </form>
    {error && <p className="ops-error" role="alert">{error}</p>}
    <section className="audit-ledger"><header><span>时间 / 人员</span><span>动作 / 对象</span><span>上下文</span></header>{loading ? <p className="ops-state">正在读取不可变日志…</p> : data?.items.length ? data.items.map((item) => <article key={item.id}><div><time>{new Date(item.createdAt).toLocaleString("zh-CN")}</time><strong>{item.actorName}</strong><small>{item.actorEmail}</small></div><div><span className={`audit-action ${item.action.startsWith("homepage") ? "config" : item.action.includes("ban") || item.action.includes("offline") ? "risk" : ""}`}>{actionLabels[item.action]}</span><strong>{item.targetType ?? "system"}</strong><small title={item.targetId ?? undefined}>{item.targetId ? shortId(item.targetId) : "—"}</small></div><pre>{metadata(item.metadata)}</pre></article>) : <p className="ops-state">当前筛选条件下没有操作日志。</p>}</section>
    {data && data.pagination.totalPages > 1 && <nav className="audit-pagination" aria-label="日志分页"><button disabled={data.pagination.page <= 1 || loading} onClick={() => void load(filters, data.pagination.page - 1)}>上一页</button><span>{data.pagination.page} / {data.pagination.totalPages} · 共 {data.pagination.total} 条</span><button disabled={data.pagination.page >= data.pagination.totalPages || loading} onClick={() => void load(filters, data.pagination.page + 1)}>下一页</button></nav>}
  </div></main>;
}

function shortId(value: string) { return value.length > 18 ? `${value.slice(0, 8)}…${value.slice(-4)}` : value; }
function metadata(value: Record<string, unknown>) { const entries = Object.entries(value); if (!entries.length) return "无附加上下文"; return entries.slice(0, 5).map(([key, item]) => `${key}: ${Array.isArray(item) ? item.join(", ") : typeof item === "object" && item !== null ? JSON.stringify(item) : String(item ?? "—")}`).join("\n"); }
