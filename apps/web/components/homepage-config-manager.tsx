"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Account, refreshSession } from "../lib/auth";
import { AdminHomepageConfig, HomepageConfigInput, HomepageConfigKind, HomepageModuleKey, createHomepageConfig, deleteHomepageConfig, getHomepageConfigs, updateHomepageConfig } from "../lib/operations";
import { OperationsAdminNav } from "./operations-admin-nav";

type Draft = {
  kind: HomepageConfigKind; moduleKey: HomepageModuleKey; title: string; subtitle: string; targetUrl: string; imageUrl: string;
  displayPosition: string; sortOrder: string; contentType: string; contentId: string; effectiveFrom: string; effectiveTo: string; isOnline: boolean;
};
const emptyDraft = (): Draft => ({ kind: "banner", moduleKey: "focus", title: "", subtitle: "", targetUrl: "", imageUrl: "", displayPosition: "main", sortOrder: "0", contentType: "", contentId: "", effectiveFrom: "", effectiveTo: "", isOnline: false });
const kindLabels: Record<HomepageConfigKind, string> = { banner: "Banner", module: "首页模块", recommendation: "人工推荐" };
const moduleLabels: Record<HomepageModuleKey, string> = { focus: "焦点", recommendations: "推荐信息流", policies: "政策精选", videos: "热门视频", discussions: "社区热议", events: "近期活动", creators: "推荐作者" };

export function HomepageConfigManager() {
  const router = useRouter();
  const [user, setUser] = useState<Account | null>(null);
  const [configs, setConfigs] = useState<AdminHomepageConfig[]>([]);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() { setLoading(true); setError(""); try { setConfigs(await getHomepageConfigs()); } catch (reason) { setError(reason instanceof Error ? reason.message : "首页配置加载失败"); } finally { setLoading(false); } }
  useEffect(() => { refreshSession().then((account) => { if (!account.roles.some((role) => ["operator", "admin"].includes(role))) { setError("当前账号没有运营配置权限"); return; } setUser(account); void load(); }).catch(() => router.replace("/auth")); }, [router]);

  function field<K extends keyof Draft>(key: K, value: Draft[K]) { setDraft((current) => ({ ...current, [key]: value })); }
  function edit(config: AdminHomepageConfig) { setEditingId(config.id); setDraft({ kind: config.kind, moduleKey: config.moduleKey, title: config.title, subtitle: config.subtitle ?? "", targetUrl: config.targetUrl ?? "", imageUrl: config.imageUrl ?? "", displayPosition: config.displayPosition, sortOrder: String(config.sortOrder), contentType: config.contentType ?? "", contentId: config.contentId ?? "", effectiveFrom: toDateInput(config.effectiveFrom), effectiveTo: toDateInput(config.effectiveTo), isOnline: config.isOnline }); setMessage(""); setError(""); window.scrollTo({ top: 0, behavior: "smooth" }); }
  function reset() { setEditingId(null); setDraft(emptyDraft()); }
  async function submit(event: FormEvent) { event.preventDefault(); setSaving(true); setMessage(""); setError(""); try { const input = payload(draft); if (editingId) await updateHomepageConfig(editingId, input); else await createHomepageConfig(input); setMessage(editingId ? "配置已更新。" : "配置已创建。"); reset(); await load(); } catch (reason) { setError(reason instanceof Error ? reason.message : "配置保存失败"); } finally { setSaving(false); } }
  async function toggle(config: AdminHomepageConfig) { setError(""); try { await updateHomepageConfig(config.id, { isOnline: !config.isOnline }); await load(); } catch (reason) { setError(reason instanceof Error ? reason.message : "状态更新失败"); } }
  async function remove(config: AdminHomepageConfig) { if (!window.confirm(`删除“${config.title}”？此操作会写入审计日志。`)) return; setError(""); try { await deleteHomepageConfig(config.id); if (editingId === config.id) reset(); await load(); } catch (reason) { setError(reason instanceof Error ? reason.message : "配置删除失败"); } }

  return <main className="ops-admin-page"><OperationsAdminNav active="homepage" userName={user?.displayName} /><div className="ops-admin-shell">
    <section className="ops-title"><div><p className="eyebrow">HOMEPAGE CONTROL DESK</p><h1>首页编排</h1><p>控制 Banner、模块顺序和人工推荐；所有上下线与改动都会进入管理员审计日志。</p></div><Link href="/" target="_blank">预览当前首页 ↗</Link></section>
    <section className="config-workbench">
      <form onSubmit={(event) => void submit(event)}>
        <header><div><p>{editingId ? "EDIT CONFIG" : "NEW CONFIG"}</p><h2>{editingId ? "编辑配置" : "新增配置"}</h2></div>{editingId && <button type="button" onClick={reset}>取消编辑</button>}</header>
        <div className="config-form-grid">
          <label>配置类型<select value={draft.kind} onChange={(event) => field("kind", event.target.value as HomepageConfigKind)}>{Object.entries(kindLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
          <label>所属模块<select value={draft.moduleKey} onChange={(event) => field("moduleKey", event.target.value as HomepageModuleKey)}>{Object.entries(moduleLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
          <label className="wide">标题<input required maxLength={180} value={draft.title} onChange={(event) => field("title", event.target.value)} placeholder="面向访问者显示的标题" /></label>
          <label className="wide">说明<textarea rows={3} maxLength={600} value={draft.subtitle} onChange={(event) => field("subtitle", event.target.value)} placeholder="Banner 副标题或运营备注" /></label>
          <label>目标链接<input value={draft.targetUrl} onChange={(event) => field("targetUrl", event.target.value)} placeholder="/policies 或 https://…" /></label>
          <label>图片链接<input value={draft.imageUrl} onChange={(event) => field("imageUrl", event.target.value)} placeholder="可选图片 URL" /></label>
          <label>展示位置<input value={draft.displayPosition} onChange={(event) => field("displayPosition", event.target.value)} placeholder="main" /></label>
          <label>排序值<input type="number" min="0" value={draft.sortOrder} onChange={(event) => field("sortOrder", event.target.value)} /></label>
          <label>关联内容类型<select value={draft.contentType} onChange={(event) => field("contentType", event.target.value)}><option value="">不关联</option>{["article", "policy", "video", "post", "event", "creator"].map((value) => <option value={value} key={value}>{value}</option>)}</select></label>
          <label>关联内容 ID<input value={draft.contentId} onChange={(event) => field("contentId", event.target.value)} placeholder="UUID（需与类型同时填写）" /></label>
          <label>生效时间<input type="datetime-local" value={draft.effectiveFrom} onChange={(event) => field("effectiveFrom", event.target.value)} /></label>
          <label>失效时间<input type="datetime-local" value={draft.effectiveTo} onChange={(event) => field("effectiveTo", event.target.value)} /></label>
          <label className="config-online"><input type="checkbox" checked={draft.isOnline} onChange={(event) => field("isOnline", event.target.checked)} /><span>保存后立即上线</span></label>
        </div>
        {error && <p className="ops-error" role="alert">{error}</p>}{message && <p className="ops-success" role="status">{message}</p>}
        <button className="ops-primary" disabled={saving} type="submit">{saving ? "正在保存…" : editingId ? "保存更改" : "创建配置"}<span>→</span></button>
      </form>
      <aside><p className="eyebrow">SCHEDULING RULES</p><h2>上线判断</h2><ol><li><b>01</b><span>状态必须为上线。</span></li><li><b>02</b><span>当前时间已到生效时间。</span></li><li><b>03</b><span>当前时间未超过失效时间。</span></li></ol><p>模块未配置时使用默认顺序；一旦创建模块配置，其上下线与时间窗口会成为该模块的显示依据。</p></aside>
    </section>

    <section className="config-registry"><header><div><p className="eyebrow">CONFIG REGISTRY</p><h2>配置台账</h2></div><span>{configs.length} 条配置</span></header>{loading ? <p className="ops-state">正在读取配置…</p> : configs.length ? <div className="config-table-wrap"><table><thead><tr><th>配置</th><th>模块 / 位置</th><th>时间窗口</th><th>状态</th><th>操作</th></tr></thead><tbody>{configs.map((config) => <tr key={config.id}><td><strong>{config.title}</strong><small>{kindLabels[config.kind]} · 排序 {config.sortOrder}</small></td><td>{moduleLabels[config.moduleKey]}<small>{config.displayPosition}</small></td><td>{formatWindow(config)}</td><td><span className={`config-status ${currentlyActive(config) ? "live" : config.isOnline ? "scheduled" : "offline"}`}>{currentlyActive(config) ? "生效中" : config.isOnline ? "待生效" : "已下线"}</span></td><td><button onClick={() => edit(config)}>编辑</button><button onClick={() => void toggle(config)}>{config.isOnline ? "下线" : "上线"}</button><button className="danger" onClick={() => void remove(config)}>删除</button></td></tr>)}</tbody></table></div> : <p className="ops-state">还没有人工配置，首页当前使用默认模块顺序。</p>}</section>
  </div></main>;
}

function payload(draft: Draft): HomepageConfigInput { return { kind: draft.kind, moduleKey: draft.moduleKey, title: draft.title.trim(), subtitle: draft.subtitle.trim() || null, targetUrl: draft.targetUrl.trim() || null, imageUrl: draft.imageUrl.trim() || null, displayPosition: draft.displayPosition.trim() || "main", sortOrder: Number(draft.sortOrder || 0), contentType: draft.contentType || null, contentId: draft.contentId.trim() || null, effectiveFrom: draft.effectiveFrom ? new Date(draft.effectiveFrom).toISOString() : null, effectiveTo: draft.effectiveTo ? new Date(draft.effectiveTo).toISOString() : null, isOnline: draft.isOnline, config: {} }; }
function toDateInput(value: string | null) { if (!value) return ""; const date = new Date(value); const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000); return local.toISOString().slice(0, 16); }
function currentlyActive(config: AdminHomepageConfig) { const now = Date.now(); return config.isOnline && (!config.effectiveFrom || new Date(config.effectiveFrom).getTime() <= now) && (!config.effectiveTo || new Date(config.effectiveTo).getTime() >= now); }
function formatWindow(config: AdminHomepageConfig) { const from = config.effectiveFrom ? new Date(config.effectiveFrom).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : "立即"; const to = config.effectiveTo ? new Date(config.effectiveTo).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : "长期"; return <>{from}<small>至 {to}</small></>; }
