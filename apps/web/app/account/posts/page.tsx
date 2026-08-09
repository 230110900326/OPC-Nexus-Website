"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Account, getMyProfile, getAccessToken, refreshSession, authorizedRequest } from "../../../lib/auth";

type MyPost = {
  id: string; title: string; body: string; status: string;
  commentCount: number; viewCount: number; heatScore: number | string;
  createdAt: string; updatedAt: string;
  section: { id: string; slug: string; name: string };
  _count?: { comments: number; likes: number };
};

export default function MyPostsPage() {
  const [user, setUser] = useState<Account | null>(null);
  const [posts, setPosts] = useState<MyPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = getAccessToken();
    const loadUser = token
      ? getMyProfile().catch(() => refreshSession())
      : refreshSession();
    loadUser
      .then((u) => setUser(u))
      .catch(() => setError("请先登录后再查看讨论"));
  }, []);

  useEffect(() => {
    if (!user) return;
    authorizedRequest<{ items: MyPost[] }>("/users/me/posts")
      .then((data) => setPosts(data.items))
      .catch(() => setError("讨论数据加载失败"))
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) return (
    <main className="account-sub-page">
      <div className="account-sub-loading">
        <span className="account-sub-spinner" />
        <p>正在同步你的讨论…</p>
      </div>
    </main>
  );

  if (error) return (
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
        <p className="content-state" role="alert">{error}</p>
        <Link href="/auth" className="back-link">← 前往登录</Link>
      </section>
    </main>
  );

  const totalComments = posts.reduce((sum, p) => sum + (p._count?.comments ?? p.commentCount ?? 0), 0);
  const totalLikes = posts.reduce((sum, p) => sum + (p._count?.likes ?? 0), 0);

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
            <p className="eyebrow">MY DISCUSSIONS</p>
            <h1>我的讨论</h1>
            <p>{user?.displayName ?? ""}，这里汇总了你发起的讨论话题。</p>
          </div>
          <div className="account-sub-tally">
            <b>{posts.length}</b>
            <span>条讨论</span>
          </div>
        </div>

        {posts.length === 0 ? (
          <div className="home-empty">
            <strong>还没有发布讨论</strong>
            <span>在社区中发起话题后，你的讨论会显示在这里。</span>
            <Link href="/community">去社区看看 →</Link>
          </div>
        ) : (
          <>
            <div className="account-sub-stats">
              <div className="account-stat-item">
                <b>{posts.length}</b>
                <span>讨论总数</span>
              </div>
              <div className="account-stat-item">
                <b>{totalComments}</b>
                <span>总评论数</span>
              </div>
              <div className="account-stat-item">
                <b>{totalLikes}</b>
                <span>总点赞数</span>
              </div>
            </div>

            <div className="account-post-list">
              {posts.map((post) => (
                <article key={post.id} className="account-post-card">
                  <div className="account-post-left">
                    <span className={`post-status-badge status-${post.status}`}>
                      {post.status === "published" ? "已发布" : post.status === "draft" ? "草稿" : post.status === "hidden" ? "已隐藏" : post.status}
                    </span>
                  </div>
                  <div className="account-post-body">
                    <h2>
                      <Link href={post.status === "draft" ? `/community/posts/${post.id}/edit` : `/community/posts/${post.id}`}>{post.title}</Link>
                    </h2>
                    {post.body && (
                      <p className="account-post-excerpt">{post.body.slice(0, 180)}{post.body.length > 180 ? "…" : ""}</p>
                    )}
                    <footer>
                      <span className="account-post-section">{post.section?.name ?? "未分类"}</span>
                      <span className="account-post-sep">·</span>
                      <span>{new Date(post.createdAt).toLocaleDateString("zh-CN")}</span>
                      <span className="account-post-sep">·</span>
                      <span>{post._count?.comments ?? post.commentCount ?? 0} 评论</span>
                      <span className="account-post-sep">·</span>
                      <span>{post._count?.likes ?? 0} 点赞</span>
                      {post.status === "draft"
                        ? <Link href={`/community/posts/${post.id}/edit`} className="account-post-link">编辑草稿 →</Link>
                        : <Link href={`/community/posts/${post.id}`} className="account-post-link">查看详情 →</Link>}
                    </footer>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
