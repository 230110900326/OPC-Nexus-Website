import Link from "next/link";
import { BrandLogo } from "./brand-logo";
export function SiteHeader() { return <header className="site-header"><BrandLogo /><nav aria-label="主导航"><Link href="/news">资讯</Link><Link href="/policies">政策</Link><Link href="/insights">洞察</Link><Link href="/community">社区</Link><Link href="/events">活动</Link><Link href="/search">搜索</Link></nav><div className="header-actions"><Link href="/notifications">通知</Link><Link className="login-button" href="/auth">登录 / 注册</Link></div></header>; }
