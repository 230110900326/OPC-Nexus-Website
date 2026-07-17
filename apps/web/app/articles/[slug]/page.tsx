"use client";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArticleDetailContent } from "../../../components/article-detail-content";
import { SiteChrome } from "../../../components/site-chrome";
import { Article, getArticle } from "../../../lib/content";
export default function ArticleDetailPage() { const params = useParams<{ slug: string }>(); const [article, setArticle] = useState<Article | null>(null); const [error, setError] = useState(""); useEffect(() => { getArticle(params.slug).then(setArticle).catch((reason) => setError(reason instanceof Error ? reason.message : "文章加载失败")); }, [params.slug]); if (error) return <SiteChrome><main className="article-detail"><p className="content-state">{error}</p></main></SiteChrome>; if (!article) return <SiteChrome><main className="article-detail"><p className="content-state">正在加载文章…</p></main></SiteChrome>; return <SiteChrome><ArticleDetailContent article={article} /></SiteChrome>; }
