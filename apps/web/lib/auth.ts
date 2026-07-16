const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
const accessTokenKey = "opc_access_token";
let refreshPromise: Promise<Account> | null = null;

export type Account = {
  id: string; email: string; displayName: string; avatarUrl: string | null; bio: string | null;
  industry: string | null; company: string | null; jobTitle: string | null; roles: string[];
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
  if (!refreshPromise) {
    refreshPromise = requestSessionRefresh().catch((error) => { clearAccessToken(); throw error; }).finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

export async function authorizedRequest<T>(path: string, options: RequestInit = {}) {
  let token = getAccessToken();
  if (!token) { await refreshSession(); token = getAccessToken(); }
  const response = await fetch(`${apiBaseUrl}${path}`, { ...options, credentials: "include", headers: { "Content-Type": "application/json", ...options.headers, Authorization: `Bearer ${token}` } });
  return parse<T>(response);
}

export async function signOut() {
  const token = getAccessToken();
  if (token) await fetch(`${apiBaseUrl}/auth/logout`, { method: "POST", credentials: "include", headers: { Authorization: `Bearer ${token}` } });
  clearAccessToken();
}
