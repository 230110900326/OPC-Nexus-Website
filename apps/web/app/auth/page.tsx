"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "../../lib/auth";
import { BrandLogo } from "../../components/brand-logo";

type AuthMode = "login" | "register" | "forgot";
const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode | "welcome">("welcome");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pending, setPending] = useState(false);
  const [acceptedPolicies, setAcceptedPolicies] = useState(false);

  function switchMode(nextMode: AuthMode | "welcome") {
    setMode(nextMode);
    setError("");
    setSuccess("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setSuccess("");
    if (mode === "register" && !acceptedPolicies) { setError("请先阅读并同意用户服务协议和隐私政策"); return; }
    setPending(true);
    const fields = new FormData(event.currentTarget);
    const input = Object.fromEntries(fields.entries()) as Record<string, string>;
    try {
      if (mode === "forgot") {
        const res = await fetch(`${apiBaseUrl}/auth/forgot-password`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: input.email }),
        });
        if (!res.ok) { const body = await res.json().catch(() => ({})); throw new Error((body as any)?.error?.message || "暂时无法发送重置邮件"); }
        setSuccess("如果该邮箱已注册，我们会发送一封密码重置邮件，请查收。");
        return;
      }
      if (mode === "register" && input.password !== input.confirmPassword) { setError("两次输入的密码不一致"); return; }
      const request: Record<string, string> = mode === "register"
        ? { email: input.email, password: input.password, displayName: input.displayName }
        : { email: input.email, password: input.password };
      await signIn(mode as "login" | "register", request);
      const dest = new URLSearchParams(window.location.search).get("next");
      router.replace(dest?.startsWith("/") && !dest.startsWith("//") && !dest.includes("\\") ? dest : "/account");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "暂时无法完成操作"); }
    finally { setPending(false); }
  }

  return <main className="auth-hero">
    {/* ═══════════ Welcome 欢迎页 ═══════════ */}
    {mode === "welcome" && (
      <div className="auth-hero-content">
        <div className="auth-hero-logo"><BrandLogo tone="dark" /></div>
        <div className="auth-hero-tagline">
          <h1>判断<br />不止<span>于此</span></h1>
          <p>面向财经、产业、投资与企业经营者的专业内容与交流平台。</p>
        </div>
        <div className="auth-hero-pillars">
          <span><b>洞察</b>在噪声中找到信号</span>
          <span><b>链接</b>从孤立走向协作</span>
          <span><b>增长</b>认知驱动业务增长</span>
        </div>
        <div className="auth-hero-actions">
          <button className="auth-hero-btn primary" onClick={() => switchMode("login")}>登录</button>
          <button className="auth-hero-btn" onClick={() => switchMode("register")}>创建账号</button>
        </div>
        <p className="auth-hero-footnote">
          继续即表示同意 <Link href="/terms" target="_blank">《用户服务协议》</Link>和<Link href="/privacy" target="_blank">《隐私政策》</Link>
        </p>
      </div>
    )}

    {/* ═══════════ 登录 ═══════════ */}
    {mode === "login" && (
      <div className="auth-hero-content">
        <div className="auth-hero-logo"><BrandLogo tone="dark" /></div>
        <div className="auth-hero-card">
          <h2>登录</h2>
          <p className="auth-hero-sub">欢迎回来，请登录你的账号。</p>
          <form onSubmit={submit} noValidate>
            <label>邮箱<input required name="email" type="email" autoComplete="email" placeholder="name@company.com" /></label>
            <label>密码<input required name="password" type="password" minLength={8} autoComplete="current-password" placeholder="至少 8 位" /></label>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="auth-hero-submit" disabled={pending}>{pending ? "处理中…" : "登录"}</button>
          </form>
          <div className="auth-hero-links">
            <button type="button" onClick={() => switchMode("forgot")}>忘记密码？</button>
            <button type="button" onClick={() => switchMode("register")}>还没有账号？立即注册</button>
          </div>
        </div>
        <p className="auth-hero-back"><button type="button" onClick={() => switchMode("welcome")}>← 返回首页</button></p>
      </div>
    )}

    {/* ═══════════ 注册 ═══════════ */}
    {mode === "register" && (
      <div className="auth-hero-content">
        <div className="auth-hero-logo"><BrandLogo tone="dark" /></div>
        <div className="auth-hero-card">
          <h2>创建账号</h2>
          <p className="auth-hero-sub">创建你的 OPC 身份，开始建立专业链接。</p>
          <form onSubmit={submit} noValidate>
            <label>显示名称<input required name="displayName" minLength={2} maxLength={60} placeholder="例如：王知行" /></label>
            <label>邮箱<input required name="email" type="email" autoComplete="email" placeholder="name@company.com" /></label>
            <label>密码<input required name="password" type="password" minLength={8} autoComplete="new-password" placeholder="至少 8 位，包含字母和数字" /></label>
            <label>确认密码<input required name="confirmPassword" type="password" minLength={8} autoComplete="new-password" placeholder="请再次输入密码" /></label>
            <div className="auth-hero-consent">
              <input id="accepted-policies" type="checkbox" checked={acceptedPolicies} onChange={(e) => setAcceptedPolicies(e.target.checked)} aria-required="true" />
              <span><label htmlFor="accepted-policies">我已阅读并同意</label> <Link href="/terms" target="_blank">《用户服务协议》</Link>和<Link href="/privacy" target="_blank">《隐私政策》</Link></span>
            </div>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="auth-hero-submit" disabled={pending}>{pending ? "处理中…" : "注册"}</button>
          </form>
          <div className="auth-hero-links">
            <button type="button" onClick={() => switchMode("login")}>已有账号？立即登录</button>
          </div>
        </div>
        <p className="auth-hero-back"><button type="button" onClick={() => switchMode("welcome")}>← 返回首页</button></p>
      </div>
    )}

    {/* ═══════════ 找回密码 ═══════════ */}
    {mode === "forgot" && (
      <div className="auth-hero-content">
        <div className="auth-hero-logo"><BrandLogo tone="dark" /></div>
        <div className="auth-hero-card">
          <h2>找回密码</h2>
          <p className="auth-hero-sub">输入你的注册邮箱，我们将发送重置链接到你的邮箱。</p>
          <form onSubmit={submit} noValidate>
            <label>邮箱<input required name="email" type="email" autoComplete="email" placeholder="name@company.com" /></label>
            {error && <p className="form-error" role="alert">{error}</p>}
            {success && <p className="form-success" role="status">{success}</p>}
            <button className="auth-hero-submit" disabled={pending}>{pending ? "处理中…" : "发送重置邮件"}</button>
          </form>
          <div className="auth-hero-links">
            <button type="button" onClick={() => switchMode("login")}>← 返回登录</button>
          </div>
        </div>
      </div>
    )}
  </main>;
}
