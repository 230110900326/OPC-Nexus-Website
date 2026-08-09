"use client";
import { useEffect } from "react";
import { recordBrowsingHistory } from "../lib/history";

/** 内容详情页挂载时把当前访问记入浏览历史（localStorage）。 */
export function BrowsingHistoryTracker({ title }: { title: string }) {
  useEffect(() => {
    if (typeof window === "undefined" || !title) return;
    recordBrowsingHistory(title, window.location.pathname + window.location.search);
  }, [title]);
  return null;
}
