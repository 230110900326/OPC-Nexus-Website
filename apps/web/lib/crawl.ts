import { authorizedRequest } from "./auth";

// ── Types matching the API entities ──

export type CrawlSourceType = "NEWS" | "POLICY" | "RSS" | "SITEMAP";
export type CrawlFetchMethod = "HTML" | "RSS" | "SITEMAP" | "ADAPTER";
export type CrawlAuthorizationStatus = "PENDING" | "AUTHORIZED" | "RESTRICTED" | "REJECTED";

export type CrawlSource = {
  id: string;
  name: string;
  domain: string;
  type: CrawlSourceType;
  fetchMethod: CrawlFetchMethod;
  scheduleMinutes: number;
  trustLevel: number;
  authorizationStatus: CrawlAuthorizationStatus;
  isEnabled: boolean;
  keywords: string[];
  entryUrl: string | null;
  lastCrawledAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CrawlJob = {
  id: string;
  source: CrawlSource;
  status: "queued" | "running" | "succeeded" | "failed";
  queueKey: string | null;
  discoveredCount: number;
  errorMessage: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
};

export type CrawlLog = {
  id: string;
  level: "info" | "warning" | "error";
  message: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

export type ReviewArticle = {
  id: string;
  title: string;
  content: string;
  summary: string | null;
  type: string;
  status: string;
  originalUrl: string;
  canonicalUrl: string | null;
  coverImageUrl: string | null;
  classification: Record<string, number> | null;
  publishedAt: string | null;
  sources: { id: string; name: string; url: string; isPrimary: boolean }[];
  createdAt: string;
  updatedAt: string;
};

// ── DTO types ──

export type CreateCrawlSourceInput = {
  name: string;
  domain: string;
  type: CrawlSourceType;
  fetchMethod: CrawlFetchMethod;
  scheduleMinutes?: number;
  trustLevel?: number;
  authorizationStatus?: CrawlAuthorizationStatus;
  isEnabled?: boolean;
  keywords?: string[];
  entryUrl?: string;
};

export type UpdateCrawlSourceInput = Partial<CreateCrawlSourceInput>;

export type IngestCrawlArticleInput = {
  sourceId: string;
  title: string;
  content: string;
  originalUrl: string;
  canonicalUrl?: string;
  coverImageUrl?: string;
  publishedAt?: string;
  type?: string;
};

// ── API functions ──

export const listCrawlSources = (params?: {
  type?: CrawlSourceType;
  authorizationStatus?: CrawlAuthorizationStatus;
  keyword?: string;
}) => {
  const search = new URLSearchParams();
  if (params?.type) search.set("type", params.type);
  if (params?.authorizationStatus) search.set("authorizationStatus", params.authorizationStatus);
  if (params?.keyword) search.set("keyword", params.keyword);
  const qs = search.toString();
  return authorizedRequest<CrawlSource[]>(`/admin/crawl-sources${qs ? `?${qs}` : ""}`);
};

export const getCrawlKeywords = () =>
  authorizedRequest<string[]>("/admin/crawl-sources/keywords");

export const listCrawlJobs = (sourceId?: string) =>
  authorizedRequest<CrawlJob[]>(`/admin/crawl-sources/jobs${sourceId ? `?sourceId=${sourceId}` : ""}`);

export const listCrawlJobLogs = (jobId: string) =>
  authorizedRequest<CrawlLog[]>(`/admin/crawl-sources/jobs/${jobId}/logs`);

export const createCrawlSource = (input: CreateCrawlSourceInput) =>
  authorizedRequest<CrawlSource>("/admin/crawl-sources", {
    method: "POST",
    body: JSON.stringify(input),
  });

export const updateCrawlSource = (id: string, input: UpdateCrawlSourceInput) =>
  authorizedRequest<CrawlSource>(`/admin/crawl-sources/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });

export const getReviewQueue = () =>
  authorizedRequest<ReviewArticle[]>("/admin/crawl-sources/review/queue");

export const ingestArticle = (input: IngestCrawlArticleInput) =>
  authorizedRequest<{ article: ReviewArticle; duplicateOf: string | null }>(
    "/admin/crawl-sources/review/ingest",
    { method: "POST", body: JSON.stringify(input) }
  );

export const rejectArticle = (id: string) =>
  authorizedRequest<ReviewArticle>(`/admin/crawl-sources/review/${id}/reject`, {
    method: "POST",
  });

export const mergeArticle = (id: string, targetArticleId: string) =>
  authorizedRequest<ReviewArticle>(`/admin/crawl-sources/review/${id}/merge`, {
    method: "POST",
    body: JSON.stringify({ targetArticleId }),
  });

export const recordLinkCheck = (
  id: string,
  payload: { statusCode?: number | null; redirectUrl?: string; errorMessage?: string }
) =>
  authorizedRequest(`/admin/crawl-sources/review/${id}/link-check`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
