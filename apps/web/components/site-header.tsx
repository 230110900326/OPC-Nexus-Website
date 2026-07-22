"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Account, getDemoUser, isDemoSession, refreshSession, signOut } from "../lib/auth";
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
  const [user, setUser] = useState<Account | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Load user on mount and whenever the route changes (handles client-side nav)
  useEffect(() => {
    const demoUser = getDemoUser();
    if (demoUser) {
      setUser(demoUser);
      return;
    }
    refreshSession()
      .then(setUser)
      .catch(() => setUser(null));
  }, [pathname]);

  // Listen for demo profile updates from other components
  useEffect(() => {
    function handleProfileUpdate(e: Event) {
      const detail = (e as CustomEvent<Account>).detail;
      setUser(detail);
    }
    window.addEventListener("opc:demo-user-updated", handleProfileUpdate);
    return () => window.removeEventListener("opc:demo-user-updated", handleProfileUpdate);
  }, []);

  // Close user menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    if (userMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [userMenuOpen]);

  async function handleSignOut() {
    await signOut();
    setUser(null);
    setUserMenuOpen(false);
  }

  const isDemo = isDemoSession();
  const userInitial = user?.displayName?.slice(0, 1) ?? "?";

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
          {user ? (
            <>
              {user.roles.some(r => ["editor", "operator", "admin"].includes(r)) && (
                <Link href="/admin/dashboard">运营台</Link>
              )}
              <Link className="notification-bell" href="/notifications" aria-label="通知">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
              </Link>
              <div className="user-menu-container" ref={userMenuRef}>
                <button
                  className="user-menu-trigger"
                  onClick={() => setUserMenuOpen(o => !o)}
                  aria-expanded={userMenuOpen}
                  aria-haspopup="true"
                  title={user.displayName}
                >
                  <span className="user-avatar">{user.avatarUrl ? <img src={user.avatarUrl} alt="" referrerPolicy="no-referrer" /> : userInitial}</span>
                  <span className="user-name">{user.displayName}</span>
                  {isDemo && <span className="demo-badge" title="离线预览模式">DEMO</span>}
                  <svg className="user-menu-chevron" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                    <path d="M7 10l5 5 5-5" stroke="currentColor" fill="none" strokeWidth="2"/>
                  </svg>
                </button>
                {userMenuOpen && (
                  <div className="user-menu-dropdown" role="menu">
                    <div className="user-menu-header">
                      <span className="user-menu-monogram">{user.avatarUrl ? <img src={user.avatarUrl} alt="" referrerPolicy="no-referrer" /> : userInitial}</span>
                      <div>
                        <p className="user-menu-name">{user.displayName}</p>
                        <p className="user-menu-email">{user.email}</p>
                        {user.jobTitle && <p className="user-menu-title">{user.jobTitle}{user.company ? ` · ${user.company}` : ""}</p>}
                      </div>
                    </div>
                    <Link href="/account" className="user-menu-item" role="menuitem" onClick={() => setUserMenuOpen(false)}>
                      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v1.2c0 .7.5 1.2 1.2 1.2h16.8c.7 0 1.2-.5 1.2-1.2v-1.2c0-3.2-6.4-4.8-9.6-4.8z" fill="currentColor"/></svg>
                      编辑个人资料
                    </Link>
                    <Link href="/account/demands" className="user-menu-item" role="menuitem" onClick={() => setUserMenuOpen(false)}>
                      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.9 0 3.5 1.6 3.5 3.5S13.9 13 12 13s-3.5-1.6-3.5-3.5S10.1 6 12 6zm7 13H5v-.8c0-1.1 2.7-2 7-2s7 .9 7 2v.8z" fill="currentColor"/></svg>
                      我的需求
                    </Link>
                    <div className="user-menu-divider" />
                    <button className="user-menu-item user-menu-logout" role="menuitem" onClick={handleSignOut}>
                      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M17 7l-5 5 5 5m-5-5H3m10-7h2a3 3 0 013 3v10a3 3 0 01-3 3h-2" stroke="currentColor" fill="none" strokeWidth="2"/></svg>
                      退出登录
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link className="notification-bell" href="/notifications" aria-label="通知">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
              </Link>
              <Link className="login-button" href="/auth">登录 / 注册</Link>
            </>
          )}
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
            {user ? (
              <>
                <div className="mobile-user-info">
                  <span className="user-avatar">{user.avatarUrl ? <img src={user.avatarUrl} alt="" referrerPolicy="no-referrer" /> : userInitial}</span>
                  <span>{user.displayName}</span>
                  {isDemo && <span className="demo-badge">DEMO</span>}
                </div>
                <Link href="/account" onClick={() => setMenuOpen(false)}>👤 个人资料</Link>
                <Link href="/account/demands" onClick={() => setMenuOpen(false)}>📋 我的需求</Link>
                {user.roles.some(r => ["editor", "operator", "admin"].includes(r)) && (
                  <Link href="/admin/dashboard" onClick={() => setMenuOpen(false)}>运营台</Link>
                )}
                <Link href="/notifications" onClick={() => setMenuOpen(false)}>🔔 通知</Link>
                <button onClick={() => { handleSignOut(); setMenuOpen(false); }}>退出登录 <span>→</span></button>
              </>
            ) : (
              <>
                <Link href="/notifications" onClick={() => setMenuOpen(false)}>🔔 通知</Link>
                <Link href="/auth" onClick={() => setMenuOpen(false)}>登录 / 注册 <span>→</span></Link>
              </>
            )}
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
