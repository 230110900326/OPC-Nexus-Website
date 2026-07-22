"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Account, authorizedRequest, refreshSession, signOut } from "../../lib/auth";

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<Account | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { refreshSession().then(u => { setUser(u); if (u.avatarUrl) setAvatarPreview(u.avatarUrl); }).catch(() => router.replace("/auth")); }, [router]);

  function handleAvatarFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setError("头像文件不能超过 2MB"); return; }
    if (!file.type.startsWith("image/")) { setError("请选择图片文件"); return; }
    const reader = new FileReader();
    reader.onload = () => { setAvatarPreview(reader.result as string); setError(""); };
    reader.onerror = () => setError("文件读取失败，请重试");
    reader.readAsDataURL(file);
  }

  function removeAvatar() { setAvatarPreview(null); if (fileInputRef.current) fileInputRef.current.value = ""; }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setSaved(false);
    try {
      const fields = new FormData(event.currentTarget);
      const input: Record<string, string> = {};
      fields.forEach((v, k) => {
        if (k !== "avatarFile" && v !== "" && v !== undefined) (input as any)[k] = v;
      });
      if (avatarPreview) input.avatarUrl = avatarPreview; else if (input.avatarUrl === undefined) input.avatarUrl = "";
      const updated = await authorizedRequest<Account>("/users/me", { method: "PATCH", body: JSON.stringify(input) });
      setUser(updated);
      if (updated.avatarUrl) setAvatarPreview(updated.avatarUrl);
      setSaved(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "资料未能保存");
    }
  }

  async function leave() { await signOut(); router.replace("/"); }
  if (!user) return <main className="account-loading">正在核验你的身份…</main>;

  const canManageContent = user.roles.some((role) => ["editor", "operator", "admin"].includes(role));
  const canModerate = user.roles.some((role) => ["moderator", "operator", "admin"].includes(role));
  const userInitial = user.displayName.slice(0, 1);

  return (
    <main className="account-page">
      <header className="account-header">
        <Link className="auth-brand" href="/"><span>OPC</span> NEXUS</Link>
        <div className="account-header-actions">
          <Link href="/community/new">发起讨论</Link>
          <Link href="/account/demands">我的需求</Link>
          {canManageContent && <Link href="/admin/articles">内容工作台</Link>}
          {canModerate && <Link href="/admin/moderation">举报审核</Link>}
          <button onClick={leave}>退出登录</button>
        </div>
      </header>
      <section className="profile-layout">
        <aside className="profile-card">
          <p className="eyebrow">我的 OPC 档案</p>
          <div className="profile-monogram">{user.avatarUrl ? <img src={user.avatarUrl} alt="" referrerPolicy="no-referrer" /> : userInitial}</div>
          <h1>{user.displayName}</h1>
          <p>{user.jobTitle || "待补充职位"}{user.company ? ` · ${user.company}` : ""}</p>
          <dl>
            <div><dt>行业</dt><dd>{user.industry || "尚未选择"}</dd></div>
            <div><dt>身份</dt><dd>{user.roles.join(" · ")}</dd></div>
          </dl>
          <Link className="profile-demand-link" href="/account/demands">进入供需工作台 →</Link>
        </aside>
        <section className="profile-form">
          <p className="eyebrow">资料设置</p>
          <h2>让同行更好地认识你</h2>
          <form onSubmit={submit}>
            {/* ─── 显示名称 ─── */}
            <label className="form-label-required">显示名称
              <input required name="displayName" defaultValue={user.displayName} maxLength={60} minLength={2} />
            </label>

            {/* ─── 行业 ─── */}
            <label>行业 <span className="optional-mark">(选填)</span>
              <input name="industry" defaultValue={user.industry ?? ""} maxLength={80} placeholder="例如：科技与产业" />
            </label>

            {/* ─── 公司 / 职位 ─── */}
            <div className="two-fields">
              <label>公司 <span className="optional-mark">(选填)</span>
                <input name="company" defaultValue={user.company ?? ""} maxLength={120} />
              </label>
              <label>职位 <span className="optional-mark">(选填)</span>
                <input name="jobTitle" defaultValue={user.jobTitle ?? ""} maxLength={80} />
              </label>
            </div>

            {/* ─── 头像上传 ─── */}
            <div className="avatar-field-group">
              <p className="avatar-field-label">头像</p>
              <div className="avatar-field-body">
                <div className="avatar-field-preview" onClick={() => fileInputRef.current?.click()} title="点击上传头像">
                  {avatarPreview
                    ? <img src={avatarPreview} alt="头像预览" referrerPolicy="no-referrer" />
                    : <span className="avatar-field-placeholder">{userInitial}</span>
                  }
                  <span className="avatar-field-overlay">更换</span>
                </div>
                <div className="avatar-field-actions">
                  <button type="button" className="avatar-upload-btn" onClick={() => fileInputRef.current?.click()}>
                    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    选择图片
                  </button>
                  {avatarPreview && (
                    <button type="button" className="avatar-remove-btn" onClick={removeAvatar}>移除</button>
                  )}
                  <p className="avatar-field-hint">支持 JPG/PNG，不超过 2MB</p>
                </div>
                <input ref={fileInputRef} type="file" name="avatarFile" accept="image/png,image/jpeg,image/webp" onChange={handleAvatarFile} style={{display:"none"}} />
              </div>
            </div>

            {/* ─── 个人简介 ─── */}
            <label>个人简介 <span className="optional-mark">(选填)</span>
              <textarea name="bio" defaultValue={user.bio ?? ""} maxLength={280} rows={4} placeholder="用几句话介绍你的关注方向。" />
            </label>

            {error && <p className="form-error" role="alert">{error}</p>}
            {saved && (
              <div className="profile-saved-banner">
                <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="var(--teal)" stroke="none"/><path d="M8 12l3 3 5-5" stroke="#fff" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <span>资料已保存</span>
              </div>
            )}
            <div className="profile-form-actions">
              <button className="auth-submit" type="submit">保存资料 <span>→</span></button>
              <Link href="/" className="profile-back-link">← 返回首页</Link>
            </div>
          </form>
        </section>
      </section>
    </main>
  );
}
