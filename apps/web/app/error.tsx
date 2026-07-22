"use client";
import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("page_render_failed", error); }, [error]);
  return <main className="error-state-page"><p className="eyebrow">TEMPORARY INTERRUPTION</p><h1>页面没有正确加载。</h1><p>请稍后重试；如果问题持续，可在联系页面附上时间与操作步骤。</p><div><button onClick={reset}>重新加载</button><a href="/">返回首页</a></div></main>;
}
