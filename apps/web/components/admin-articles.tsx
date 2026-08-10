"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Account, refreshSession } from "../lib/auth";
import { ArticleList, ArticleStatus, ArticleType, Category, getAdminArticles, getCategories } from "../lib/content";
import { AdminVideoPage, getAdminVideos, toggleVideoPublish } from "../lib/operations";
import { OperationsAdminNav } from "./operations-admin-nav";

const statusText: Record<ArticleStatus, string> = { draft: "草稿", review: "待审核", published: "已发布", offline: "已下线" };
const typeText: Record<ArticleType, string> = { news: "资讯", policy: "政策", insight: "深度" };

const platformLabels: Record<string, string> = { bilibili: "B站", tencent: "腾讯", douyin: "抖音", youtube: "YouTube" };

export function AdminArticles() {
  const router = useRouter();
  const [user, setUser] = useState<Account | null>(null);
  const [tab, setTab] = useState<"articles" | "videos">("articles");
  // Article state
  const [data, setData] = useState<ArticleList | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [source, setSource] = useState("");
  const [sourceQuery, setSourceQuery] = useState("");
  // Video state
  const [videoData, setVideoData] = useState<AdminVideoPage | null>(null);
  const [videoPlatform, setVideoPlatform] = useState("");
  const [videoPage, setVideoPage] = useState(1);
  const [error, setError] = useState("");

  useEffect(() => {
    refreshSession().then((account) => {
      if (!account.roles.some((role) => ["editor", "operator", "admin"].includes(role))) {
        setError("当前账号没有内容管理权限"); return;
      }
      setUser(account);
    }).catch(() => router.replace("/auth"));
    getCategories().then((items) => setCategories(items.flatMap((item) => [item, ...(item.children ?? [])]))).catch(() => {});
  }, [router]);

  // Load articles
  useEffect(() => {
    if (!user || tab !== "articles") return;
    setData(null);
    getAdminArticles({ status, type, categoryId, source: sourceQuery, limit: 30 })
      .then(setData)
      .catch((reason) => setError(reason instanceof Error ? reason.message : "文章加载失败"));
  }, [status, type, categoryId, sourceQuery, user, tab]);

  // Load videos
  useEffect(() => {
    if (!user || tab !== "videos") return;
    setVideoData(null);
    const query: Record<string, string | number | undefined> = { page: videoPage, limit: 20 };
    if (videoPlatform) query.platform = videoPlatform;
    getAdminVideos(query)
      .then(setVideoData)
      .catch((reason) => setError(reason instanceof Error ? reason.message : "视频加载失败"));
  }, [videoPlatform, videoPage, user, tab]);

  async function toggleVideo(id: string, publish: boolean) {
    try {
      await toggleVideoPublish(id, publish);
      if (videoData) setVideoData({ ...videoData, items: videoData.items.map((v) => v.id === id ? { ...v, isPublished: publish } : v) });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "操作失败");
    }
  }

  function proxyCover(url: string | null): string | null {
    if (!url) return null;
    return url.replace(/https?:\/\/i\d+\.hdslb\.com\/bfs\//, "/bcovers/");
  }

  return <main className="ops-admin-page">
    <OperationsAdminNav active="articles" userName={user?.displayName} />
    <div className="ops-admin-shell">
      <div className="admin-title">
        <div>
          <p className="eyebrow">CONTENT OPERATIONS</p>
          <h1>内容工作台</h1>
          <p>管理文章与视频，控制发布状态与内容质量。</p>
        </div>
        <div className="admin-title-actions">
          {tab === "articles" && <Link className="admin-primary" href="/admin/articles/new">新建文章 <span>→</span></Link>}
        </div>
      </div>

      {/* Tab bar */}
      <div className="content-tabs">
        <button className={tab === "articles" ? "active" : ""} onClick={() => { setTab("articles"); setError(""); }}>文章</button>
        <button className={tab === "videos" ? "active" : ""} onClick={() => { setTab("videos"); setVideoPage(1); setError(""); }}>视频</button>
      </div>

      {tab === "articles" && <>
        <div className="admin-filters">
          <label>状态<select value={status} onChange={(e) => setStatus(e.target.value)}><option value="">全部状态</option>{Object.entries(statusText).map(([v, l]) => <option value={v} key={v}>{l}</option>)}</select></label>
          <label>类型<select value={type} onChange={(e) => setType(e.target.value)}><option value="">全部类型</option>{Object.entries(typeText).map(([v, l]) => <option value={v} key={v}>{l}</option>)}</select></label>
          <label>分类<select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}><option value="">全部分类</option>{categories.map((c) => <option value={c.id} key={c.id}>{c.name}</option>)}</select></label>
          <form onSubmit={(e) => { e.preventDefault(); setSourceQuery(source.trim()); }}>
            <label>来源<input value={source} onChange={(e) => setSource(e.target.value)} placeholder="输入来源名称" /></label>
            <button type="submit">筛选</button>
          </form>
        </div>
        {error && <p className="ops-error" role="alert">{error}</p>}
        {!data ? <p className="ops-state">正在读取内容…</p> : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>文章</th><th>类型</th><th>状态</th><th>分类</th><th>发布时间</th><th /></tr></thead>
              <tbody>{data.items.map((article) => (
                <tr key={article.id}>
                  <td><strong>{article.title}</strong><small>/{article.slug}</small></td>
                  <td>{typeText[article.type]}</td>
                  <td><span className={`status-pill ${article.status}`}>{statusText[article.status]}</span></td>
                  <td>{article.category?.name ?? "—"}</td>
                  <td>{article.publishedAt ? new Date(article.publishedAt).toLocaleDateString("zh-CN") : "—"}</td>
                  <td><Link href={`/admin/articles/${article.id}`}>编辑</Link></td>
                </tr>
              ))}</tbody>
            </table>
            {data.items.length === 0 && <p className="ops-state">没有匹配的文章。</p>}
          </div>
        )}
      </>}

      {tab === "videos" && <>
        <div className="admin-filters">
          <label>平台<select value={videoPlatform} onChange={(e) => { setVideoPlatform(e.target.value); setVideoPage(1); }}>
            <option value="">全部平台</option>
            {Object.entries(platformLabels).map(([v, l]) => <option value={v} key={v}>{l}</option>)}
          </select></label>
        </div>
        {error && <p className="ops-error" role="alert">{error}</p>}
        {!videoData ? <p className="ops-state">正在读取视频…</p> : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>视频</th><th>平台</th><th>时长</th><th>状态</th><th>发布时间</th><th /></tr></thead>
              <tbody>{videoData.items.map((v) => (
                <tr key={v.id}>
                  <td>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      {v.coverUrl ? <img src={proxyCover(v.coverUrl) ?? v.coverUrl} alt="" style={{width:80,height:45,objectFit:"cover",borderRadius:4,flexShrink:0}} /> : <span style={{width:80,height:45,background:"#e8e3d9",borderRadius:4,flexShrink:0,display:"grid",placeItems:"center",fontSize:10,color:"var(--ink-soft)"}}>16:9</span>}
                      <div><strong style={{fontSize:13}}>{v.title.length > 40 ? v.title.slice(0, 40) + "…" : v.title}</strong><small style={{display:"block",color:"var(--ink-soft)",fontSize:11}}>{v.creatorAccount?.creator?.name ?? "—"}</small></div>
                    </div>
                  </td>
                  <td>{platformLabels[v.platform] ?? v.platform}</td>
                  <td>{Math.floor(v.durationSeconds / 60)}:{String(v.durationSeconds % 60).padStart(2, "0")}</td>
                  <td><span className={`status-pill ${v.isPublished ? "published" : "offline"}`}>{v.isPublished ? "已发布" : "已隐藏"}</span></td>
                  <td>{v.publishedAt ? new Date(v.publishedAt).toLocaleDateString("zh-CN") : "—"}</td>
                  <td>
                    <button className="ops-btn-sm" onClick={() => toggleVideo(v.id, !v.isPublished)}>
                      {v.isPublished ? "隐藏" : "发布"}
                    </button>
                  </td>
                </tr>
              ))}</tbody>
            </table>
            {videoData.items.length === 0 && <p className="ops-state">没有匹配的视频。</p>}
          </div>
        )}
        {videoData && videoData.pagination.totalPages > 1 && (
          <div className="ops-pagination">
            <button disabled={videoPage <= 1} onClick={() => setVideoPage((p) => p - 1)}>上一页</button>
            <span>{videoPage} / {videoData.pagination.totalPages}</span>
            <button disabled={videoPage >= videoData.pagination.totalPages} onClick={() => setVideoPage((p) => p + 1)}>下一页</button>
            <small>共 {videoData.pagination.total} 个视频</small>
          </div>
        )}
      </>}
    </div>
  </main>;
}
