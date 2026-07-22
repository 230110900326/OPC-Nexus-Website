"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Account, refreshSession } from "../lib/auth";
import { Report, getReports, resolveReport } from "../lib/forum";
import { OperationsAdminNav } from "./operations-admin-nav";

const automaticReviewReason = "财经高风险词人工审核";

export function ModerationManager() {
  const router = useRouter();
  const [account, setAccount] = useState<Account | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [status, setStatus] = useState("pending");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load(value = status) {
    setLoading(true);
    try { setReports((await getReports(value)).items); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "举报队列加载失败"); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    refreshSession().then((value) => {
      if (!value.roles.some((role) => ["moderator", "operator", "admin"].includes(role))) throw new Error("没有审核权限");
      setAccount(value); return load();
    }).catch(() => router.replace("/auth"));
  }, [router]);

  async function act(report: Report, mode: "dismiss" | "enforce" | "approve") {
    const promptText = mode === "approve" ? "填写审核通过说明" : mode === "dismiss" ? "说明驳回原因" : "填写处置说明";
    const resolution = window.prompt(promptText);
    if (!resolution) return;
    const automatic = report.reason === automaticReviewReason;
    const statusValue = mode === "dismiss" && !automatic ? "rejected" : "resolved";
    const action = mode === "approve" || (mode === "dismiss" && !automatic) ? "none" : report.targetType === "user" ? "ban" : "hide";
    try { await resolveReport(report.id, { status: statusValue, action, resolution }); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "处理失败"); }
  }

  function targetLink(report: Report) {
    if (report.targetType === "post") return `/community/posts/${report.targetId}`;
    if (report.targetType === "comment" && report.targetPreview?.postId) return `/community/posts/${report.targetPreview.postId}`;
    if (report.targetType === "article") return `/admin/articles/${report.targetId}/preview`;
    if (report.targetType === "demand") return `/demands/${report.targetId}`;
    return null;
  }

  return <main className="ops-admin-page"><OperationsAdminNav active="moderation" userName={account?.displayName} /><section className="moderation-shell"><div className="admin-title"><div><p className="eyebrow">TRUST &amp; SAFETY DESK</p><h1>举报与合规审核</h1><p>先核对上下文，再执行公开、隐藏、封禁或驳回；每次处置都会留下记录。</p></div></div><div className="moderation-tabs">{["pending", "resolved", "rejected"].map((value) => <button className={status === value ? "active" : ""} onClick={() => { setStatus(value); void load(value); }} key={value}>{value === "pending" ? "待处理" : value === "resolved" ? "已处理" : "已驳回"}</button>)}</div>{error && <p className="form-error" role="alert">{error}</p>}{loading ? <p className="content-state">正在读取审核队列…</p> : <div className="report-queue">{reports.map((report) => { const automatic = report.reason === automaticReviewReason; const link = targetLink(report); return <article key={report.id}><div className="report-code">{automatic ? "AUTO REVIEW" : report.targetType.toUpperCase()}<span>{report.id.slice(0, 8)}</span></div><div><h2>{report.reason}</h2>{report.targetPreview && <div className="target-preview"><strong>{report.targetPreview.title}</strong><p>{report.targetPreview.excerpt || "无公开资料"}</p></div>}<p>{report.details || "举报人未补充说明。"}</p><footer>提交人 {report.reporter.displayName} · {new Date(report.createdAt).toLocaleString("zh-CN")}</footer></div><div className="report-actions">{link && !automatic && <Link href={link}>查看目标</Link>}{status === "pending" && (automatic ? <><button onClick={() => act(report, "enforce")}>不予公开</button><button onClick={() => act(report, "approve")}>批准公开</button></> : <><button onClick={() => act(report, "dismiss")}>驳回</button><button className="danger" onClick={() => act(report, "enforce")}>{report.targetType === "user" ? "封禁用户" : "隐藏内容"}</button></>)}</div></article>; })}{reports.length === 0 && <p className="content-state">当前队列为空。</p>}</div>}</section></main>;
}
