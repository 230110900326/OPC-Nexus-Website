"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArticleDetailContent } from "../../../../../components/article-detail-content";
import { SiteChrome } from "../../../../../components/site-chrome";
import { refreshSession } from "../../../../../lib/auth";
import { Article, getAdminArticlePreview } from "../../../../../lib/content";
export default function ArticlePreviewPage() { const params = useParams<{ id: string }>(); const router = useRouter(); const [article, setArticle] = useState<Article | null>(null); const [error, setError] = useState(""); useEffect(() => { refreshSession().then(() => getAdminArticlePreview(params.id)).then(setArticle).catch((reason) => { if (reason instanceof Error) setError(reason.message); else router.replace("/auth"); }); }, [params.id, router]); if (!article) return <SiteChrome><main className="article-detail"><p className="content-state">{error || "正在生成预览…"}</p></main></SiteChrome>; return <SiteChrome><ArticleDetailContent article={article} preview /></SiteChrome>; }
