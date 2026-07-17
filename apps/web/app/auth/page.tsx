"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "../../lib/auth";
import { BrandLogo } from "../../components/brand-logo";

type AuthMode = "login" | "register";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("login");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [acceptedPolicies, setAcceptedPolicies] = useState(false);

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (mode === "register" && !acceptedPolicies) {
      setError("请先阅读并同意用户服务协议和隐私政策");
      return;
    }

    const fields = new FormData(event.currentTarget);
    const input = Object.fromEntries(fields.entries()) as Record<string, string>;

    if (mode === "register" && input.password !== input.confirmPassword) {
      setError("两次输入的密码不一致");
      return;
    }

    const request: Record<string, string> = mode === "register"
      ? { email: input.email, password: input.password, displayName: input.displayName }
      : { email: input.email, password: input.password };

    setPending(true);
    try {
      await signIn(mode, request);
      const requested = new URLSearchParams(window.location.search).get("next");
      const destination = requested?.startsWith("/") && !requested.startsWith("//") && !requested.includes("\\") ? requested : "/account";
      router.replace(destination);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "暂时无法完成操作");
    } finally {
      setPending(false);
    }
  }

  return <main className="auth-page">
    <BrandLogo tone="dark" />
    <section className="auth-shell">
      <aside className="auth-aside">
        <p className="eyebrow">身份档案 · OPC</p>
        <h1>从一次登录<br />开始<span>建立链接</span></h1>
        <p>完善你的行业身份，让有价值的信息和对话更快找到你。</p>
        <div className="auth-index"><b>01</b><span>身份验证</span><b>02</b><span>行业定位</span><b>03</b><span>专业连接</span></div>
      </aside>

      <section className="auth-card" aria-labelledby="auth-heading">
        <div className="auth-tabs">
          <button type="button" className={mode === "login" ? "active" : ""} onClick={() => switchMode("login")}>登录</button>
          <button type="button" className={mode === "register" ? "active" : ""} onClick={() => switchMode("register")}>创建账号</button>
        </div>

        <h2 id="auth-heading">{mode === "login" ? "欢迎回来" : "创建你的 OPC 身份"}</h2>
        <p className="auth-help">{mode === "login" ? "使用你的邮箱和密码继续。" : "我们只收集建立专业档案所需的信息。"}</p>

        <form onSubmit={submit} noValidate>
          {mode === "register" && (
            <label>显示名称<input required name="displayName" minLength={2} maxLength={60} placeholder="例如：王知行" /></label>
          )}
          <label>邮箱<input required name="email" type="email" autoComplete="email" placeholder="name@company.com" /></label>
          <label>
            密码
            <input required name="password" type="password" minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder="至少 8 位，包含字母和数字" />
          </label>

          {mode === "register" && (
            <label>
              确认密码
              <input required name="confirmPassword" type="password" minLength={8} autoComplete="new-password" placeholder="请再次输入密码" />
            </label>
          )}

          {mode === "register" ? (
            <div className="auth-consent">
              <input id="accepted-policies" type="checkbox" checked={acceptedPolicies} onChange={(event) => setAcceptedPolicies(event.target.checked)} aria-required="true" />
              <span><label htmlFor="accepted-policies">我已阅读并同意</label> <Link href="/terms" target="_blank" rel="noopener noreferrer">《用户服务协议》</Link>和<Link href="/privacy" target="_blank" rel="noopener noreferrer">《隐私政策》</Link></span>
            </div>
          ) : (
            <p className="auth-policy-note">登录前可查看 <Link href="/terms" target="_blank" rel="noopener noreferrer">《用户服务协议》</Link>和<Link href="/privacy" target="_blank" rel="noopener noreferrer">《隐私政策》</Link>。</p>
          )}

          {error && <p className="form-error" role="alert">{error}</p>}

          <button className="auth-submit" disabled={pending}>
            {pending ? "正在处理…" : mode === "login" ? "登录并继续" : "创建账号"}
            <span>→</span>
          </button>
        </form>
      </section>
    </section>
  </main>;
}
