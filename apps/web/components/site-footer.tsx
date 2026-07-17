"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { BrandLogo } from "./brand-logo";

const footerGroups = [
  {
    title: "平台频道",
    links: [
      ["今日推荐", "/discover"],
      ["洞察 / 专栏", "/insights"],
      ["社区讨论", "/community"],
      ["需求广场", "/demands"],
    ],
  },
  {
    title: "服务支持",
    links: [
      ["关于我们", "/about"],
      ["常见问题 FAQ", "/faq"],
      ["联系方式", "/contact"],
      ["全站搜索", "/search"],
    ],
  },
  {
    title: "合规协议",
    links: [
      ["用户协议", "/terms"],
      ["隐私政策", "/privacy"],
      ["社区规范", "/community/rules"],
      ["需求服务规范", "/demands/rules"],
    ],
  },
] as const;

type FooterGroup = (typeof footerGroups)[number];

function FooterDirectoryGroup({ group }: { group: FooterGroup }) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 601px)");
    const sync = () => { if (detailsRef.current) detailsRef.current.open = desktop.matches; };
    sync();
    desktop.addEventListener("change", sync);
    return () => desktop.removeEventListener("change", sync);
  }, []);

  return (
    <details className="site-footer-group" ref={detailsRef}>
      <summary><span>{group.title}</span><i aria-hidden="true" /></summary>
      <div className="site-footer-group-links">
        {group.links.map(([label, href]) => <Link href={href} key={href}>{label}</Link>)}
      </div>
    </details>
  );
}

export function SiteFooter() {
  const pathname = usePathname();
  if (pathname.startsWith("/admin") || pathname.startsWith("/auth")) return null;

  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-lead">
          <p className="footer-kicker">OPC NEXUS / CONTINUE THE SIGNAL</p>
          <BrandLogo tone="light" className="footer-logo" />
          <div className="footer-belief">
            <p className="footer-belief-label">BRAND BELIEF / 品牌理念</p>
            <p className="footer-belief-en" lang="en">
              <span><b>P</b>erceive trends,</span>
              <span><b>P</b>artner peers,</span>
              <span><b>P</b>rogress profits.</span>
            </p>
            <p className="footer-belief-zh">洞察先机，联结聚力，增长不息</p>
          </div>
        </div>
        <nav className="site-footer-directory" aria-label="页脚导航">
          {footerGroups.map((group) => <FooterDirectoryGroup group={group} key={group.title} />)}
        </nav>
        <div className="site-footer-bottom">
          <p>© 2026 OPC Nexus</p>
          <p>财经产业社群 · 保留不同判断</p>
          <a href="#top">返回顶部 <span aria-hidden="true">↑</span></a>
        </div>
      </div>
    </footer>
  );
}
