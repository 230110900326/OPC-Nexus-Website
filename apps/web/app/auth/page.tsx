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
  const [mode, setMode] = useState<AuthMode>("login");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pending, setPending] = useState(false);
  const [acceptedPolicies, setAcceptedPolicies] = useState(false);

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError("");
    setSuccess("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setSuccess("");

    if (mode === "register" && !acceptedPolicies) {
      setError("请先阅读并同意用户服务协议和隐私政策");
      return;
    }

    setPending(true);
    const fields = new FormData(event.currentTarget);
    const input = Object.fromEntries(fields.entries()) as Record<string, string>;

    try {
      if (mode === "forgot") {
        const res = await fetch(`${apiBaseUrl}/auth/forgot-password`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: input.email }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error((body as any)?.error?.message || "暂时无法发送重置邮件");
        }
        setSuccess("如果该邮箱已注册，我们会发送一封密码重置邮件，请查收。");
        return;
      }

      if (mode === "register" && input.password !== input.confirmPassword) {
        setError("两次输入的密码不一致");
        return;
      }

      const request: Record<string, string> = mode === "register"
        ? { email: input.email, password: input.password, displayName: input.displayName }
        : { email: input.email, password: input.password };

      await signIn(mode, request);
      const dest = new URLSearchParams(window.location.search).get("next");
      router.replace(dest?.startsWith("/") && !dest.startsWith("//") && !dest.includes("\\") ? dest : "/account");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "暂时无法完成操作");
    } finally {
      setPending(false);
    }
  }

  return <main className="auth-page">
    <BrandLogo tone="dark" />
    <div className="auth-shell">

      {/* ═══════════ 登录 ═══════════ */}
      {mode === "login" && (
        <section className="auth-card" aria-label="登录">
          <h2>登录</h2>
          <p className="auth-help">欢迎回来，请登录你的账号。</p>
          <form onSubmit={submit} noValidate>
            <label>邮箱<input required name="email" type="email" autoComplete="email" placeholder="name@company.com" /></label>
            <label>密码<input required name="password" type="password" minLength={8} autoComplete="current-password" placeholder="至少 8 位" /></label>
            <p className="auth-policy-note">登录前可查看 <Link href="/terms" target="_blank" rel="noopener noreferrer">《用户服务协议》</Link>和<Link href="/privacy" target="_blank" rel="noopener noreferrer">《隐私政策》</Link>。</p>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="auth-submit" disabled={pending}>{pending ? "处理中…" : "登录"}</button>
          </form>
          <p className="auth-switch-hint">
            还没有账号？<button type="button" onClick={() => switchMode("register")}>立即注册</button>
            <span style={{margin:"0 10px",color:"var(--line)"}}>|</span>
            <button type="button" onClick={() => switchMode("forgot")}>忘记密码？</button>
          </p>
        </section>
      )}

      {/* ═══════════ 注册 ═══════════ */}
      {mode === "register" && (
        <section className="auth-card" aria-label="注册">
          <h2>注册</h2>
          <p className="auth-help">创建你的 OPC 身份，开始建立专业链接。</p>
          <form onSubmit={submit} noValidate>
            <label>显示名称<input required name="displayName" minLength={2} maxLength={60} placeholder="例如：王知行" /></label>
            <label>邮箱<input required name="email" type="email" autoComplete="email" placeholder="name@company.com" /></label>
            <label>密码<input required name="password" type="password" minLength={8} autoComplete="new-password" placeholder="至少 8 位，包含字母和数字" /></label>
            <label>确认密码<input required name="confirmPassword" type="password" minLength={8} autoComplete="new-password" placeholder="请再次输入密码" /></label>
            <div className="auth-consent">
              <input id="accepted-policies" type="checkbox" checked={acceptedPolicies} onChange={(e) => setAcceptedPolicies(e.target.checked)} aria-required="true" />
              <span><label htmlFor="accepted-policies">我已阅读并同意</label> <Link href="/terms" target="_blank" rel="noopener noreferrer">《用户服务协议》</Link>和<Link href="/privacy" target="_blank" rel="noopener noreferrer">《隐私政策》</Link></span>
            </div>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="auth-submit" disabled={pending}>{pending ? "处理中…" : "注册"}</button>
          </form>
          <p className="auth-switch-hint">已有账号？<button type="button" onClick={() => switchMode("login")}>立即登录</button></p>
        </section>
      )}

      {/* ═══════════ 找回密码 ═══════════ */}
      {mode === "forgot" && (
        <section className="auth-card" aria-label="找回密码">
          <h2>找回密码</h2>
          <p className="auth-help">输入你的注册邮箱，我们将发送重置链接到你的邮箱。</p>
          <form onSubmit={submit} noValidate>
            <label>邮箱<input required name="email" type="email" autoComplete="email" placeholder="name@company.com" /></label>
            {error && <p className="form-error" role="alert">{error}</p>}
            {success && <p className="form-success" role="status">{success}</p>}
            <button className="auth-submit" disabled={pending}>{pending ? "处理中…" : "发送重置邮件"}</button>
          </form>
          <p className="auth-switch-hint"><button type="button" onClick={() => switchMode("login")}>← 返回登录</button></p>
        </section>
      )}
    </div>
  </main>;
}
