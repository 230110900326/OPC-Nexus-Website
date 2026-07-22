"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { refreshSession } from "../lib/auth";
import {
  createCrawlSource,
  getCrawlKeywords,
  getReviewQueue,
  ingestArticle,
  listCrawlJobs,
  listCrawlJobLogs,
  listCrawlSources,
  mergeArticle,
  rejectArticle,
  updateCrawlSource,
  type CrawlJob,
  type CrawlLog,
  type CrawlSource,
  type CrawlSourceType,
  type CrawlAuthorizationStatus,
  type ReviewArticle,
} from "../lib/crawl";
import { OperationsAdminNav } from "./operations-admin-nav";

type Account = { id: string; email: string; displayName: string; roles: string[] };

type Tab = "sources" | "jobs" | "review";

const SOURCE_TYPES: CrawlSourceType[] = ["NEWS", "POLICY", "RSS", "SITEMAP"];
const FETCH_METHODS = ["HTML", "RSS", "SITEMAP", "ADAPTER"] as const;
const AUTH_STATUSES: CrawlAuthorizationStatus[] = ["PENDING", "AUTHORIZED", "RESTRICTED", "REJECTED"];

function statusLabel(s: CrawlAuthorizationStatus) {
  const map: Record<string, string> = { PENDING: "待审核", AUTHORIZED: "已授权", RESTRICTED: "受限", REJECTED: "已拒绝" };
  return map[s] ?? s;
}

export function CrawlAdmin() {
  const router = useRouter();
  const [account, setAccount] = useState<Account | null>(null);
  const [tab, setTab] = useState<Tab>("sources");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const mountedRef = useRef(true);

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  useEffect(() => {
    refreshSession()
      .then((acct) => {
        if (!mountedRef.current) return;
        if (!acct) { router.replace("/auth"); return; }
        const allowed = acct.roles.some((r: string) =>
          ["operator", "admin"].includes(r)
        );
        if (!allowed) { setError("当前账号没有采集管理权限"); return; }
        setAccount(acct);
      })
      .catch(() => { if (mountedRef.current) router.replace("/auth"); });
  }, [router]);

  const clearMessages = () => { setError(""); setSuccess(""); };

  if (!account) {
    return <div className="ops-admin-page"><div className="ops-admin-shell"><div className="ops-state">加载中…</div></div></div>;
  }

  return (
    <main className="ops-admin-page">
      <OperationsAdminNav active="crawl" userName={account.displayName} />
      <div className="ops-admin-shell">
        <div className="ops-title">
          <div>
            <p className="eyebrow">内容采集管理</p>
            <h1>采集中心</h1>
            <p>管理爬取来源、监控采集作业、审核入库内容</p>
          </div>
        </div>
        {error && <div className="ops-error" role="alert">{error}</div>}
        {success && <div className="ops-success" role="status">{success}</div>}
        <div className="demand-admin-tabs" style={{ marginTop: 30 }}>
          {(["sources", "jobs", "review"] as Tab[]).map((t) => (
            <button key={t} className={tab === t ? "active" : ""} onClick={() => { setTab(t); clearMessages(); }}>
              {t === "sources" ? "采集来源" : t === "jobs" ? "采集作业" : "审核队列"}
            </button>
          ))}
        </div>
        {tab === "sources" && <SourcesPanel onError={setError} onSuccess={setSuccess} />}
        {tab === "jobs" && <JobsPanel onError={setError} />}
        {tab === "review" && <ReviewPanel onError={setError} onSuccess={setSuccess} />}
      </div>
    </main>
  );
}

// ── Sources Panel ──

function SourcesPanel({ onError, onSuccess }: { onError: (m: string) => void; onSuccess: (m: string) => void }) {
  const [sources, setSources] = useState<CrawlSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("");
  const [authFilter, setAuthFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [formName, setFormName] = useState("");
  const [formDomain, setFormDomain] = useState("");
  const [formType, setFormType] = useState<CrawlSourceType>("NEWS");
  const [formFetch, setFormFetch] = useState("HTML");
  const [formSchedule, setFormSchedule] = useState(360);
  const [formTrust, setFormTrust] = useState(3);
  const [formAuth, setFormAuth] = useState<CrawlAuthorizationStatus>("PENDING");
  const [formEnabled, setFormEnabled] = useState(false);
  const [formKeywords, setFormKeywords] = useState("");
  const [formEntryUrl, setFormEntryUrl] = useState("");

  const fetchSources = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (typeFilter) params.type = typeFilter;
      if (authFilter) params.authorizationStatus = authFilter;
      const data = await listCrawlSources(
        Object.keys(params).length > 0
          ? params as { type?: CrawlSourceType; authorizationStatus?: CrawlAuthorizationStatus }
          : undefined
      );
      setSources(data);
    } catch (e: any) {
      onError(e?.message ?? "加载采集来源失败");
    } finally {
      setLoading(false);
    }
  }, [typeFilter, authFilter, onError]);

  useEffect(() => { fetchSources(); }, [fetchSources]);

  function openCreate() {
    setEditingId(null);
    setFormName(""); setFormDomain(""); setFormType("NEWS"); setFormFetch("HTML");
    setFormSchedule(360); setFormTrust(3); setFormAuth("PENDING"); setFormEnabled(false);
    setFormKeywords(""); setFormEntryUrl("");
    setShowForm(true);
  }

  function openEdit(s: CrawlSource) {
    setEditingId(s.id);
    setFormName(s.name); setFormDomain(s.domain); setFormType(s.type); setFormFetch(s.fetchMethod);
    setFormSchedule(s.scheduleMinutes); setFormTrust(s.trustLevel); setFormAuth(s.authorizationStatus);
    setFormEnabled(s.isEnabled); setFormKeywords((s.keywords ?? []).join(", ")); setFormEntryUrl(s.entryUrl ?? "");
    setShowForm(true);
  }

  async function handleSave() {
    if (!formName.trim() || !formDomain.trim()) { onError("名称和来源域名不能为空"); return; }
    setSaving(true);
    try {
      const payload = {
        name: formName.trim(),
        domain: formDomain.trim(),
        type: formType,
        fetchMethod: formFetch as any,
        scheduleMinutes: formSchedule,
        trustLevel: formTrust,
        authorizationStatus: formAuth,
        isEnabled: formEnabled,
        keywords: formKeywords.split(",").map((k) => k.trim()).filter(Boolean),
        entryUrl: formEntryUrl.trim() || undefined,
      };
      if (editingId) {
        await updateCrawlSource(editingId, payload);
        onSuccess("来源已更新");
      } else {
        await createCrawlSource(payload as any);
        onSuccess("来源已创建");
      }
      setShowForm(false);
      fetchSources();
    } catch (e: any) {
      onError(e?.message ?? "保存失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="demand-admin-toolbar">
        <div>
          <label>类型<select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">全部</option>
            {SOURCE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select></label>
          <label>授权<select value={authFilter} onChange={(e) => setAuthFilter(e.target.value)}>
            <option value="">全部</option>
            {AUTH_STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
          </select></label>
        </div>
        <button onClick={openCreate}>+ 添加来源</button>
      </div>

      {showForm && (
        <div className="config-workbench" style={{ paddingTop: 20, paddingBottom: 20 }}>
          <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} style={{ padding: 24 }}>
            <header><p>{editingId ? "编辑采集来源" : "新建采集来源"}</p></header>
            <div className="config-form-grid">
              <label>名称 <input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="来源名称" /></label>
              <label>来源域名 <input value={formDomain} onChange={(e) => setFormDomain(e.target.value)} placeholder="example.com" /></label>
              <label>类型 <select value={formType} onChange={(e) => setFormType(e.target.value as CrawlSourceType)}>
                {SOURCE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select></label>
              <label>采集方式 <select value={formFetch} onChange={(e) => setFormFetch(e.target.value)}>
                {FETCH_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select></label>
              <label>调度间隔(分钟) <input type="number" min={5} max={10080} value={formSchedule} onChange={(e) => setFormSchedule(Number(e.target.value))} /></label>
              <label>信任等级(1-5) <input type="number" min={1} max={5} value={formTrust} onChange={(e) => setFormTrust(Number(e.target.value))} /></label>
              <label>授权状态 <select value={formAuth} onChange={(e) => setFormAuth(e.target.value as CrawlAuthorizationStatus)}>
                {AUTH_STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
              </select></label>
              <label className="config-online">启用采集 <input type="checkbox" checked={formEnabled} onChange={(e) => setFormEnabled(e.target.checked)} /></label>
              <label className="wide">关键词(英文逗号分隔) <input value={formKeywords} onChange={(e) => setFormKeywords(e.target.value)} placeholder="OPC, 一人公司" /></label>
              <label className="wide">入口URL <input value={formEntryUrl} onChange={(e) => setFormEntryUrl(e.target.value)} placeholder="https://example.com/news" /></label>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
              <button type="submit" className="ops-primary" style={{ width: "auto" }} disabled={saving}>{saving ? "保存中…" : "保存"} <span>→</span></button>
              <button type="button" onClick={() => setShowForm(false)} style={{ border: "1px solid var(--line)", background: "transparent", padding: "11px 16px", cursor: "pointer" }}>取消</button>
            </div>
          </form>
        </div>
      )}

      <div className="config-registry" style={{ marginTop: 20 }}>
        <header>
          <h2>已注册来源</h2>
          <span>{sources.length} 个来源</span>
        </header>
        {loading ? (
          <div className="ops-state"><p>加载中…</p></div>
        ) : sources.length === 0 ? (
          <div className="ops-state"><p>暂无采集来源，点击上方按钮添加</p></div>
        ) : (
          <div className="config-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>名称</th><th>域名</th><th>类型</th><th>采集方式</th>
                  <th>间隔(分)</th><th>信任</th><th>授权</th><th>启用</th><th>操作</th>
                </tr>
              </thead>
              <tbody>
                {sources.map((s) => (
                  <tr key={s.id}>
                    <td><strong>{s.name}</strong><small>{s.keywords?.slice(0, 3).join(" · ") || "—"}</small></td>
                    <td>{s.domain}</td>
                    <td><span className="status-pill">{s.type}</span></td>
                    <td>{s.fetchMethod}</td>
                    <td>{s.scheduleMinutes}</td>
                    <td>{s.trustLevel}</td>
                    <td><span className={`status-pill ${s.authorizationStatus === "AUTHORIZED" ? "published" : s.authorizationStatus === "RESTRICTED" ? "offline" : "review"}`}>{statusLabel(s.authorizationStatus)}</span></td>
                    <td><span className={`config-status ${s.isEnabled ? "live" : ""}`}>{s.isEnabled ? "启用" : "停用"}</span></td>
                    <td>
                      <div className="table-actions">
                        <button onClick={() => openEdit(s)}>编辑</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Jobs Panel ──

function JobsPanel({ onError }: { onError: (m: string) => void }) {
  const [jobs, setJobs] = useState<CrawlJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<CrawlJob | null>(null);
  const [logs, setLogs] = useState<CrawlLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      setJobs(await listCrawlJobs());
    } catch (e: any) {
      onError(e?.message ?? "加载作业失败");
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  async function openLogs(job: CrawlJob) {
    setSelectedJob(job);
    setLogsLoading(true);
    try {
      setLogs(await listCrawlJobLogs(job.id));
    } catch {
      setLogs([]);
    } finally {
      setLogsLoading(false);
    }
  }

  const jobStatusLabel = (s: string) => {
    const map: Record<string, string> = { queued: "排队中", running: "运行中", succeeded: "已完成", failed: "失败" };
    return map[s] ?? s;
  };

  return (
    <div>
      <div className="demand-admin-toolbar">
        <span style={{ color: "var(--ink-soft)", fontSize: 12 }}>最近 100 条作业记录</span>
        <button onClick={fetchJobs}>刷新</button>
      </div>

      {loading ? (
        <div className="ops-state"><p>加载中…</p></div>
      ) : jobs.length === 0 ? (
        <div className="ops-state"><p>暂无采集作业</p></div>
      ) : (
        <div className="config-table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>来源</th><th>状态</th><th>发现数</th><th>错误</th><th>开始时间</th><th>结束时间</th><th>操作</th></tr>
            </thead>
            <tbody>
              {jobs.map((j) => (
                <tr key={j.id}>
                  <td><strong>{j.source?.name ?? "—"}</strong></td>
                  <td><span className={`status-pill ${j.status === "succeeded" ? "published" : j.status === "failed" ? "offline" : j.status === "running" ? "" : "review"}`}>{jobStatusLabel(j.status)}</span></td>
                  <td>{j.discoveredCount}</td>
                  <td><small>{j.errorMessage ?? "—"}</small></td>
                  <td><small>{j.startedAt ? new Date(j.startedAt).toLocaleString() : "—"}</small></td>
                  <td><small>{j.finishedAt ? new Date(j.finishedAt).toLocaleString() : "—"}</small></td>
                  <td><button onClick={() => openLogs(j)} style={{ padding: "4px 8px", fontSize: 10, cursor: "pointer" }}>日志</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedJob && (
        <div style={{ marginTop: 28, borderTop: "2px solid var(--ink)", paddingTop: 18 }}>
          <h2 style={{ margin: 0, font: "500 24px Georgia, serif" }}>
            作业日志 <small style={{ color: "var(--ink-soft)", fontSize: 12, fontFamily: "monospace" }}>{selectedJob.id.slice(0, 8)}</small>
          </h2>
          {logsLoading ? (
            <p style={{ color: "var(--ink-soft)" }}>加载中…</p>
          ) : logs.length === 0 ? (
            <p style={{ color: "var(--ink-soft)" }}>暂无日志</p>
          ) : (
            <div style={{ maxHeight: 400, overflow: "auto", background: "#f7f5f0", padding: 14, marginTop: 12 }}>
              {logs.map((l, i) => (
                <div key={l.id ?? i} style={{ padding: "6px 0", borderBottom: "1px solid var(--line)", fontSize: 12, fontFamily: "monospace" }}>
                  <span style={{ color: l.level === "error" ? "#8d341e" : l.level === "warning" ? "#d58b59" : "var(--teal)", fontWeight: 700, marginRight: 10 }}>
                    [{l.level.toUpperCase()}]
                  </span>
                  <span style={{ color: "var(--ink-soft)", marginRight: 10 }}>{new Date(l.createdAt).toLocaleString()}</span>
                  <span>{l.message}</span>
                </div>
              ))}
            </div>
          )}
          <button onClick={() => setSelectedJob(null)} style={{ marginTop: 12, padding: "8px 12px", border: "1px solid var(--line)", background: "transparent", cursor: "pointer" }}>关闭日志</button>
        </div>
      )}
    </div>
  );
}

// ── Review Panel ──

function ReviewPanel({ onError, onSuccess }: { onError: (m: string) => void; onSuccess: (m: string) => void }) {
  const [queue, setQueue] = useState<ReviewArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState<ReviewArticle | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [mergeTargetId, setMergeTargetId] = useState("");

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    try {
      setQueue(await getReviewQueue());
    } catch (e: any) {
      onError(e?.message ?? "加载审核队列失败");
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => { fetchQueue(); }, [fetchQueue]);

  async function handleReject(id: string) {
    if (!confirm("确定拒绝此文章？将设为下线状态。")) return;
    setActionLoading(true);
    try {
      await rejectArticle(id);
      onSuccess("文章已拒绝");
      fetchQueue();
    } catch (e: any) {
      onError(e?.message ?? "操作失败");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleMerge(id: string) {
    if (!mergeTargetId.trim()) { onError("请输入目标文章ID"); return; }
    setActionLoading(true);
    try {
      await mergeArticle(id, mergeTargetId.trim());
      onSuccess("已合并到目标文章");
      setMergeTargetId("");
      fetchQueue();
    } catch (e: any) {
      onError(e?.message ?? "合并失败");
    } finally {
      setActionLoading(false);
    }
  }

  const typeLabel = (t: string) => {
    const map: Record<string, string> = { NEWS: "新闻", POLICY: "政策", VIDEO: "视频", COMMUNITY: "社区" };
    return map[t] ?? t;
  };

  return (
    <div>
      <div className="demand-admin-toolbar">
        <span style={{ color: "var(--ink-soft)", fontSize: 12 }}>{queue.length} 篇待审核</span>
        <button onClick={fetchQueue}>刷新</button>
      </div>

      {loading ? (
        <div className="ops-state"><p>加载中…</p></div>
      ) : queue.length === 0 ? (
        <div className="ops-state"><p>审核队列为空 🎉</p></div>
      ) : (
        <div className="config-table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>标题</th><th>来源</th><th>类型</th><th>分类</th><th>采集时间</th><th>操作</th></tr>
            </thead>
            <tbody>
              {queue.map((a) => (
                <tr key={a.id}>
                  <td>
                    <strong style={{ cursor: "pointer" }} onClick={() => setSelectedArticle(a)}>{a.title}</strong>
                    <small>{a.canonicalUrl ?? a.originalUrl}</small>
                  </td>
                  <td>{a.sources?.[0]?.name ?? "—"}</td>
                  <td><span className="status-pill">{typeLabel(a.type)}</span></td>
                  <td><small>{a.classification ? Object.entries(a.classification).map(([k, v]) => `${k} ${Math.round(v * 100)}%`).join(" · ") : "—"}</small></td>
                  <td><small>{new Date(a.createdAt).toLocaleString()}</small></td>
                  <td>
                    <div className="table-actions">
                      <button onClick={() => setSelectedArticle(a)}>查看</button>
                      <button onClick={() => handleReject(a.id)} className="danger">驳回</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedArticle && (
        <div className="demand-review-desk" style={{ marginTop: 35 }}>
          <header>
            <h2>文章详情</h2>
            <button onClick={() => setSelectedArticle(null)}>关闭</button>
          </header>
          <div className="review-split">
            <article>
              <h3>{selectedArticle.title}</h3>
              <dl>
                <div><dt>来源名称</dt><dd>{selectedArticle.sources?.[0]?.name ?? "—"}</dd></div>
                <div><dt>原始URL</dt><dd style={{ wordBreak: "break-all" }}><a href={selectedArticle.originalUrl} target="_blank" rel="noopener noreferrer" style={{ borderBottom: "1px solid var(--ink)" }}>{selectedArticle.originalUrl}</a></dd></div>
                <div><dt>规范URL</dt><dd style={{ wordBreak: "break-all" }}>{selectedArticle.canonicalUrl ?? "—"}</dd></div>
                <div><dt>类型</dt><dd>{typeLabel(selectedArticle.type)}</dd></div>
                <div><dt>状态</dt><dd><span className="status-pill review">{selectedArticle.status}</span></dd></div>
                <div><dt>发布时间</dt><dd>{selectedArticle.publishedAt ? new Date(selectedArticle.publishedAt).toLocaleString() : "—"}</dd></div>
                <div><dt>封面图</dt><dd>{selectedArticle.coverImageUrl ? <a href={selectedArticle.coverImageUrl} target="_blank" rel="noopener noreferrer" style={{ borderBottom: "1px solid var(--ink)" }}>查看</a> : "—"}</dd></div>
                <div><dt>自动分类</dt><dd>{selectedArticle.classification ? Object.entries(selectedArticle.classification).map(([k, v]) => `${k} ${Math.round(v * 100)}%`).join(" · ") : "—"}</dd></div>
                <div><dt>自动摘要</dt><dd>{selectedArticle.summary ?? "—"}</dd></div>
              </dl>
              {selectedArticle.content && (
                <div className="original-copy">
                  <p>{selectedArticle.content.slice(0, 800)}{selectedArticle.content.length > 800 ? "…" : ""}</p>
                </div>
              )}
            </article>
            <form onSubmit={(e) => { e.preventDefault(); }}>
              <h3 style={{ margin: 0, font: "500 20px Georgia, serif" }}>审核操作</h3>
              <div className="review-actions">
                <button type="button" disabled={actionLoading} onClick={() => handleReject(selectedArticle.id)} className="danger">驳回 · 下线</button>
              </div>
              <label style={{ marginTop: 14 }}>
                合并到目标文章ID
                <input value={mergeTargetId} onChange={(e) => setMergeTargetId(e.target.value)} placeholder="输入目标文章 UUID" />
              </label>
              <button type="button" disabled={actionLoading || !mergeTargetId.trim()} onClick={() => handleMerge(selectedArticle.id)} className="ops-primary" style={{ width: "100%", marginTop: 8 }}>
                合并到目标 <span>→</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
