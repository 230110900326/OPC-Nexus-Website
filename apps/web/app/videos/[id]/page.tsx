"use client";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { apiBaseUrl } from "../../../lib/api-base";
import { BrowsingHistoryTracker } from "../../../components/browsing-history-tracker";
import { SiteChrome } from "../../../components/site-chrome";
import { InteractionBar } from "../../../components/interaction-bar";
import { CommentSection } from "../../../components/comment-section";

type Video = {
  id: string; platform: string; title: string; coverUrl: string | null;
  originalUrl: string; durationSeconds: number; keyPoints: string[];
  industryTags: string[]; platformMetrics: Record<string, number>;
  creatorAccount: { displayName: string; creator: { name: string } };
};

function proxyCover(url: string | null): string | null {
  if (!url) return null;
  return url.replace(/https?:\/\/i\d+\.hdslb\.com\/bfs\//, "/bcovers/");
}
function durationLabel(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "时长待补全";
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
function viewsLabel(views: number | undefined): string {
  return typeof views === "number" && views > 0 ? `${views} 浏览` : "浏览数据待补全";
}
function extractBvid(url: string): string | null {
  const m = url.match(/\/video\/(BV[A-Za-z0-9]+)/);
  return m ? m[1] : null;
}
function extractTencentVid(url: string): string | null {
  const m = url.match(/\/(?:page|cover)\/(?:[A-Za-z0-9]+\/)?([A-Za-z0-9]{6,15})\.html/);
  return m ? m[1] : null;
}
function extractYoutubeId(url: string): string | null {
  // youtube.com/watch?v=VIDEO_ID or youtu.be/VIDEO_ID or youtube.com/embed/VIDEO_ID
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}
function extractDouyinId(url: string): string | null {
  const m = url.match(/\/video\/(\d{19})/);
  return m ? m[1] : null;
}
function splitTitle(raw: string): { tag: string; title: string } {
  const m = raw.match(/^(.+?)[_—\-–]\s*([^_—\-–]+)_bilibili$/i);
  if (m) return { tag: m[2].trim(), title: m[1].trim() };
  const fallback = raw.replace(/[_—\-–]\s*bilibili\s*$/i, "").replace(/[_—\-–]\s*哔哩哔哩.*$/i, "");
  return { tag: "", title: fallback || raw };
}

export default function VideoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [video, setVideo] = useState<Video | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${apiBaseUrl}/videos/${id}`)
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok || !body.success) throw new Error(body.error?.message ?? "加载失败");
        setVideo(body.data);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "视频加载失败"));
  }, [id]);

  if (error) return <SiteChrome><main className="video-detail-page"><p className="content-state">{error}</p></main></SiteChrome>;
  if (!video) return <SiteChrome><main className="video-detail-page"><p className="content-state">加载中…</p></main></SiteChrome>;

  const bvid = extractBvid(video.originalUrl);
  const tencentVid = extractTencentVid(video.originalUrl);
  const youtubeId = extractYoutubeId(video.originalUrl);
  const douyinId = extractDouyinId(video.originalUrl);
  const { tag, title } = splitTitle(video.title);

  return (
    <SiteChrome>
      <main className="video-detail-page">
        <a className="back-link" href="/videos">← 返回视频频道</a>
        <header>
          <p className="eyebrow">{video.platform.toUpperCase()} · {video.creatorAccount.creator.name}{tag ? ` · ${tag}` : ""}</p>
          <h1>{title}</h1>
          <div className="detail-meta">
            <span>{durationLabel(video.durationSeconds)}</span>
            <span>{viewsLabel(video.platformMetrics.views)}</span>
          </div>
        </header>

        {bvid ? (
          <div className="video-player-wrapper">
            <iframe
              src={`https://player.bilibili.com/player.html?bvid=${bvid}&high_quality=1&autoplay=0`}
              allowFullScreen
              allow="autoplay; encrypted-media; fullscreen"
              className="video-player-iframe"
              title={title}
            />
          </div>
        ) : tencentVid ? (
          <div className="video-player-wrapper">
            <iframe
              src={`https://v.qq.com/iframe/player.html?vid=${tencentVid}&tiny=0&auto=0`}
              allowFullScreen
              allow="autoplay; encrypted-media; fullscreen"
              className="video-player-iframe"
              title={title}
            />
          </div>
        ) : youtubeId ? (
          <div className="video-player-wrapper">
            <iframe
              src={`https://www.youtube.com/embed/${youtubeId}?autoplay=0&rel=0`}
              allowFullScreen
              allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
              className="video-player-iframe"
              title={title}
            />
          </div>
        ) : douyinId ? (
          <div className="video-player-fallback">
            <div className="video-player-preview">
              {video.coverUrl ? (
                <img src={video.coverUrl} alt={title} style={{ maxWidth: "100%", borderRadius: 8 }} />
              ) : null}
            </div>
            <p>抖音视频需在抖音 App 内观看</p>
            <a href={video.originalUrl} target="_blank" rel="noopener noreferrer" className="btn-primary">
              在抖音观看 →
            </a>
          </div>
        ) : (
          <div className="video-player-fallback">
            <p>该平台暂不支持站内播放</p>
            <a href={video.originalUrl} target="_blank" rel="noopener noreferrer" className="btn-primary">
              在 {video.platform} 观看 →
            </a>
          </div>
        )}

        <section className="video-info">
          <div className="video-tags">
            {video.industryTags.map((t) => <span key={t}>{t}</span>)}
          </div>
          {video.keyPoints.length > 0 && (
            <div className="video-keypoints">
              <h2>内容概要</h2>
              <ul>{video.keyPoints.map((kp, i) => <li key={i}>{kp}</li>)}</ul>
            </div>
          )}
          <a href={video.originalUrl} target="_blank" rel="noopener noreferrer" className="btn-outline">
            在 {video.platform} 查看原视频 ↗
          </a>
        </section>
        <InteractionBar targetType="video" targetId={video.id} />
        <CommentSection targetType="video" targetId={video.id} placeholder="补充你对这条视频的观点…" />
        <BrowsingHistoryTracker title={title} />
      </main>
    </SiteChrome>
  );
}
