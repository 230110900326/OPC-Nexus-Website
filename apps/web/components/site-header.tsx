import Link from "next/link";
export function SiteHeader() { return <header className="site-header"><Link className="brand" href="/"><span className="brand-mark">OPC</span><span>NEXUS</span></Link><nav aria-label="主导航"><Link href="/news">资讯</Link><Link href="/policies">政策</Link><Link href="/news?type=insight">洞察</Link></nav><Link className="login-button" href="/auth">登录 / 注册</Link></header>; }
