import Link from "next/link";
import { BrandLogo } from "./brand-logo";

const links = [
  { href: "/admin/dashboard", label: "数据看板", key: "dashboard" },
  { href: "/admin/homepage", label: "首页编排", key: "homepage" },
  { href: "/admin/audit-logs", label: "操作日志", key: "audit" },
  { href: "/admin/articles", label: "内容", key: "articles" },
  { href: "/admin/events", label: "活动", key: "events" },
  { href: "/admin/demands", label: "需求", key: "demands" },
  { href: "/admin/moderation", label: "审核", key: "moderation" },
  { href: "/admin/crawl", label: "采集", key: "crawl" },
];

export function OperationsAdminNav({ active, userName }: { active: string; userName?: string }) { return <header className="ops-admin-header"><BrandLogo href="/" /><nav aria-label="运营后台导航">{links.map((item) => <Link className={active === item.key ? "active" : ""} href={item.href} key={item.key}>{item.label}</Link>)}</nav><div style={{justifySelf:"end",display:"flex",alignItems:"center",gap:16}}><span>{userName || "运营工作台"}</span><Link href="/" style={{borderBottom:"1px solid var(--ink)",fontSize:11,color:"var(--ink-soft)",whiteSpace:"nowrap"}}>← 返回首页</Link></div></header>; }
