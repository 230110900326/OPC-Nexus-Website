import { authorizedRequest } from "./auth";

export type CrawlSourceType = "news" | "policy" | "video" | "rss" | "sitemap";
export type CrawlFetchMethod = "html" | "rss" | "sitemap" | "adapter";
export type CrawlAuthorizationStatus = "pending" | "authorized" | "restricted" | "rejected";

export type CrawlSource = { id: string; name: string; domain: string; type: CrawlSourceType; fetchMethod: CrawlFetchMethod; scheduleMinutes: number; trustLevel: number; authorizationStatus: CrawlAuthorizationStatus; isEnabled: boolean; autoPublish: boolean; entryUrl: string | null; lastCrawledAt: string | null; createdAt: string };
export type CrawlSourceInput = { name: string; domain: string; type: CrawlSourceType; fetchMethod: CrawlFetchMethod; authorizationStatus: CrawlAuthorizationStatus; isEnabled: boolean; autoPublish: boolean; entryUrl?: string };
export type CrawlRunResult = { sourceCount: number; runs: { jobId: string; discovered: number; articles: number; videos: number; duplicates: number; filtered: number; warnings: number; agentVersion: string | null; status: string }[] };

export const getCrawlSources = () => authorizedRequest<CrawlSource[]>("/admin/crawl-sources");
export const createCrawlSource = (input: CrawlSourceInput) => authorizedRequest<CrawlSource>("/admin/crawl-sources", { method: "POST", body: JSON.stringify(input) });
export const updateCrawlSource = (id: string, input: Partial<CrawlSourceInput>) => authorizedRequest<CrawlSource>(`/admin/crawl-sources/${id}`, { method: "PATCH", body: JSON.stringify(input) });
export const runCrawlNow = (sourceId?: string) => authorizedRequest<CrawlRunResult>("/admin/crawl-sources/run", { method: "POST", body: JSON.stringify(sourceId ? { sourceId } : {}) });
