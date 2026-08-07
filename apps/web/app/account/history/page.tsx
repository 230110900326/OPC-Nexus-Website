"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type HistoryItem = { title: string; url: string; time: string };

const HISTORY_KEY = "opc_browsing_history";

function getHistory(): HistoryItem[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); } catch { return []; }
}

export default function BrowsingHistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>([]);

  useEffect(() => { setItems(getHistory()); }, []);

  function clearAll() {
    localStorage.removeItem(HISTORY_KEY);
    setItems([]);
  }

  return (
    <main className="account-sub-page">
      <header className="account-sub-header">
        <Link className="auth-brand" href="/"><span>OPC</span> NEXUS</Link>
        <div className="account-header-actions">
          <Link href="/account">个人资料</Link>
          <Link href="/account/posts">我的讨论</Link>
          <Link href="/account/demands">我的需求</Link>
        </div>
      </header>

      <section className="account-sub-shell">
        <div className="account-sub-heading">
          <div>
            <p className="eyebrow">BROWSING HISTORY</p>
            <h1>浏览历史</h1>
            <p>你在 OPC Nexus 上浏览的内容会自动记录在这里。</p>
          </div>
          <div className="account-sub-tally">
            <b>{items.length}</b>
            <span>条记录</span>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="home-empty">
            <strong>还没有浏览记录</strong>
            <span>你在 OPC Nexus 上浏览的资讯和文章会自动记录在这里。</span>
            <Link href="/discover">去发现页看看 →</Link>
          </div>
        ) : (
          <>
            <div className="account-sub-toolbar">
              <span className="account-sub-count">共 {items.length} 条浏览记录</span>
              <button onClick={clearAll} className="text-button">清空全部记录</button>
            </div>
            <div className="account-history-list">
              {items.map((item, i) => (
                <article key={i} className="account-history-item">
                  <span className="history-index">{i + 1}</span>
                  <div className="history-body">
                    <h2>
                      <Link href={item.url}>{item.title}</Link>
                    </h2>
                    <p>{new Date(item.time).toLocaleString("zh-CN")}</p>
                  </div>
                  <Link href={item.url} className="history-arrow" aria-label={`查看 ${item.title}`}>→</Link>
                </article>
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
