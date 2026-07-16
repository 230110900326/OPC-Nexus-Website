import Link from "next/link";
import { BrandLogo } from "./brand-logo";
export function SiteHeader() { return <header className="site-header"><BrandLogo /><nav aria-label="主导航"><Link href="/discover">推荐</Link><Link href="/rankings">热榜</Link><Link href="/news">资讯</Link><Link href="/policies">政策</Link><Link href="/videos">视频</Link><Link href="/community">社区</Link><Link href="/events">活动</Link></nav><div className="header-actions"><Link href="/admin/dashboard">运营台</Link><Link href="/notifications">通知</Link><Link className="login-button" href="/auth">登录 / 注册</Link></div></header>; }
