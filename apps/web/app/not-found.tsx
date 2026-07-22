import Link from "next/link";
import { SiteChrome } from "../components/site-chrome";

export default function NotFound() {
  return <SiteChrome><main className="error-state-page"><p className="eyebrow">404 · SIGNAL NOT FOUND</p><h1>这条信号暂时不存在。</h1><p>页面可能已被移动、下架，或链接输入有误。</p><div><Link href="/">返回首页</Link><Link href="/search">全站搜索</Link></div></main></SiteChrome>;
}
