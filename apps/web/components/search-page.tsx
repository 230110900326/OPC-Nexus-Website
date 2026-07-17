"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { Category, SearchResponse, getCategories, searchContent } from "../lib/content";
import { ForumSection, getForumSections } from "../lib/forum";
import { SupportPageHeader } from "./support-page-header";

const suggestedQueries = ["人工智能", "企业出海", "数据要素", "新能源汽车"];

export function SearchPage() {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [source, setSource] = useState("");
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [sections, setSections] = useState<ForumSection[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<SearchResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getCategories()
      .then((items) => setCategories(items.flatMap((item) => [item, ...(item.children ?? [])])))
      .catch(() => undefined);
    getForumSections().then(setSections).catch(() => undefined);
  }, []);

  async function run(nextPage = 1, nextQuery = query) {
    const keyword = nextQuery.trim();
    if (!keyword) return;
    setLoading(true);
    setError("");
    try {
      setData(await searchContent({ q: keyword, type, category, source, from, to, page: nextPage }));
      setQuery(keyword);
      setPage(nextPage);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "搜索失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void run(1);
  }

  function resetFilters() {
    setType("all");
    setCategory("");
    setSource("");
    setFrom("");
    setTo("");
  }

  return <main className="support-page support-search-page">
    <div className="support-frame">
      <SupportPageHeader
        active="search"
        eyebrow="OPC KNOWLEDGE INDEX · 全站搜索"
        title="从一个关键词，回到完整上下文。"
        description="跨文章、社区帖子与视频检索 OPC Nexus 内容。先输入政策、公司、行业或议题，再用类型、分类、来源和日期收窄范围。"
        note="文章 · 社区 · 视频"
      />

      <section className="support-search-stage" aria-labelledby="search-form-title">
        <div className="support-search-heading">
          <p className="eyebrow">SEARCH THE INDEX · 开始检索</p>
          <h2 id="search-form-title">你想查什么？</h2>
        </div>
        <form className="support-search-form" onSubmit={submit} role="search">
          <label htmlFor="site-search-query">搜索关键词</label>
          <div>
            <input id="site-search-query" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="输入政策、公司、行业或议题" autoComplete="off" required />
            <button type="submit" disabled={loading}>{loading ? "检索中…" : "开始搜索"}<span aria-hidden="true">→</span></button>
          </div>
          <nav className="search-suggestions" aria-label="建议搜索词">
            <span>试试：</span>
            {suggestedQueries.map((item) => <button type="button" onClick={() => void run(1, item)} key={item}>{item}</button>)}
          </nav>
        </form>
      </section>

      <section className="support-search-body">
        <div className="search-filter-heading">
          <div>
            <p className="eyebrow">REFINE · 筛选范围</p>
            <h2>缩小检索范围</h2>
          </div>
          <button className="search-reset" type="button" onClick={resetFilters}>清除筛选</button>
        </div>
        <div className="search-filters">
          <label>内容类型
            <select value={type} onChange={(event) => setType(event.target.value)}>
              <option value="all">全部内容</option>
              <option value="article">文章</option>
              <option value="post">社区帖子</option>
              <option value="video">视频</option>
            </select>
          </label>
          <label>分类或板块
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="">全部分类</option>
              {categories.length > 0 && <optgroup label="内容分类">
                {categories.map((item) => <option value={item.slug} key={item.id}>{item.name}</option>)}
              </optgroup>}
              {sections.length > 0 && <optgroup label="社区板块">
                {sections.map((item) => <option value={item.slug} key={item.id}>{item.name}</option>)}
              </optgroup>}
            </select>
          </label>
          <label>来源 / 作者
            <input value={source} onChange={(event) => setSource(event.target.value)} placeholder="例如：国务院" />
          </label>
          <label>开始日期
            <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          </label>
          <label>结束日期
            <input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          </label>
        </div>

        <div className="search-status" aria-live="polite">
          {loading && <p>正在检索站内索引…</p>}
          {error && <p className="search-error" role="alert">{error}</p>}
        </div>

        {!data && !loading && !error && <div className="search-start-grid">
          <article>
            <small>SEARCH NOTE / 01</small>
            <h3>先用核心词，再加筛选</h3>
            <p>“新能源 补贴”通常比一整句问题更容易命中。得到结果后，再限定内容类型、来源或日期。</p>
          </article>
          <article>
            <small>SEARCH NOTE / 02</small>
            <h3>换一种行业表达</h3>
            <p>公司可尝试全称与简称；政策可尝试发布机构、文件主题或行业常用词。</p>
          </article>
          <article>
            <small>SEARCH NOTE / 03</small>
            <h3>仍然没有找到？</h3>
            <p>可能尚未收录相关内容。你可以到社区发起讨论，或把值得关注的线索发给我们。</p>
            <Link href="/contact">提交内容线索 <span aria-hidden="true">→</span></Link>
          </article>
        </div>}

        {data && <section className="search-result-section" aria-labelledby="search-results-title">
          <header className="search-summary">
            <div>
              <p className="eyebrow">RESULTS · 检索结果</p>
              <h2 id="search-results-title">“{query}”</h2>
            </div>
            <strong>{data.pagination.total}<small> 条结果</small></strong>
          </header>
          <div className="search-results">
            {data.items.map((item) => <article key={`${item.contentType}-${item.id}`}>
              <span>{item.contentType === "article" ? "文章" : item.contentType === "post" ? "社区" : "视频"} · {item.category ?? item.subtype}</span>
              <h3><Link href={item.url}>{item.title}</Link></h3>
              <p>{item.excerpt}</p>
              <footer>{item.source ?? "OPC Nexus"}{item.publishedAt ? ` · ${new Date(item.publishedAt).toLocaleDateString("zh-CN")}` : ""}</footer>
            </article>)}
          </div>
          {data.items.length === 0 && <div className="search-empty">
            <strong>没有找到匹配内容</strong>
            <p>试试更短的关键词，或清除分类、来源与日期筛选。</p>
          </div>}
          {data.pagination.totalPages > 1 && <nav className="pagination" aria-label="搜索结果分页">
            <button type="button" disabled={page <= 1 || loading} onClick={() => void run(page - 1)}>上一页</button>
            <span>第 {page} / {data.pagination.totalPages} 页</span>
            <button type="button" disabled={page >= data.pagination.totalPages || loading} onClick={() => void run(page + 1)}>下一页</button>
          </nav>}
        </section>}
      </section>
    </div>
  </main>;
}
