"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { BrandLogo } from "../../../components/brand-logo";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const userId = params.get("id") ?? "";

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pending, setPending] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const valid = token.length >= 64 && userId.length > 0;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setSuccess("");
    if (password !== confirmPassword) { setError("两次输入的密码不一致"); return; }
    setPending(true);
    try {
      const res = await fetch(`${apiBaseUrl}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, userId, password }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !(body as any)?.success) {
        throw new Error((body as any)?.error?.message || "请求未能完成");
      }
      setSuccess("密码重置成功！即将跳转到登录页面…");
      setTimeout(() => router.replace("/auth"), 2000);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "暂时无法完成操作");
    } finally { setPending(false); }
  }

  if (!valid) {
    return (
      <section className="auth-card" aria-labelledby="auth-heading">
        <div className="auth-tabs"><span className="active">重置密码</span></div>
        <h2 id="auth-heading">链接无效</h2>
        <p className="auth-help">重置密码链接不完整或已损坏。请在邮箱中复制完整链接后重试。</p>
        <p className="auth-back-link">
          <Link href="/auth">← 返回登录</Link>
        </p>
      </section>
    );
  }

  return (
    <section className="auth-card" aria-labelledby="auth-heading">
      <div className="auth-tabs"><span className="active">重置密码</span></div>
      <h2 id="auth-heading">设置新密码</h2>
      <p className="auth-help">请输入你的新密码。</p>
      <form onSubmit={submit} noValidate>
        <label>新密码<input required name="password" type="password" minLength={8} autoComplete="new-password" placeholder="至少 8 位，包含字母和数字" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        <label>确认新密码<input required name="confirmPassword" type="password" minLength={8} autoComplete="new-password" placeholder="请再次输入新密码" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} /></label>
        {error && <p className="form-error" role="alert">{error}</p>}
        {success && <p className="form-success" role="status">{success}</p>}
        <button className="auth-submit" disabled={pending}>{pending ? "正在处理…" : "重置密码"}<span>→</span></button>
      </form>
      <p className="auth-back-link">
        <Link href="/auth">← 返回登录</Link>
      </p>
    </section>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="auth-page">
      <BrandLogo tone="dark" />
      <section className="auth-shell">
        <aside className="auth-aside">
          <p className="eyebrow">身份档案 · OPC</p>
          <h1>重新设置<br />你的<span>密码</span></h1>
          <p>选择一个强密码来保护你的账户安全。建议使用字母、数字和特殊字符的组合。</p>
          <div className="auth-index"><b>01</b><span>身份验证</span><b>02</b><span>行业定位</span><b>03</b><span>专业连接</span></div>
        </aside>
        <Suspense fallback={<section className="auth-card"><div className="auth-tabs"><span className="active">重置密码</span></div><p className="auth-help">正在加载…</p></section>}>
          <ResetPasswordForm />
        </Suspense>
      </section>
    </main>
  );
}
