"use client";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArticleDetailContent } from "../../../components/article-detail-content";
import { SiteHeader } from "../../../components/site-header";
import { Article, getArticle } from "../../../lib/content";
export default function ArticleDetailPage() { const params = useParams<{ slug: string }>(); const [article, setArticle] = useState<Article | null>(null); const [error, setError] = useState(""); useEffect(() => { getArticle(params.slug).then(setArticle).catch((reason) => setError(reason instanceof Error ? reason.message : "文章加载失败")); }, [params.slug]); if (error) return <><SiteHeader /><main className="article-detail"><p className="content-state">{error}</p></main></>; if (!article) return <><SiteHeader /><main className="article-detail"><p className="content-state">正在加载文章…</p></main></>; return <><SiteHeader /><ArticleDetailContent article={article} /></>; }
