"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createDemoSession, DEMO_ACCOUNTS, signIn } from "../../lib/auth";
import { BrandLogo } from "../../components/brand-logo";

type AuthMode = "login" | "register" | "forgot" | "demo";
const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

function useCooldown(seconds: number) {
  const [remaining, setRemaining] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const start = useCallback(() => {
    setRemaining(seconds);
    timerRef.current = setInterval(() => setRemaining((prev) => {
      if (prev <= 1) { if (timerRef.current) clearInterval(timerRef.current); return 0; }
      return prev - 1;
    }), 1000);
  }, [seconds]);
  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);
  return { remaining, start, active: remaining > 0 };
}

function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pending, setPending] = useState(false);
  const { remaining, start, active } = useCooldown(60);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError(""); setSuccess("");
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("请输入有效的邮箱地址"); return;
    }
    setPending(true);
    try {
      const res = await fetch(`${apiBaseUrl}/auth/forgot-password`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as any)?.error?.message || "暂时无法发送重置邮件，请稍后再试");
      }
      setSuccess("✅ 如果该邮箱已注册，我们会发送一封密码重置邮件，请查收。");
      start();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "网络错误，请检查连接后重试");
    } finally { setPending(false); }
  }

  if (success) {
    return (
      <div style={{ textAlign: "center", padding: "8px 0" }}>
        <div className="form-success" style={{ marginBottom: 16, fontSize: 14 }} role="status">{success}</div>
        <p style={{ color: "var(--ink-soft)", fontSize: 13, lineHeight: 1.7, margin: "0 0 20px" }}>
          未收到邮件？请检查垃圾邮件箱，或等待 1 分钟后重新发送。
        </p>
        <button className="auth-submit" style={{ maxWidth: 260, margin: "0 auto" }} disabled={active} onClick={() => { setSuccess(""); setError(""); }}>
          {active ? `${remaining} 秒后可重新发送` : "重新发送重置邮件"}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <label>邮箱<input required name="email" type="email" autoComplete="email" placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="auth-submit" disabled={pending}>
        {pending ? <><span className="forgot-spinner" /> 发送中…</> : "发送重置邮件"}
      </button>
    </form>
  );
}

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("login");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pending, setPending] = useState(false);
  const [acceptedPolicies, setAcceptedPolicies] = useState(false);
  const [registerRole, setRegisterRole] = useState<"user" | "researcher">("user");
  const [registerStep, setRegisterStep] = useState<"role" | "details" | "certification">("role");
  const [noticeDismissed, setNoticeDismissed] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function clearFieldErrors() { setFieldErrors({}); setError(""); }

  function validateStep2(input: Record<string, string>): boolean {
    const errs: Record<string, string> = {};
    if (!input.displayName?.trim() || input.displayName.trim().length < 2) errs.displayName = "请输入至少 2 个字符的用户名";
    if (!input.email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) errs.email = "请输入有效的邮箱地址";
    if (!input.password || input.password.length < 8) errs.password = "密码至少 8 位";
    else if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(input.password)) errs.password = "密码需同时包含字母和数字";
    if (input.password !== input.confirmPassword) errs.confirmPassword = "两次输入的密码不一致";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function validateStep3(input: Record<string, string>): boolean {
    const errs: Record<string, string> = {};
    if (!input.company?.trim() || input.company.trim().length < 2) errs.company = "请输入所在公司";
    if (!input.jobTitle?.trim() || input.jobTitle.trim().length < 2) errs.jobTitle = "请输入职位";
    if (!input.industry?.trim() || input.industry.trim().length < 2) errs.industry = "请输入所属行业";
    if (!input.bio?.trim() || input.bio.trim().length < 10) errs.bio = "认证说明至少 10 个字符";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError("");
    setSuccess("");
    setFieldErrors({});
    setNoticeDismissed(false);
    if (nextMode === "register") { setRegisterRole("user"); setRegisterStep("role"); }
  }

  function handleDemoLogin(role: keyof typeof DEMO_ACCOUNTS) {
    createDemoSession(role);
    const dest = new URLSearchParams(window.location.search).get("next");
    router.replace(dest?.startsWith("/") && !dest.startsWith("//") && !dest.includes("\\") ? dest : "/");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setSuccess(""); setFieldErrors({});

    if (mode === "register" && !acceptedPolicies) {
      setError("请先阅读并同意用户服务协议和隐私政策");
      return;
    }

    const fields = new FormData(event.currentTarget);
    const input = Object.fromEntries(fields.entries()) as Record<string, string>;

    // Per-field validation for registration
    if (mode === "register") {
      if (!validateStep2(input)) {
        if (registerRole === "researcher") setRegisterStep("details");
        return;
      }
      if (registerRole === "researcher" && !validateStep3(input)) {
        setRegisterStep("certification");
        return;
      }
    }

    setPending(true);

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

      const request: Record<string, string> = mode === "register"
        ? { email: input.email, password: input.password, displayName: input.displayName, role: registerRole }
        : { email: input.email, password: input.password };

      if (mode === "register" && registerRole === "researcher") {
        request.company = input.company.trim();
        request.jobTitle = input.jobTitle.trim();
        request.industry = input.industry.trim();
        request.bio = input.bio.trim();
      }

      await signIn(mode as "login" | "register", request);
      const dest = new URLSearchParams(window.location.search).get("next");
      router.replace(dest?.startsWith("/") && !dest.startsWith("//") && !dest.includes("\\") ? dest : "/");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "暂时无法完成操作");
    } finally {
      setPending(false);
    }
  }

  const aside =
    mode === "forgot" ? { heading: <>找回<br />你的<span>密码</span></>, desc: "输入注册邮箱，我们会发送一封密码重置邮件。" }
    : mode === "demo" ? { heading: <>预览<br /><span>演示</span>账号</>, desc: "选择一个预览账号快速体验平台的全部功能。" }
    : mode === "register" ? { heading: <>创建<span>你的</span><br />OPC 身份</>, desc: "面向财经、产业、投资与企业经营者的专业内容与交流平台。" }
    : { heading: <>判断<br />不止<span>于此</span></>, desc: "不止于信息，还有连接；不止于观点，还有证据；不止于判断，还有同行。" };

  const demoAccounts = [
    { role: "user" as const, label: "普通用户", desc: "可浏览内容、收藏、发布需求与对接" },
    { role: "partner" as const, label: "产业协作者", desc: "可协作访谈、提交案例与对接需求" },
    { role: "operator" as const, label: "运营管理员", desc: "可管理内容、审核需求、配置运营台" },
  ];

  return <main className="auth-page">
    <BrandLogo tone="dark" />
    <section className={`auth-shell${mode === "register" ? " auth-shell-register" : mode === "demo" ? " auth-shell-demo" : ""}`}>
      <aside className={`auth-aside${mode === "register" ? " auth-aside-register" : ""}`}>
        <div className="auth-brand-panel">
          <p className="eyebrow">OPC NEXUS</p>
          <h1>{aside.heading}</h1>
          <p>{aside.desc}</p>
          <p className="auth-tagline-en">Perceive trends, Partner peers, Progress profits.</p>
          <p className="auth-tagline-zh">洞察先机，联结聚力，增长不息</p>
        </div>
      </aside>

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
            <span className="auth-switch-sep">|</span>
            <button type="button" onClick={() => switchMode("forgot")}>忘记密码？</button>
          </p>
          <div className="auth-demo-separator"><span>或</span></div>
          <button className="auth-demo-entry" type="button" onClick={() => switchMode("demo")}>🔍 离线预览 Demo</button>
        </section>
      )}

      {/* ═══════════ 注册 ═══════════ */}
      {mode === "register" && (
        <section className="auth-card auth-card-register" aria-label="注册">

          {/* ── 第 1 步：选择身份 ── */}
          {registerStep === "role" && <>
            <h2>注册</h2>
            <p className="auth-help">选择你的 OPC 身份</p>

            {/* ── 步骤指示器（第一步也显示） ── */}
            {registerRole === "researcher" ? (
              <div className="register-steps">
                <span className="step-dot active">1</span>
                <span className="step-label active">选择身份</span>
                <span className="step-arrow">→</span>
                <span className="step-dot">2</span>
                <span className="step-label">基本信息</span>
                <span className="step-arrow">→</span>
                <span className="step-dot">3</span>
                <span className="step-label">认证资料</span>
              </div>
            ) : (
              <div className="register-steps">
                <span className="step-dot active">1</span>
                <span className="step-label active">选择身份</span>
                <span className="step-arrow">→</span>
                <span className="step-dot">2</span>
                <span className="step-label">填写资料</span>
              </div>
            )}

            <fieldset className="register-role-fieldset">
              <legend className="register-role-legend">选择身份</legend>
              <div className="register-role-cards">
                <label className={`register-role-card${registerRole === "user" ? " selected" : ""}`}>
                  <input type="radio" name="role" value="user" checked={registerRole === "user"} onChange={() => setRegisterRole("user")} />
                  <span className="register-role-emoji">🧑‍💼</span>
                  <span className="register-role-title">普通用户</span>
                  <span className="register-role-desc">浏览内容、参与讨论、发布需求</span>
                </label>
                <label className={`register-role-card${registerRole === "researcher" ? " selected" : ""}`}>
                  <input type="radio" name="role" value="researcher" checked={registerRole === "researcher"} onChange={() => setRegisterRole("researcher")} />
                  <span className="register-role-emoji">🔬</span>
                  <span className="register-role-title">产业研究员</span>
                  <span className="register-role-desc">协作访谈、提交案例、专业认证</span>
                  <span className="register-role-badge">需审核认证</span>
                </label>
              </div>
            </fieldset>
            {registerRole === "researcher" && !noticeDismissed && (
              <div className="auth-approval-notice">
                <span>⏳ 注册后需等待运营审核认证，审核通过后方可登录使用。</span>
                <button type="button" className="notice-dismiss" onClick={() => setNoticeDismissed(true)} aria-label="关闭提示">✕</button>
              </div>
            )}
            <div className="register-step-spacer" />
            <button type="button" className="register-step-btn primary" onClick={() => setRegisterStep("details")}>
              下一步 →
            </button>
          </>}

          {/* ── 第 2+3 步共用表单 ── */}
          {(registerStep === "details" || registerStep === "certification") && (
            <form onSubmit={submit} noValidate>

              {/* ── 步骤指示器 ── */}
              {registerRole === "researcher" ? (
                <div className="register-steps">
                  <span className="step-dot done" aria-label="已完成">✓</span>
                  <span className="step-label">选择身份</span>
                  <span className="step-arrow">→</span>
                  <span className={`step-dot${registerStep === "details" ? " active" : " done"}`}>{registerStep === "details" ? "2" : "✓"}</span>
                  <span className={`step-label${registerStep === "details" ? " active" : ""}`}>基本信息</span>
                  <span className="step-arrow">→</span>
                  <span className={`step-dot${registerStep === "certification" ? " active" : ""}`}>3</span>
                  <span className={`step-label${registerStep === "certification" ? " active" : ""}`}>认证资料</span>
                </div>
              ) : (
                <div className="register-steps">
                  <span className="step-dot done" aria-label="已完成">✓</span>
                  <span className="step-label">选择身份</span>
                  <span className="step-arrow">→</span>
                  <span className="step-dot active">2</span>
                  <span className="step-label active">填写资料</span>
                </div>
              )}

              {/* ── 返回按钮 ── */}
              <button type="button" className="register-back-link" onClick={() => {
                clearFieldErrors();
                if (registerStep === "certification") setRegisterStep("details");
                else setRegisterStep("role");
              }}>← 上一步</button>

              {/* ── 第 2 步：基本信息（所有角色） ── */}
              <div style={registerStep === "details" ? undefined : { display: "none" }}>
                <label className={`form-label-required${fieldErrors.displayName ? " has-error" : ""}`}><span>用户名<span className="required-mark">*</span></span><input required name="displayName" minLength={2} maxLength={60} placeholder="例如：王知行" /></label>
                {fieldErrors.displayName && <span className="auth-field-error">{fieldErrors.displayName}</span>}
                <label className={`form-label-required${fieldErrors.email ? " has-error" : ""}`}><span>邮箱<span className="required-mark">*</span></span><input required name="email" type="email" autoComplete="email" placeholder="name@company.com" /></label>
                {fieldErrors.email && <span className="auth-field-error">{fieldErrors.email}</span>}
                <label className={`form-label-required${fieldErrors.password ? " has-error" : ""}`}><span>密码<span className="required-mark">*</span></span><input required name="password" type="password" minLength={8} autoComplete="new-password" placeholder="至少 8 位，包含字母和数字" /></label>
                {fieldErrors.password && <span className="auth-field-error">{fieldErrors.password}</span>}
                <label className={`form-label-required${fieldErrors.confirmPassword ? " has-error" : ""}`}><span>确认密码<span className="required-mark">*</span></span><input required name="confirmPassword" type="password" minLength={8} autoComplete="new-password" placeholder="请再次输入密码" /></label>
                {fieldErrors.confirmPassword && <span className="auth-field-error">{fieldErrors.confirmPassword}</span>}
              </div>

              {/* ── 第 3 步：认证资料（仅研究员） ── */}
              {registerStep === "certification" && <>
                <div className="auth-approval-notice">
                  <span>⏳ 以下信息将用于运营团队审核你的产业研究员认证。</span>
                </div>
                <label className={`form-label-required${fieldErrors.company ? " has-error" : ""}`}><span>所在公司<span className="required-mark">*</span></span><input required name="company" minLength={2} maxLength={120} placeholder="例如：中金公司" /></label>
                {fieldErrors.company && <span className="auth-field-error">{fieldErrors.company}</span>}
                <label className={`form-label-required${fieldErrors.jobTitle ? " has-error" : ""}`}><span>职位<span className="required-mark">*</span></span><input required name="jobTitle" minLength={2} maxLength={80} placeholder="例如：高级研究员" /></label>
                {fieldErrors.jobTitle && <span className="auth-field-error">{fieldErrors.jobTitle}</span>}
                <label className={`form-label-required${fieldErrors.industry ? " has-error" : ""}`}><span>所属行业<span className="required-mark">*</span></span><input required name="industry" minLength={2} maxLength={80} placeholder="例如：金融、新能源、医疗健康" /></label>
                {fieldErrors.industry && <span className="auth-field-error">{fieldErrors.industry}</span>}
                <label className={`form-label-required${fieldErrors.bio ? " has-error" : ""}`}><span>认证说明<span className="required-mark">*</span></span><textarea required name="bio" minLength={10} maxLength={280} rows={3} placeholder="简要说明你的研究方向、从业经历或专业资质，供运营团队审核。" /></label>
                {fieldErrors.bio && <span className="auth-field-error">{fieldErrors.bio}</span>}
              </>}

              {/* ── 普通用户第 2 步直接提交；研究员第 2 步进第 3 步 ── */}
              {registerStep === "details" && registerRole === "user" ? (
                <>
                  <div className="auth-consent">
                    <input id="accepted-policies" type="checkbox" checked={acceptedPolicies} onChange={(e) => setAcceptedPolicies(e.target.checked)} aria-required="true" />
                    <span><label htmlFor="accepted-policies">我已阅读并同意</label> <Link href="/terms" target="_blank" rel="noopener noreferrer">《用户服务协议》</Link>和<Link href="/privacy" target="_blank" rel="noopener noreferrer">《隐私政策》</Link></span>
                  </div>
                  {error && <p className="form-error" role="alert">{error}</p>}
                  <button className="auth-submit" disabled={pending}>{pending ? "处理中…" : "注册"}</button>
                </>
              ) : registerStep === "details" ? (
                <button type="button" className="register-step-btn primary" onClick={() => {
                  const fields = new FormData(document.querySelector<HTMLFormElement>(".auth-card-register form")!);
                  const input = Object.fromEntries(fields.entries()) as Record<string, string>;
                  if (validateStep2(input)) setRegisterStep("certification");
                }}>
                  下一步 →
                </button>
              ) : (
                <>
                  <div className="auth-consent">
                    <input id="accepted-policies" type="checkbox" checked={acceptedPolicies} onChange={(e) => setAcceptedPolicies(e.target.checked)} aria-required="true" />
                    <span><label htmlFor="accepted-policies">我已阅读并同意</label> <Link href="/terms" target="_blank" rel="noopener noreferrer">《用户服务协议》</Link>和<Link href="/privacy" target="_blank" rel="noopener noreferrer">《隐私政策》</Link></span>
                  </div>
                  {error && <p className="form-error" role="alert">{error}</p>}
                  <button className="auth-submit" disabled={pending}>{pending ? "处理中…" : "注册"}</button>
                </>
              )}
            </form>
          )}

          <p className="auth-switch-hint">已有账号？<button type="button" onClick={() => switchMode("login")}>立即登录</button></p>
        </section>
      )}

      {/* ═══════════ 找回密码 ═══════════ */}
      {mode === "forgot" && (
        <section className="auth-card" aria-label="找回密码">
          <h2>找回密码</h2>
          <p className="auth-help">输入你的注册邮箱，我们将发送重置链接到你的邮箱。</p>
          <ForgotPasswordForm />
          <p className="auth-switch-hint"><button type="button" onClick={() => switchMode("login")}>← 返回登录</button></p>
        </section>
      )}

      {/* ═══════════ Demo 预览 ═══════════ */}
      {mode === "demo" && (
        <section className="auth-card auth-card-demo" aria-label="Demo 预览">
          <h2>🔍 离线预览 Demo</h2>
          <p className="auth-help">无需后端 API，直接预览平台功能和已登录状态界面。</p>
          <div className="demo-account-list">
            {demoAccounts.map((acct) => (
              <button
                key={acct.role}
                className="demo-account-card"
                type="button"
                onClick={() => handleDemoLogin(acct.role)}
              >
                <span className="demo-account-avatar">{DEMO_ACCOUNTS[acct.role].displayName.slice(0, 1)}</span>
                <div className="demo-account-info">
                  <strong>{DEMO_ACCOUNTS[acct.role].displayName}</strong>
                  <span className="demo-account-email">{DEMO_ACCOUNTS[acct.role].email}</span>
                  <span className="demo-account-roles">{acct.label} — {acct.desc}</span>
                </div>
                <svg className="demo-account-arrow" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M9 18l6-6-6-6" stroke="currentColor" fill="none" strokeWidth="2"/></svg>
              </button>
            ))}
          </div>
          <p className="auth-demo-note">💡 Demo 模式将数据保存在浏览器本地，无需连接后端 API。退出登录后数据自动清除。如需完整的注册/登录功能，请在本地 Docker 环境中运行。</p>
          <p className="auth-switch-hint"><button type="button" onClick={() => switchMode("login")}>← 返回登录</button></p>
        </section>
      )}
    </section>
  </main>;
}
