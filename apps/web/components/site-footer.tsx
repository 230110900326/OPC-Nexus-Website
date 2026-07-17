import Link from "next/link";
import { BrandLogo } from "./brand-logo";

const footerGroups = [
  {
    title: "阅读",
    links: [
      ["首页", "/"],
      ["今日推荐", "/discover"],
      ["全站热榜", "/rankings"],
      ["资讯", "/news"],
      ["政策", "/policies"],
      ["洞察 / 专栏", "/insights"],
      ["视频", "/videos"],
    ],
  },
  {
    title: "参与",
    links: [
      ["社区讨论", "/community"],
      ["需求广场", "/demands"],
      ["活动中心", "/events"],
      ["站内通知", "/notifications"],
    ],
  },
  {
    title: "服务",
    links: [
      ["全站搜索", "/search"],
      ["登录 / 注册", "/auth"],
      ["需求服务规范", "/demands/rules"],
      ["运营工作台", "/admin/dashboard"],
    ],
  },
] as const;

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-lead">
          <p className="footer-kicker">OPC NEXUS / CONTINUE THE SIGNAL</p>
          <BrandLogo tone="light" className="footer-logo" />
          <h2>判断不止于此。</h2>
          <p>把资讯、政策与同行经验放在同一张桌面上，保留证据，也保留不同意见。</p>
          <Link className="footer-primary-link" href="/discover">进入今日推荐 <span aria-hidden="true">→</span></Link>
        </div>
        <div className="site-footer-directory">
          {footerGroups.map((group) => (
            <nav aria-label={`${group.title}导航`} key={group.title}>
              <p>{group.title}</p>
              {group.links.map(([label, href]) => <Link href={href} key={href}>{label}</Link>)}
            </nav>
          ))}
        </div>
        <div className="site-footer-risk">
          <span>风险提示</span>
          <p>本站内容仅供信息交流与行业研究，不构成任何投资、交易或法律建议。请基于独立判断审慎决策。</p>
        </div>
        <div className="site-footer-bottom">
          <p>© 2026 OPC Nexus</p>
          <p>洞察 · 链接 · 增长</p>
          <a href="#top">返回顶部 <span aria-hidden="true">↑</span></a>
        </div>
      </div>
    </footer>
  );
}
