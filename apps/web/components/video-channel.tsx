"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiBaseUrl } from "../lib/api-base";
type Video = { id: string; platform: string; title: string; coverUrl: string | null; originalUrl: string; durationSeconds: number; keyPoints: string[]; industryTags: string[]; platformMetrics: Record<string, number>; creatorAccount: { displayName: string; creator: { name: string } } };

function proxyCover(url: string | null): string | null {
  if (!url) return null;
  return url.replace(/https?:\/\/i\d+\.hdslb\.com\/bfs\//, "/bcovers/");
}
function durationLabel(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "时长待补全";
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
function viewsLabel(views: number | undefined): string {
  return typeof views === "number" && views > 0 ? `${views} 浏览` : "数据待补全";
}
function splitTitle(raw: string): { tag: string; title: string } {
  const m = raw.match(/^(.+?)[_—\-–]\s*([^_—\-–]+)_bilibili$/i);
  if (m) return { tag: m[2].trim(), title: m[1].trim() };
  const fallback = raw.replace(/[_—\-–]\s*bilibili\s*$/i, "").replace(/[_—\-–]\s*哔哩哔哩.*$/i, "");
  return { tag: "", title: fallback || raw };
}

const PAGE_SIZE = 12;

export function VideoChannel() {
  const [items, setItems] = useState<Video[]>([]);
  const [platform, setPlatform] = useState("");
  const [sort, setSort] = useState<"latest" | "hot" | "relevant">("latest");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (p: number, pf: string, s: "latest" | "hot" | "relevant") => {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams();
      if (pf) params.set("platform", pf);
      params.set("sort", s);
      params.set("page", String(p));
      params.set("limit", String(PAGE_SIZE));
      const r = await fetch(`${apiBaseUrl}/videos?${params}`, { cache: "no-store" });
      const body = await r.json();
      if (!r.ok || !body.success) throw new Error(body.error?.message ?? "视频加载失败");
      setItems(body.data.items ?? body.data);
      setTotal(body.data.pagination?.total ?? body.data.length);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "视频加载失败");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { setPage(1); load(1, platform, sort); }, [platform, sort, load]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const goPage = (p: number) => { if (p >= 1 && p <= totalPages) { setPage(p); load(p, platform, sort); window.scrollTo({ top: 0, behavior: "smooth" }); } };

  return <main className="video-channel">
    <header>
      <p className="eyebrow">OPC VIDEO DESK</p>
      <h1>视频洞察</h1>
      <p>AI 与科技领域精选视频，站内直接观看。</p>
      <div className="channel-controls">
        <div className="channel-tabs">
          {["", "bilibili", "tencent", "douyin"].map((v) => (
            <button className={platform === v ? "selected" : ""} onClick={() => setPlatform(v)} key={v}>{v === "tencent" ? "腾讯视频" : v === "douyin" ? "抖音" : v || "全部"}</button>
          ))}
        </div>
        <div className="channel-sort">
          <button className={sort === "latest" ? "selected" : ""} onClick={() => setSort("latest")}>最新</button>
          <button className={sort === "hot" ? "selected" : ""} onClick={() => setSort("hot")}>最热</button>
          <button className={sort === "relevant" ? "selected" : ""} onClick={() => setSort("relevant")}>相关度</button>
        </div>
      </div>
    </header>

    {error && <p className="form-error">{error}</p>}
    {loading && <p className="content-state">加载中…</p>}

    <section>
      {items.map((video) => {
        const { tag, title } = splitTitle(video.title);
        return <Link key={video.id} href={`/videos/${video.id}`} className="video-card">
          <div className="video-cover">
            {video.coverUrl ? <img src={proxyCover(video.coverUrl) ?? video.coverUrl} alt="" /> : <span>16:9</span>}
            <small>{durationLabel(video.durationSeconds)}</small>
          </div>
          <p className="eyebrow">{video.platform} · {video.creatorAccount.creator.name}{tag ? ` · ${tag}` : ""}</p>
          <h2>{title}</h2>
          <p>{video.keyPoints[0] || "暂无概要"}</p>
          <footer>{video.industryTags.join(" · ")} <span>{viewsLabel(video.platformMetrics.views)}</span></footer>
        </Link>;
      })}
      {!loading && items.length === 0 && <p className="content-state">暂无已发布视频。</p>}
    </section>

    {totalPages > 1 && (
      <div className="pagination">
        <button onClick={() => goPage(page - 1)} disabled={page <= 1}>← 上一页</button>
        <span>第 {page} / {totalPages} 页（共 {total} 个视频）</span>
        <button onClick={() => goPage(page + 1)} disabled={page >= totalPages}>下一页 →</button>
      </div>
    )}
  </main>;
}
