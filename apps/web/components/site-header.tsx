"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BrandLogo } from "./brand-logo";

const navigation = [
  { href: "/", label: "首页" },
  { href: "/discover", label: "推荐", compact: true },
  { href: "/rankings", label: "热榜", compact: true },
  { href: "/news", label: "资讯" },
  { href: "/policies", label: "政策" },
  { href: "/videos", label: "视频", compact: true },
  { href: "/community", label: "社区" },
  { href: "/demands", label: "需求广场" },
  { href: "/events", label: "活动" },
];

const riskNotice = "OPC Nexus 仅提供信息聚合与供需对接平台，不参与交易、不提供担保，也不构成任何投资建议；所有线上与线下合作请独立核验并自行承担风险。";

function isCurrent(pathname: string, href: string) {
  return href === "/" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return <>
    <header className="site-header">
        <BrandLogo />
        <nav className="primary-navigation" aria-label="主导航">
          {navigation.map((item) => {
            const current = isCurrent(pathname, item.href);
            return <Link className={current ? "active" : undefined} data-compact={item.compact ? "hide" : undefined} href={item.href} aria-current={current ? "page" : undefined} key={item.href}>{item.label}</Link>;
          })}
        </nav>
        <div className="header-actions">
          <Link href="/admin/dashboard">运营台</Link>
          <Link className="notification-bell" href="/notifications" aria-label="通知">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </Link>
          <Link className="login-button" href="/auth">登录 / 注册</Link>
        </div>
        <button className="mobile-navigation-toggle" type="button" aria-expanded={menuOpen} aria-controls="mobile-navigation" onClick={() => setMenuOpen((open) => !open)}>
          <span>{menuOpen ? "关闭" : "菜单"}</span>
          <i aria-hidden="true" />
        </button>
        <div className="mobile-navigation-panel" id="mobile-navigation" hidden={!menuOpen}>
          <nav aria-label="移动端主导航">
            {navigation.map((item) => {
              const current = isCurrent(pathname, item.href);
              return <Link className={current ? "active" : undefined} href={item.href} aria-current={current ? "page" : undefined} onClick={() => setMenuOpen(false)} key={item.href}>{item.label}</Link>;
            })}
          </nav>
          <div className="mobile-navigation-actions">
            <Link href="/notifications" onClick={() => setMenuOpen(false)}>🔔 通知</Link>
            <Link href="/admin/dashboard" onClick={() => setMenuOpen(false)}>运营台</Link>
            <Link href="/auth" onClick={() => setMenuOpen(false)}>登录 / 注册 <span>→</span></Link>
          </div>
        </div>
      </header>
      <div className="site-risk-ticker" role="note" tabIndex={0} aria-label="风险提示；鼠标悬停或键盘聚焦可暂停滚动">
        <span className="site-risk-ticker-label">风险提示</span>
        <div className="site-risk-ticker-viewport">
          <div className="site-risk-ticker-track">
            <span className="site-risk-ticker-item">{riskNotice}</span>
            <span className="site-risk-ticker-item" aria-hidden="true">{riskNotice}</span>
          </div>
        </div>
      </div>
  </>;
}
