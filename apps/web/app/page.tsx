"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BrandLogo } from "../components/brand-logo";

type ServiceState = "checking" | "available" | "unavailable";
const navigation = [{ label: "首页", href: "/" }, { label: "资讯", href: "/news" }, { label: "政策", href: "/policies" }, { label: "洞察", href: "/insights" }, { label: "社区", href: "/community" }, { label: "搜索", href: "/search" }];

export default function Home() {
  const [serviceState, setServiceState] = useState<ServiceState>("checking");
  useEffect(() => {
    const controller = new AbortController();
    const endpoint = `${process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000"}/health`;
    fetch(endpoint, { signal: controller.signal })
      .then((response) => { if (!response.ok) throw new Error("API health check failed"); return response.json(); })
      .then(() => setServiceState("available"))
      .catch(() => setServiceState("unavailable"));
    return () => controller.abort();
  }, []);
  const serviceLabel = { checking: "正在连接服务", available: "核心服务正常", unavailable: "服务暂未连接" }[serviceState];

  return <main>
    <header className="topbar">
      <BrandLogo href="#top" />
      <nav aria-label="主导航">{navigation.map((item) => <Link href={item.href} key={item.href}>{item.label}</Link>)}</nav>
        <a className="login-button" href="/auth">登录 / 注册</a>
    </header>
    <section className="hero" id="top">
      <div className="hero-copy">
        <p className="eyebrow">OPC FINANCIAL COMMUNITY · 01</p>
        <h1>让行业信息<br />变成<span>下一步判断</span></h1>
        <p className="intro">面向财经、产业、投资与企业经营者的内容与交流平台。以高质量信息，连接有价值的行业对话。</p>
        <div className="hero-actions"><Link className="primary-action" href="/insights">浏览今日洞察 <span>→</span></Link><p className="motto">洞察 <i /> 链接 <i /> 增长</p></div>
      </div>
      <aside className="observation-grid" aria-label="今日观察">
        <div className="grid-heading"><span>今日观察</span><span>07 · 15</span></div>
        <div className="signal signal-major"><strong>08</strong><span>精选信号</span></div>
        <div className="signal"><strong>24h</strong><span>热点更新</span></div>
        <div className="signal"><strong>06</strong><span>行业议题</span></div>
        <div className="signal quote"><span>“观点值得被看见，也值得被验证。”</span></div>
      </aside>
    </section>
    <section className="status-strip" aria-live="polite"><span className={`status-dot ${serviceState}`} /><span>{serviceLabel}</span><span className="status-detail">API health endpoint · /health</span></section>
    <section className="foundation" aria-label="平台能力">
      <p className="eyebrow">平台正在搭建</p>
      <div className="foundation-grid">
        <article><span>01</span><h2>内容洞察</h2><p>聚合财经资讯、政策与深度研究，保留来源并提供结构化摘要。</p></article>
        <article><span>02</span><h2>专业链接</h2><p>连接创作者、机构与行业参与者，让交流建立在可信信息之上。</p></article>
        <article><span>03</span><h2>持续增长</h2><p>以讨论、活动与推荐机制，帮助用户获得认知和业务增长。</p></article>
      </div>
    </section>
  </main>;
}
