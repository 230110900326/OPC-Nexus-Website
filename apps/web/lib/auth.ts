const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
const accessTokenKey = "opc_access_token";
const demoUserKey = "opc_demo_user";
let refreshPromise: Promise<Account> | null = null;

export type Account = {
  id: string; email: string; displayName: string; avatarUrl: string | null; bio: string | null;
  industry: string | null; company: string | null; jobTitle: string | null; roles: string[];
  certificationStatus: string | null;
};

type ApiEnvelope<T> = { success: boolean; data?: T; error?: { message?: string } };

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "ApiError";
  }
}

export function isUnauthorizedError(reason: unknown): reason is ApiError {
  return reason instanceof ApiError && reason.status === 401;
}

async function parse<T>(response: Response): Promise<T> {
  const body = await response.json() as ApiEnvelope<T>;
  if (!response.ok || !body.success || body.data === undefined) throw new ApiError(body.error?.message ?? "请求未能完成", response.status);
  return body.data;
}

export function getAccessToken() { return typeof window === "undefined" ? null : sessionStorage.getItem(accessTokenKey); }
export function setAccessToken(token: string) { sessionStorage.setItem(accessTokenKey, token); }
export function clearAccessToken() { sessionStorage.removeItem(accessTokenKey); }

// ─── Demo accounts (for Vercel preview without API backend) ───

export const DEMO_ACCOUNTS: Record<string, Account> = {
  user: {
    id: "demo-user-001", email: "preview@opc.local", displayName: "OPC 研究员",
    avatarUrl: null, bio: "仅用于预览的演示作者", industry: "人工智能",
    company: "OPC Nexus", jobTitle: "行业研究", roles: ["user"],
    certificationStatus: null,
  },
  partner: {
    id: "demo-user-002", email: "partner@opc.local", displayName: "产业协作者",
    avatarUrl: null, bio: "本地预览的供给方账号", industry: "先进制造",
    company: "独立顾问", jobTitle: "产业访谈顾问", roles: ["user"],
    certificationStatus: null,
  },
  operator: {
    id: "demo-user-003", email: "operator@opc.local", displayName: "OPC 运营员",
    avatarUrl: null, bio: "本地预览运营账号", industry: "财经科技",
    company: "OPC Nexus", jobTitle: "内容运营", roles: ["user", "editor", "moderator", "operator"],
    certificationStatus: null,
  },
};

export function createDemoSession(role: keyof typeof DEMO_ACCOUNTS): Account {
  const account = DEMO_ACCOUNTS[role];
  sessionStorage.setItem(demoUserKey, JSON.stringify(account));
  setAccessToken("demo-token");
  return account;
}

export function getDemoUser(): Account | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(demoUserKey);
  if (!raw) return null;
  try { return JSON.parse(raw) as Account; } catch { return null; }
}

export function isDemoSession(): boolean { return typeof window !== "undefined" && sessionStorage.getItem(accessTokenKey) === "demo-token" && sessionStorage.getItem(demoUserKey) !== null; }

// ─── Real API auth ───

export async function signIn(path: "login" | "register", input: Record<string, string>) {
  const response = await fetch(`${apiBaseUrl}/auth/${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(input) });
  const data = await parse<{ accessToken: string; user: Account }>(response);
  setAccessToken(data.accessToken);
  return data.user;
}

async function requestSessionRefresh() {
  const response = await fetch(`${apiBaseUrl}/auth/refresh`, { method: "POST", credentials: "include" });
  const data = await parse<{ accessToken: string; user: Account }>(response);
  setAccessToken(data.accessToken);
  return data.user;
}

export function refreshSession(): Promise<Account> {
  // If demo mode, return the demo user immediately
  if (isDemoSession()) {
    const user = getDemoUser();
    if (user) return Promise.resolve(user);
  }
  if (!refreshPromise) {
    refreshPromise = requestSessionRefresh().catch((error) => { clearAccessToken(); throw error; }).finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

export async function authorizedRequest<T>(path: string, options: RequestInit = {}) {
  // Demo mode: return mock data
  if (isDemoSession()) {
    const user = getDemoUser();
    if (path === "/users/me" && options.method === "PATCH") {
      // Update demo user with form data
      const body = JSON.parse(options.body as string || "{}");
      const updated = { ...user!, displayName: body.displayName || user!.displayName, industry: body.industry ?? user!.industry, company: body.company ?? user!.company, jobTitle: body.jobTitle ?? user!.jobTitle, avatarUrl: body.avatarUrl ?? user!.avatarUrl, bio: body.bio ?? user!.bio };
      sessionStorage.setItem(demoUserKey, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent("opc:demo-user-updated", { detail: updated }));
      return updated as T;
    }
    if (path === "/users/me") return user as T;
    throw new ApiError("Demo 模式不支持此操作", 400);
  }

  let token = getAccessToken();
  if (!token) { await refreshSession(); token = getAccessToken(); }
  const response = await fetch(`${apiBaseUrl}${path}`, { ...options, credentials: "include", headers: { "Content-Type": "application/json", ...options.headers, Authorization: `Bearer ${token}` } });
  return parse<T>(response);
}

export async function signOut() {
  if (isDemoSession()) {
    sessionStorage.removeItem(demoUserKey);
  } else {
    const token = getAccessToken();
    if (token) await fetch(`${apiBaseUrl}/auth/logout`, { method: "POST", credentials: "include", headers: { Authorization: `Bearer ${token}` } });
  }
  clearAccessToken();
}
