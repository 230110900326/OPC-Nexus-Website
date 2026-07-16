import { authorizedRequest } from "./auth";
import { FeedItem } from "./ranking";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
type Envelope<T> = { success: boolean; data?: T; error?: { message?: string } };

export type HomepageConfigKind = "banner" | "module" | "recommendation";
export type HomepageModuleKey = "focus" | "recommendations" | "policies" | "videos" | "discussions" | "events" | "creators";
export type HomepagePublicConfig = {
  id: string; trackingId: string; kind: HomepageConfigKind; moduleKey: HomepageModuleKey; title: string; subtitle: string | null;
  targetUrl: string | null; imageUrl: string | null; displayPosition: string; sortOrder: number; contentType: string | null; contentId: string | null;
  config: Record<string, unknown>;
};
export type HomepageModule = { moduleKey: Exclude<HomepageModuleKey, "focus">; title: string; displayPosition: string; sortOrder: number; config: Record<string, unknown>; source: "default" | "configured" };
export type HomepageEvent = { id: string; title: string; description: string; coverUrl: string | null; locationName: string; startsAt: string; endsAt: string; registrationDeadline: string | null; capacity: number | null; registrationCount: number; organizer: { id: string; displayName: string }; url: string };
export type HomepageCreator = { id: string; name: string; avatarUrl: string | null; industries: string[]; trustLevel: number; platforms: string[] };
export type HomepageData = {
  generatedAt: string; banners: HomepagePublicConfig[]; modules: HomepageModule[]; manualRecommendations: HomepagePublicConfig[];
  sections: { recommendations: FeedItem[]; policies: FeedItem[]; videos: FeedItem[]; discussions: FeedItem[]; events: HomepageEvent[]; creators: HomepageCreator[] };
};

export type AdminHomepageConfig = {
  id: string; kind: HomepageConfigKind; moduleKey: HomepageModuleKey; title: string; subtitle: string | null; targetUrl: string | null; imageUrl: string | null;
  displayPosition: string; sortOrder: number; contentType: string | null; contentId: string | null; effectiveFrom: string | null; effectiveTo: string | null;
  isOnline: boolean; config: Record<string, unknown>; createdAt: string; updatedAt: string;
};
export type HomepageConfigInput = Omit<AdminHomepageConfig, "id" | "createdAt" | "updatedAt" | "config"> & { config?: Record<string, unknown> };

export type DashboardData = {
  range: { from: string; to: string };
  summary: { newUsers: number; activeUsers: number; reads: number; posts: number; interactions: number; eventRegistrations: number; crawlSuccessRate: number; recommendationImpressions: number; recommendationClicks: number; recommendationCtr: number };
  popularContent: { contentType: string; contentId: string; title: string; url: string; reads: number; interactions: number; score: number }[];
  series: { date: string; newUsers: number; posts: number; interactions: number; eventRegistrations: number; recommendationClicks: number }[];
};

export type AuditAction = "admin.login" | "content.create" | "content.edit" | "content.submit" | "content.publish" | "content.offline" | "content.restore" | "moderation.review" | "user.ban" | "ranking.weight_adjust" | "homepage.config_create" | "homepage.config_update" | "homepage.config_delete";
export type AuditLog = { id: string; actorName: string; actorEmail: string; action: AuditAction; targetType: string | null; targetId: string | null; metadata: Record<string, unknown>; createdAt: string };
export type AuditLogPage = { items: AuditLog[]; pagination: { page: number; limit: number; total: number; totalPages: number } };

async function publicRequest<T>(path: string, options?: RequestInit) {
  const response = await fetch(`${apiBaseUrl}${path}`, { cache: "no-store", ...options, headers: { "Content-Type": "application/json", ...options?.headers } });
  const body = await response.json() as Envelope<T>;
  if (!response.ok || !body.success || body.data === undefined) throw new Error(body.error?.message ?? "请求未能完成");
  return body.data;
}

export const getHomepage = () => publicRequest<HomepageData>("/homepage");
export const trackRecommendation = (configIds: string[], eventType: "impression" | "click") => publicRequest<{ recorded: number }>("/homepage/recommendation-events", { method: "POST", keepalive: true, body: JSON.stringify({ configIds, eventType, pagePath: "/" }) });
export const getHomepageConfigs = () => authorizedRequest<AdminHomepageConfig[]>("/admin/homepage/configs");
export const createHomepageConfig = (input: HomepageConfigInput) => authorizedRequest<AdminHomepageConfig>("/admin/homepage/configs", { method: "POST", body: JSON.stringify(input) });
export const updateHomepageConfig = (id: string, input: Partial<HomepageConfigInput>) => authorizedRequest<AdminHomepageConfig>(`/admin/homepage/configs/${id}`, { method: "PATCH", body: JSON.stringify(input) });
export const deleteHomepageConfig = (id: string) => authorizedRequest<{ deleted: boolean }>(`/admin/homepage/configs/${id}`, { method: "DELETE" });
export const getOperationsDashboard = (from: string, to: string) => authorizedRequest<DashboardData>(`/admin/operations/dashboard?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
export function getAuditLogs(query: { actor?: string; action?: string; from?: string; to?: string; page?: number }) { const params = new URLSearchParams(); Object.entries(query).forEach(([key, value]) => { if (value !== undefined && value !== "") params.set(key, String(value)); }); return authorizedRequest<AuditLogPage>(`/admin/audit-logs?${params}`); }
