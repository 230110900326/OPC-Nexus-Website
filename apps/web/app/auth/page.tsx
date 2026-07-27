"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clearAccessToken, signIn } from "../../lib/auth";
import { BrandLogo } from "../../components/brand-logo";
import { apiBaseUrl } from "../../lib/api-base";

type AuthMode = "login" | "register" | "forgot";

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

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function PasswordInput({ name, placeholder, autoComplete, value, onChange, hasError }: {
  name: string; placeholder: string; autoComplete?: string;
  value?: string; onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void; hasError?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="password-wrapper">
      <input
        required name={name} type={show ? "text" : "password"} minLength={8}
        autoComplete={autoComplete} placeholder={placeholder}
        className={hasError ? "has-error" : ""}
        value={value} onChange={onChange}
      />
      <button type="button" className="password-toggle" onClick={() => setShow(!show)}
        aria-label={show ? "隐藏密码" : "显示密码"} tabIndex={-1}>
        {show ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}

function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pending, setPending] = useState(false);
  const [devResetUrl, setDevResetUrl] = useState("");
  const { remaining, start, active } = useCooldown(60);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError(""); setSuccess(""); setDevResetUrl("");

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      setError("请输入有效的邮箱地址"); return;
    }

    setPending(true);
    try {
      // Check if email is registered first
      const checkRes = await fetch(`${apiBaseUrl}/auth/check-email`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail }),
      });
      if (!checkRes.ok) {
        throw new Error("网络错误，请检查连接后重试");
      }
      const checkBody = await checkRes.json().catch(() => ({}));
      const registered = (checkBody as any)?.data?.registered;
      if (!registered) {
        setError("该邮箱尚未注册，请先创建账号");
        setPending(false);
        return;
      }

      // Email registered, send reset
      const res = await fetch(`${apiBaseUrl}/auth/forgot-password`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as any)?.error?.message || "暂时无法发送重置邮件，请稍后再试");
      }
      const body = await res.json().catch(() => ({}));
      const data = (body as any)?.data ?? {};
      setSuccess(data?.message ?? "✅ 如果该邮箱已注册，我们会发送一封密码重置邮件，请查收。");
      if (data?.devResetUrl) setDevResetUrl(data.devResetUrl);
      start();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "网络错误，请检查连接后重试");
    } finally { setPending(false); }
  }

  if (success) {
    return (
      <div style={{ textAlign: "center", padding: "8px 0" }}>
        <div className="form-success" style={{ marginBottom: 16, fontSize: 14 }} role="status">{success}</div>
        {devResetUrl && (
          <div style={{ marginBottom: 16, padding: 14, background: "#fff8e5", border: "1px solid #f0d99a", borderRadius: 4, textAlign: "left" }}>
            <p style={{ margin: "0 0 8px", color: "#7a5d1e", fontSize: 12, fontWeight: 700 }}>🔧 开发模式 — 邮件未实际发送，可直接使用下方链接：</p>
            <a href={devResetUrl} style={{ display: "block", padding: "10px 14px", background: "var(--copper)", color: "#fff", textAlign: "center", borderRadius: 2, fontWeight: 700, fontSize: 13, textDecoration: "none" }}>
              点击重置密码 <span style={{ paddingLeft: 10, fontSize: 16 }}>→</span>
            </a>
            <p style={{ margin: "10px 0 0", color: "var(--ink-soft)", fontSize: 10, wordBreak: "break-all", lineHeight: 1.5 }}>
              链接：{devResetUrl}
            </p>
          </div>
        )}
        {!devResetUrl && (
          <p style={{ color: "var(--ink-soft)", fontSize: 13, lineHeight: 1.7, margin: "0 0 20px" }}>
            未收到邮件？请检查垃圾邮件箱，或等待 1 分钟后重新发送。
          </p>
        )}
        {active && (
          <p style={{ textAlign: "center", color: "var(--ink-soft)", fontSize: 13, margin: "0 0 12px" }}>
            {remaining} 秒后可重新发送
          </p>
        )}
        <button className="auth-submit" style={{ maxWidth: 260, margin: "0 auto" }} disabled={active} onClick={() => { setSuccess(""); setError(""); setDevResetUrl(""); }}>
          重新发送重置邮件
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <label className={error ? "has-error" : ""}>邮箱
        <input required name="email" type="email" autoComplete="email" placeholder="name@company.com"
          className={error ? "has-error" : ""}
          value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }} />
      </label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="auth-submit" disabled={pending}>
        {pending ? <><span className="forgot-spinner" /> 检测中…</> : "发送重置邮件"}
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
    if (!input.email?.trim() || !emailRegex.test(input.email.trim())) errs.email = "请输入有效的邮箱地址";
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

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setSuccess(""); setFieldErrors({});

    if (mode === "register" && !acceptedPolicies) {
      setError("请先阅读并同意用户服务协议和隐私政策");
      return;
    }

    const fields = new FormData(event.currentTarget);
    const input = Object.fromEntries(fields.entries()) as Record<string, string>;

    // Email validation for login mode
    if (mode === "login") {
      const emailErr: Record<string, string> = {};
      if (!input.email?.trim() || !emailRegex.test(input.email.trim())) {
        emailErr.email = "请输入有效的邮箱地址";
      }
      if (!input.password || input.password.length < 8) {
        emailErr.password = "密码至少 8 位";
      }
      if (Object.keys(emailErr).length > 0) {
        setFieldErrors(emailErr);
        return;
      }
    }

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
        // Check email registered first
        const checkRes = await fetch(`${apiBaseUrl}/auth/check-email`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: input.email.trim() }),
        });
        if (!checkRes.ok) throw new Error("网络错误");
        const checkBody = await checkRes.json().catch(() => ({}));
        if (!(checkBody as any)?.data?.registered) {
          setError("该邮箱尚未注册，请先创建账号");
          setPending(false);
          return;
        }
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

      if (mode === "register") {
        await signIn("register", request);
        clearAccessToken();
        setMode("login");
        setRegisterStep("role");
        if (registerRole === "researcher") {
          setSuccess("注册申请已提交！请等待运营审核，审核通过后即可登录。");
        } else {
          setSuccess("注册成功！请登录你的账号。");
        }
        return;
      }
      await signIn("login", request);
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
    : mode === "register" ? { heading: <>创建<span>你的</span><br />OPC 身份</>, desc: "面向财经、产业、投资与企业经营者的专业内容与交流平台。" }
    : { heading: <>判断<br />不止<span>于此</span></>, desc: "不止于信息，还有连接；不止于观点，还有证据；不止于判断，还有同行。" };

  return <main className="auth-page">
    <BrandLogo tone="dark" />
    <section className={`auth-shell${mode === "register" ? " auth-shell-register" : ""}`}>
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
            <label className={fieldErrors.email ? "has-error" : ""}>
              邮箱
              <input required name="email" type="email" autoComplete="email" placeholder="name@company.com"
                className={fieldErrors.email ? "has-error" : ""} />
            </label>
            {fieldErrors.email && <span className="auth-field-error">{fieldErrors.email}</span>}
            <label className={fieldErrors.password ? "has-error" : ""}>
              密码
              <div className="password-wrapper">
                <PasswordInput name="password" placeholder="至少 8 位" autoComplete="current-password" hasError={!!fieldErrors.password} />
              </div>
            </label>
            {fieldErrors.password && <span className="auth-field-error">{fieldErrors.password}</span>}
            <p className="auth-policy-note">登录前可查看 <Link href="/terms" target="_blank" rel="noopener noreferrer">《用户服务协议》</Link>和<Link href="/privacy" target="_blank" rel="noopener noreferrer">《隐私政策》</Link>。</p>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="auth-submit" disabled={pending}>{pending ? "处理中…" : "登录"}</button>
          </form>
          <p className="auth-switch-hint">
            还没有账号？<button type="button" onClick={() => switchMode("register")}>立即注册</button>
            <span className="auth-switch-sep">|</span>
            <button type="button" onClick={() => switchMode("forgot")}>忘记密码？</button>
          </p>
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
                <label className={`form-label-required${fieldErrors.password ? " has-error" : ""}`}><span>密码<span className="required-mark">*</span></span>
                  <PasswordInput name="password" placeholder="至少 8 位，包含字母和数字" autoComplete="new-password" hasError={!!fieldErrors.password} />
                </label>
                {fieldErrors.password && <span className="auth-field-error">{fieldErrors.password}</span>}
                <label className={`form-label-required${fieldErrors.confirmPassword ? " has-error" : ""}`}><span>确认密码<span className="required-mark">*</span></span>
                  <PasswordInput name="confirmPassword" placeholder="请再次输入密码" autoComplete="new-password" hasError={!!fieldErrors.confirmPassword} />
                </label>
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
    </section>
  </main>;
}
