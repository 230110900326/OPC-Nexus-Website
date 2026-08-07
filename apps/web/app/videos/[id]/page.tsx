"use client";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { apiBaseUrl } from "../../../lib/api-base";
import { SiteChrome } from "../../../components/site-chrome";

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
function extractBvid(url: string): string | null {
  const m = url.match(/\/video\/(BV[A-Za-z0-9]+)/);
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
  const { tag, title } = splitTitle(video.title);

  return (
    <SiteChrome>
      <main className="video-detail-page">
        <a className="back-link" href="/videos">← 返回视频频道</a>
        <header>
          <p className="eyebrow">{video.platform.toUpperCase()} · {video.creatorAccount.creator.name}{tag ? ` · ${tag}` : ""}</p>
          <h1>{title}</h1>
          <div className="detail-meta">
            <span>{Math.floor(video.durationSeconds / 60)}:{String(video.durationSeconds % 60).padStart(2, "0")}</span>
            <span>{video.platformMetrics.views ?? 0} 浏览</span>
          </div>
        </header>

        {bvid ? (
          <div className="video-player-wrapper">
            <iframe
              src={`/player/player.html?bvid=${bvid}&high_quality=1&autoplay=0`}
              allowFullScreen
              className="video-player-iframe"
              title={title}
            />
            <div className="video-player-fallback-overlay" id="player-fallback">
              <p>如果播放器未加载，请点击下方按钮在 Bilibili 观看</p>
              <a href={video.originalUrl} target="_blank" rel="noopener noreferrer" className="btn-primary">
                在 Bilibili 观看完整视频 →
              </a>
            </div>
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
      </main>
    </SiteChrome>
  );
}
