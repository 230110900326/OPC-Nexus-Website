"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Account, getAccessToken, getMyProfile, refreshSession } from "../lib/auth";
import { MyCommentItem, MyInteractionItem, getMyComments, getMyFavorites, getMyLikes } from "../lib/forum";

const TYPE_LABEL: Record<string, string> = { article: "文章", video: "视频", post: "讨论", demand: "需求" };

type Item = MyInteractionItem | MyCommentItem;
type Kind = "favorites" | "likes" | "comments";

const CONFIG: Record<Kind, { eyebrow: string; title: string; intro: string; emptyTitle: string; emptyHint: string; emptyLink: string; emptyLinkText: string; action: string; load: () => Promise<Item[]> }> = {
  favorites: { eyebrow: "MY FAVORITES", title: "我的收藏", intro: "你收藏的文章、视频、讨论与需求都会汇总在这里。", emptyTitle: "还没有收藏内容", emptyHint: "在文章、视频或讨论中点“收藏”，内容会出现在这里。", emptyLink: "/", emptyLinkText: "去发现内容 →", action: "收藏于", load: getMyFavorites },
  likes: { eyebrow: "MY LIKES", title: "我的点赞", intro: "你赞同过的内容都会汇总在这里。", emptyTitle: "还没有点赞内容", emptyHint: "在文章、视频或讨论中点“赞同”，内容会出现在这里。", emptyLink: "/", emptyLinkText: "去发现内容 →", action: "赞于", load: getMyLikes },
  comments: { eyebrow: "MY COMMENTS", title: "我的评论", intro: "你在文章、视频与讨论中发表的评论都会汇总在这里。", emptyTitle: "还没有发表评论", emptyHint: "在文章、视频或讨论下方留下你的观点吧。", emptyLink: "/", emptyLinkText: "去发现内容 →", action: "评论于", load: getMyComments },
};

export function AccountInteractionPage({ kind }: { kind: Kind }) {
  const config = CONFIG[kind];
  const [user, setUser] = useState<Account | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = getAccessToken();
    const loadUser = token ? getMyProfile().catch(() => refreshSession()) : refreshSession();
    loadUser.then(setUser).catch(() => setError("请先登录后再查看"));
  }, []);

  useEffect(() => {
    if (!user) return;
    config.load().then(setItems).catch(() => setError("数据加载失败")).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (loading) return <main className="account-sub-page"><div className="account-sub-loading"><span className="account-sub-spinner" /><p>正在同步…</p></div></main>;
  if (error) return (
    <main className="account-sub-page">
      <header className="account-sub-header"><Link className="auth-brand" href="/"><span>OPC</span> NEXUS</Link><div className="account-header-actions"><Link href="/">← 返回首页</Link><Link href="/">← 返回首页</Link><Link href="/account">个人资料</Link><Link href="/community">社区广场</Link></div></header>
      <section className="account-sub-shell"><p className="content-state" role="alert">{error}</p><Link href="/auth" className="back-link">← 前往登录</Link></section>
    </main>
  );

  return (
    <main className="account-sub-page">
      <header className="account-sub-header">
        <Link className="auth-brand" href="/"><span>OPC</span> NEXUS</Link>
        <div className="account-header-actions">
          <Link href="/account">个人资料</Link>
          <Link href="/community">社区广场</Link>
          <Link className="demand-primary" href="/community/new">发起讨论 →</Link>
        </div>
      </header>
      <section className="account-sub-shell">
        <div className="account-sub-heading">
          <div>
            <p className="eyebrow">{config.eyebrow}</p>
            <h1>{config.title}</h1>
            <p>{user?.displayName ?? ""}，{config.intro}</p>
          </div>
          <div className="account-sub-tally"><b>{items.length}</b><span>{kind === "comments" ? "条评论" : "条内容"}</span></div>
        </div>
        {items.length === 0 ? (
          <div className="home-empty"><strong>{config.emptyTitle}</strong><span>{config.emptyHint}</span><Link href={config.emptyLink}>{config.emptyLinkText}</Link></div>
        ) : (
          <>
            <div className="account-sub-stats"><div className="account-stat-item"><b>{items.length}</b><span>总数</span></div></div>
            <div className="account-post-list">
              {items.map((item, index) => {
                const target = "target" in item ? item.target : null;
                if (!target) return null;
                const commentBody = "body" in item ? item.body : null;
                const createdAt = "createdAt" in item ? item.createdAt : "";
                return (
                  <article key={target.targetType + target.targetId + index} className="account-post-card">
                    <div className="account-post-left"><span className="post-status-badge status-published">{TYPE_LABEL[target.targetType] ?? target.targetType}</span></div>
                    <div className="account-post-body">
                      <h2><Link href={target.url}>{target.title}</Link></h2>
                      {commentBody ? <p className="account-post-excerpt">{commentBody.slice(0, 180)}{commentBody.length > 180 ? "…" : ""}</p> : target.excerpt ? <p className="account-post-excerpt">{target.excerpt}{target.excerpt.length >= 100 ? "…" : ""}</p> : null}
                      <footer>
                        {commentBody && <><span>{commentBody === "该评论已由作者删除" ? "已删除" : "评论内容"}</span><span className="account-post-sep">·</span></>}
                        <span>{config.action} {new Date(createdAt).toLocaleString("zh-CN")}</span>
                        <Link href={target.url} className="account-post-link">查看详情 →</Link>
                      </footer>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
