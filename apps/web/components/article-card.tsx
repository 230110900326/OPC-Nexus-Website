"use client";
import { useState } from "react";
import Link from "next/link";
import { Article } from "../lib/content";
const typeLabel = { news: "资讯", policy: "政策", insight: "深度" };
export function ArticleCard({ article }: { article: Article }) {
  const [coverFailed, setCoverFailed] = useState(false);
  const source = article.sources.find((item) => item.isPrimary) ?? article.sources[0];
  return <article className="article-card"><Link className="article-card-image" href={`/articles/${article.slug}`} aria-label={article.title}>{article.coverImageUrl && !coverFailed ? <img src={article.coverImageUrl} alt="" onError={() => setCoverFailed(true)} /> : <span>{typeLabel[article.type]}</span>}</Link><div className="article-card-body"><div className="article-meta"><span>{typeLabel[article.type]}</span><span>{article.category?.name ?? "未分类"}</span></div><h2><Link href={`/articles/${article.slug}`}>{article.title}</Link></h2><p>{article.summary.length > 30 ? article.summary.slice(0, 30) + "…" : article.summary}</p>{article.tags.length > 0 && <div className="card-tags">{article.tags.slice(0, 3).map((tag) => <span key={tag.id}>#{tag.name}</span>)}</div>}<footer><span>{source?.name ?? "OPC 编辑部"}</span><span>{article.publishedAt ? new Intl.DateTimeFormat("zh-CN", { month: "short", day: "numeric" }).format(new Date(article.publishedAt)) : "待发布"}</span><span>热度 {Number(article.heatScore).toFixed(0)}</span></footer></div></article>;
}
