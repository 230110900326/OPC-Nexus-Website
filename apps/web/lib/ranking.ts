import { authorizedRequest } from "./auth";
import { apiBaseUrl } from "./api-base";
type Envelope<T> = { success: boolean; data?: T; error?: { message?: string } };
export type FeedItem = { id: string; contentType: "article" | "policy" | "video" | "post" | "demand"; title: string; excerpt: string; url: string; coverImageUrl: string | null; source: string; industry: string | null; publishedAt: string; heat: number; reason: string; metrics: { likes: number; comments: number; favorites: number; shares: number; reads: number }; rank?: number; previousRank?: number | null; updatedAt?: string };
export type PaginationMeta = { page: number; limit: number; total: number; totalPages: number };
export type PaginatedFeed = { items: FeedItem[]; pagination: PaginationMeta };
async function request<T>(path: string) { const response = await fetch(`${apiBaseUrl}${path}`, { cache: "no-store" }); const body = await response.json() as Envelope<T>; if (!response.ok || !body.success || body.data === undefined) throw new Error(body.error?.message ?? "内容暂时无法加载"); return body.data; }
function paginationQuery(input: Record<string, string | number | undefined>) { const params = new URLSearchParams(); Object.entries(input).forEach(([key, value]) => { if (value !== undefined && value !== "") params.set(key, String(value)); }); return params.toString(); }
export const getFeed = (mode: string, scope = "all", industry = "", page = 1, limit = 20) => { const params = paginationQuery({ mode, scope, industry, page, limit }); return mode === "following" ? authorizedRequest<PaginatedFeed>(`/feeds/following?${params}`) : request<PaginatedFeed>(`/feeds?${params}`); };
export const getRankings = (scope: string, window: string, industry = "", page = 1, limit = 20) => { const params = paginationQuery({ scope, window, industry, page, limit }); return request<PaginatedFeed>(`/rankings?${params}`); };
