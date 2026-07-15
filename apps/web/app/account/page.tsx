"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Account, authorizedRequest, refreshSession, signOut } from "../../lib/auth";

export default function AccountPage() {
  const router = useRouter(); const [user, setUser] = useState<Account | null>(null); const [error, setError] = useState(""); const [saved, setSaved] = useState(false);
  useEffect(() => { refreshSession().then(setUser).catch(() => router.replace("/auth")); }, [router]);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setError(""); setSaved(false); try { const input = Object.fromEntries(new FormData(event.currentTarget).entries()); setUser(await authorizedRequest<Account>("/users/me", { method: "PATCH", body: JSON.stringify(input) })); setSaved(true); } catch (reason) { setError(reason instanceof Error ? reason.message : "资料未能保存"); } }
  async function leave() { await signOut(); router.replace("/"); }
  if (!user) return <main className="account-loading">正在核验你的身份…</main>;
  const canManageContent = user.roles.some((role) => ["editor", "operator", "admin"].includes(role)); const canModerate = user.roles.some((role) => ["moderator", "operator", "admin"].includes(role));
  return <main className="account-page"><header className="account-header"><Link className="auth-brand" href="/"><span>OPC</span> NEXUS</Link><div className="account-header-actions"><Link href="/community/new">发起讨论</Link>{canManageContent && <Link href="/admin/articles">内容工作台</Link>}{canModerate && <Link href="/admin/moderation">举报审核</Link>}<button onClick={leave}>退出登录</button></div></header><section className="profile-layout"><aside className="profile-card"><p className="eyebrow">我的 OPC 档案</p><div className="profile-monogram">{user.displayName.slice(0, 1)}</div><h1>{user.displayName}</h1><p>{user.jobTitle || "待补充职位"}{user.company ? ` · ${user.company}` : ""}</p><dl><div><dt>行业</dt><dd>{user.industry || "尚未选择"}</dd></div><div><dt>身份</dt><dd>{user.roles.join(" · ")}</dd></div></dl></aside><section className="profile-form"><p className="eyebrow">资料设置</p><h2>让同行更好地认识你</h2><form onSubmit={submit}><label>显示名称<input name="displayName" defaultValue={user.displayName} maxLength={60} /></label><label>行业<input name="industry" defaultValue={user.industry ?? ""} maxLength={80} placeholder="例如：科技与产业" /></label><div className="two-fields"><label>公司<input name="company" defaultValue={user.company ?? ""} maxLength={120} /></label><label>职位<input name="jobTitle" defaultValue={user.jobTitle ?? ""} maxLength={80} /></label></div><label>头像链接<input name="avatarUrl" type="url" defaultValue={user.avatarUrl ?? ""} placeholder="https://…" /></label><label>个人简介<textarea name="bio" defaultValue={user.bio ?? ""} maxLength={280} rows={4} placeholder="用几句话介绍你的关注方向。" /></label>{error && <p className="form-error" role="alert">{error}</p>}{saved && <p className="form-success">资料已保存。</p>}<button className="auth-submit">保存资料 <span>→</span></button></form></section></section></main>;
}
