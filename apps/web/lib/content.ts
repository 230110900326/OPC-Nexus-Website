import { authorizedRequest, getAccessToken, refreshSession } from "./auth";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
export type ArticleType = "news" | "policy" | "insight";
export type ArticleStatus = "draft" | "review" | "published" | "offline";
export type Tag = { id: string; name: string; slug: string };
export type Category = { id: string; name: string; slug: string; sortOrder?: number; isActive?: boolean; children?: Category[] };
export type Source = { id?: string; name: string; url: string; isPrimary: boolean };
export type Article = { id: string; slug: string; title: string; summary: string; coverImageUrl: string | null; type: ArticleType; status: ArticleStatus; originalUrl: string; publishedAt: string | null; heatScore: number | string; category: Category | null; tags: Tag[]; sources: Source[]; policyIssuer: string | null; policyNumber: string | null; effectiveDate: string | null; applicableRegion: string | null; policyStatus: string | null; policyHighlights: string | null; impactIndustries: string | null; related?: Article[] };
export type ArticleList = { items: Article[]; pagination: { page: number; limit: number; total: number; totalPages: number } };
export type SearchResult = { id: string; contentType: "article" | "post" | "video"; subtype: string; title: string; excerpt: string; url: string; coverImageUrl: string | null; category: string | null; source: string | null; publishedAt: string | null };
export type SearchResponse = { items: SearchResult[]; pagination: ArticleList["pagination"]; availableTypes: string[] };
type Envelope<T> = { success: boolean; data?: T; error?: { message?: string } };

async function publicRequest<T>(path: string) { const response = await fetch(`${apiBaseUrl}${path}`, { cache: "no-store" }); const body = await response.json() as Envelope<T>; if (!response.ok || !body.success || body.data === undefined) throw new Error(body.error?.message ?? "暂时无法获取内容"); return body.data; }
function query(input: Record<string, string | number | undefined>) { const params = new URLSearchParams(); Object.entries(input).forEach(([key, value]) => { if (value !== undefined && value !== "") params.set(key, String(value)); }); const value = params.toString(); return value ? `?${value}` : ""; }
export const getArticles = (input: Record<string, string | number | undefined> = {}) => publicRequest<ArticleList>(`/articles${query(input)}`);
export const getArticle = (slug: string) => publicRequest<Article>(`/articles/${encodeURIComponent(slug)}`);
export const getCategories = () => publicRequest<Category[]>("/categories");
export const getTags = () => publicRequest<Tag[]>("/tags");
export const getAdminArticles = (input: Record<string, string | number | undefined> = {}) => authorizedRequest<ArticleList>(`/admin/articles${query(input)}`);
export const getAdminArticle = (id: string) => authorizedRequest<Article>(`/admin/articles/${id}`);
export const getAdminArticlePreview = (id: string) => authorizedRequest<Article>(`/admin/articles/${id}/preview`);
export const saveArticle = (id: string | null, input: Record<string, unknown>) => authorizedRequest<Article>(id ? `/admin/articles/${id}` : "/admin/articles", { method: id ? "PATCH" : "POST", body: JSON.stringify(input) });
export const transitionArticle = (id: string, action: "submit" | "publish" | "offline" | "return" | "restore") => authorizedRequest<Article>(`/admin/articles/${id}/${action}`, { method: "POST" });
export const getAdminCategories = () => authorizedRequest<Category[]>("/admin/categories");
export const createCategory = (input: Record<string, unknown>) => authorizedRequest<Category>("/admin/categories", { method: "POST", body: JSON.stringify(input) });
export const updateCategory = (id: string, input: Record<string, unknown>) => authorizedRequest<Category>(`/admin/categories/${id}`, { method: "PATCH", body: JSON.stringify(input) });
export const deleteCategory = (id: string) => authorizedRequest<{ id: string }>(`/admin/categories/${id}`, { method: "DELETE" });
export const createTag = (input: Record<string, unknown>) => authorizedRequest<Tag>("/admin/tags", { method: "POST", body: JSON.stringify(input) });
export const updateTag = (id: string, input: Record<string, unknown>) => authorizedRequest<Tag>(`/admin/tags/${id}`, { method: "PATCH", body: JSON.stringify(input) });
export const deleteTag = (id: string) => authorizedRequest<{ id: string }>(`/admin/tags/${id}`, { method: "DELETE" });
export const searchContent = (input: Record<string, string | number | undefined>) => publicRequest<SearchResponse>(`/search${query(input)}`);
export async function uploadImage(file: File) { let token = getAccessToken(); if (!token) { await refreshSession(); token = getAccessToken(); } const body = new FormData(); body.append("file", file); const response = await fetch(`${apiBaseUrl}/admin/uploads/images`, { method: "POST", credentials: "include", headers: { Authorization: `Bearer ${token}` }, body }); const payload = await response.json() as Envelope<{ url: string }>; if (!response.ok || !payload.success || !payload.data) throw new Error(payload.error?.message ?? "图片上传失败"); return payload.data; }
