import Link from "next/link";
import { Article } from "../lib/content";
import { ArticleCard } from "./article-card";

export function ArticleDetailContent({ article, preview = false }: { article: Article; preview?: boolean }) {
  const source = article.sources.find((item) => item.isPrimary) ?? article.sources[0];
<<<<<<< HEAD
  return <main className="article-detail">{preview && <div className="preview-banner"><span>预览模式 · {article.status}</span><Link href={`/admin/articles/${article.id}`}>返回编辑</Link></div>}<Link className="back-link" href={preview ? "/admin/articles" : article.type === "policy" ? "/policies" : "/news"}>← {preview ? "返回内容工作台" : "返回频道"}</Link><header><p className="eyebrow">{article.type === "policy" ? "POLICY BRIEF" : "OPC CONTENT BRIEF"}</p><h1>{article.title}</h1><div className="detail-meta"><span>{source?.name ?? "OPC 编辑部"}</span><span>{article.publishedAt ? new Date(article.publishedAt).toLocaleDateString("zh-CN") : "未设置发布时间"}</span><span>{article.category?.name}</span></div></header>{article.coverImageUrl && <img className="detail-cover" src={article.coverImageUrl} alt="" />}<div className="detail-layout"><article className="article-summary"><p>{article.summary}</p>{article.tags.length > 0 && <div className="tag-list">{article.tags.map((tag) => <span key={tag.id}>#{tag.name}</span>)}</div>}</article>{article.type === "policy" && <aside className="policy-facts"><h2>政策要览</h2><dl><div><dt>发文机关</dt><dd>{article.policyIssuer || "—"}</dd></div><div><dt>文号</dt><dd>{article.policyNumber || "—"}</dd></div><div><dt>生效日期</dt><dd>{article.effectiveDate || "—"}</dd></div><div><dt>适用地域</dt><dd>{article.applicableRegion || "—"}</dd></div><div><dt>状态</dt><dd>{article.policyStatus || "—"}</dd></div></dl>{article.policyHighlights && <><h3>政策要点</h3><p>{article.policyHighlights}</p></>}{article.impactIndustries && <><h3>影响行业</h3><p>{article.impactIndustries}</p></>}</aside>}</div><section className="source-panel"><p>本文为信息摘要，仅供信息交流，不构成投资建议。来源与原文版权归原权利人所有。</p><a href={article.originalUrl} target="_blank" rel="noopener noreferrer">阅读原文 <span>↗</span></a></section>{!preview && article.related && article.related.length > 0 && <section className="related-section"><p className="eyebrow">RELATED SIGNALS</p><h2>继续阅读</h2><div className="article-grid">{article.related.map((item) => <ArticleCard article={item} key={item.id} />)}</div></section>}</main>;
=======
  const analysis = article.agentAnalysis;

  return <main className="article-detail">
    {preview && <div className="preview-banner"><span>预览模式 · {article.status}</span><Link href={`/admin/articles/${article.id}`}>返回编辑</Link></div>}
    <Link className="back-link" href={preview ? "/admin/articles" : article.type === "policy" ? "/policies" : "/news"}>← {preview ? "返回内容工作台" : "返回频道"}</Link>
    <header>
      <p className="eyebrow">{article.type === "policy" ? "POLICY BRIEF" : "OPC CONTENT BRIEF"}</p>
      <h1>{article.title}</h1>
      <div className="detail-meta"><span>{source?.name ?? "OPC 编辑部"}</span><span>{article.publishedAt ? new Date(article.publishedAt).toLocaleDateString("zh-CN") : "未设置发布时间"}</span><span>{article.category?.name}</span></div>
    </header>
    {preview && analysis && Object.keys(analysis).length > 0 && <section className="agent-review-panel">
      <header><div><p className="eyebrow">ZNT INTELLIGENCE</p><h2>智能体判断</h2></div><strong>{analysis.relevance_score ?? 0}</strong></header>
      <dl>
        <div><dt>结论</dt><dd>{analysis.decision === "relevant" ? "明确相关" : analysis.decision === "review" ? "需要复核" : "无关"}</dd></div>
        <div><dt>置信度</dt><dd>{analysis.confidence ?? "—"}</dd></div>
        <div><dt>分析方式</dt><dd>{analysis.analysis_mode ?? "rules"} · v{analysis.agent_version ?? "—"}</dd></div>
        <div><dt>判断依据</dt><dd>{analysis.reason ?? "—"}</dd></div>
      </dl>
      {analysis.matched_terms && analysis.matched_terms.length > 0 && <div className="agent-review-tags">{analysis.matched_terms.slice(0, 12).map((term) => <span key={term}>{term}</span>)}</div>}
    </section>}
    {article.coverImageUrl && <img className="detail-cover" src={article.coverImageUrl} alt="" />}
    <div className="detail-layout">
      <article className="article-summary"><p>{article.summary}</p>{article.tags.length > 0 && <div className="tag-list">{article.tags.map((tag) => <span key={tag.id}>#{tag.name}</span>)}</div>}</article>
      {article.type === "policy" && <aside className="policy-facts"><h2>政策要览</h2><dl><div><dt>发文机关</dt><dd>{article.policyIssuer || "—"}</dd></div><div><dt>文号</dt><dd>{article.policyNumber || "—"}</dd></div><div><dt>生效日期</dt><dd>{article.effectiveDate || "—"}</dd></div><div><dt>适用地域</dt><dd>{article.applicableRegion || "—"}</dd></div><div><dt>状态</dt><dd>{article.policyStatus || "—"}</dd></div></dl>{article.policyHighlights && <><h3>政策要点</h3><p>{article.policyHighlights}</p></>}{article.impactIndustries && <><h3>影响行业</h3><p>{article.impactIndustries}</p></>}</aside>}
    </div>
    <section className="source-panel"><p>本文为信息摘要，仅供信息交流，不构成投资建议。来源与原文版权归原权利人所有。</p><a href={article.originalUrl} target="_blank" rel="noreferrer">阅读原文 <span>↗</span></a></section>
    {!preview && article.related && article.related.length > 0 && <section className="related-section"><p className="eyebrow">RELATED SIGNALS</p><h2>继续阅读</h2><div className="article-grid">{article.related.map((item) => <ArticleCard article={item} key={item.id} />)}</div></section>}
  </main>;
>>>>>>> 3d0134c839e19d4666f30bffabc3529ddc66c8bd
}
