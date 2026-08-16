"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Account, authorizedRequest, getAccessToken, getMyProfile, refreshSession, signOut } from "../../lib/auth";

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<Account | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const token = getAccessToken();
    const load = token
      ? getMyProfile().catch(() => refreshSession())
      : refreshSession();
    load.then(u => { setUser(u); if (u.avatarUrl) setAvatarPreview(u.avatarUrl); }).catch(() => router.replace("/auth"));
  }, [router]);

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
          <Link href="/account/favorites">我的收藏</Link>
          {canManageContent && <Link href="/admin/articles">内容工作台</Link>}
          {canModerate && <Link href="/admin/moderation">举报审核</Link>}
          <button onClick={leave}>退出登录</button>
        </div>
      </header>

      <section className="profile-layout">
        {/* ── Left: Profile Card ── */}
        <aside className="profile-card">
          <p className="eyebrow">我的档案</p>
          <div className="profile-monogram">
            {user.avatarUrl ? <img src={user.avatarUrl} alt="" referrerPolicy="no-referrer" /> : userInitial}
          </div>
          <h2>{user.displayName}</h2>
          <p>{user.jobTitle || "待补充职位"}{user.company ? ` · ${user.company}` : ""}</p>
          <dl>
            <div><dt>行业</dt><dd>{user.industry || "尚未选择"}</dd></div>
            <div><dt>身份</dt><dd>{user.roles.join(" · ")}</dd></div>
          </dl>
          <div className="profile-card-links">
            <Link href="/account/posts" className="btn-card-link">我的讨论</Link>
            <Link href="/account/likes" className="btn-card-link">我的点赞</Link>
            <Link href="/account/comments" className="btn-card-link">我的评论</Link>
            <Link href="/account/history" className="btn-card-link">浏览历史</Link>
          </div>
        </aside>

        {/* ── Right: Edit Form ── */}
        <section className="profile-form">
          <p className="eyebrow">资料设置</p>
          <h2>编辑个人资料</h2>

          <form onSubmit={submit}>
            {/* ── Section: 基本信息 ── */}
            <fieldset className="form-section">
              <legend>基本信息</legend>

              <label>显示名称 <span className="required">*</span>
                <input required name="displayName" defaultValue={user.displayName} maxLength={60} minLength={2} placeholder="你的显示名称" />
              </label>

              <div className="form-row-2">
                <label>行业
                  <input name="industry" defaultValue={user.industry ?? ""} maxLength={80} placeholder="例如：科技与产业" />
                </label>
                <label>职位
                  <input name="jobTitle" defaultValue={user.jobTitle ?? ""} maxLength={80} placeholder="例如：产品经理" />
                </label>
              </div>

              <label>公司
                <input name="company" defaultValue={user.company ?? ""} maxLength={120} placeholder="例如：某某科技有限公司" />
              </label>
            </fieldset>

            {/* ── Section: 头像 ── */}
            <fieldset className="form-section">
              <legend>头像</legend>
              <div className="avatar-row">
                <div className="avatar-preview-circle" onClick={() => fileInputRef.current?.click()} title="点击更换头像">
                  {avatarPreview
                    ? <img src={avatarPreview} alt="头像预览" referrerPolicy="no-referrer" />
                    : <span className="avatar-placeholder">{userInitial}</span>
                  }
                </div>
                <div className="avatar-btns">
                  <button type="button" className="btn-outline" onClick={() => fileInputRef.current?.click()}>
                    上传图片
                  </button>
                  {avatarPreview && (
                    <button type="button" className="btn-text-danger" onClick={removeAvatar}>移除头像</button>
                  )}
                  <p className="field-hint">JPG / PNG，不超过 2MB</p>
                </div>
                <input ref={fileInputRef} type="file" name="avatarFile" accept="image/png,image/jpeg,image/webp" onChange={handleAvatarFile} hidden />
              </div>
            </fieldset>

            {/* ── Section: 简介 ── */}
            <fieldset className="form-section">
              <legend>个人简介</legend>
              <label>用几句话介绍你的关注方向
                <textarea name="bio" defaultValue={user.bio ?? ""} maxLength={280} rows={4} placeholder="例如：关注早期投资、SaaS 和企业服务…" />
              </label>
            </fieldset>

            {/* ── Feedback ── */}
            {error && <div className="form-error" role="alert">{error}</div>}
            {saved && <div className="form-success-banner">✓ 资料已保存</div>}

            {/* ── Actions ── */}
            <div className="form-actions">
              <button className="btn-primary" type="submit">保存资料</button>
              <Link href="/" className="btn-outline">← 返回首页</Link>
            </div>
          </form>
        </section>
      </section>
    </main>
  );
}
