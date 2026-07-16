import { authorizedRequest, getAccessToken, refreshSession } from "./auth";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
type Envelope<T> = { success: boolean; data?: T; error?: { message?: string } };

export type DemandType = "research_collection" | "report_writing" | "field_visit" | "data_organization" | "policy_analysis" | "project_consulting" | "other";
export type DemandBudget = "volunteer" | "under_500" | "500_2000" | "2000_10000" | "over_10000";
export type DemandStatus = "draft" | "pending_review" | "published" | "completed" | "offline" | "blocked";
export type DemandContactType = "qq" | "wechat" | "phone" | "enterprise_wechat";
export type DemandContact = { type: DemandContactType; value: string };
export type DemandIndustry = { id: string; slug: string; name: string };
export type DemandAuthor = { id: string; displayName: string; email?: string; avatarUrl: string | null; industry?: string | null; company?: string | null; jobTitle?: string | null; certification: "author" | "institution" | null };

export type Demand = {
  id: string; title: string; content: string; imageUrls: string[]; industries: DemandIndustry[]; demandType: DemandType; budgetRange: DemandBudget;
  deadline: string | null; status: DemandStatus; topWeight: number; isPinned?: boolean; viewCount: number; connectCount: number; heatScore: number;
  createdAt: string; updatedAt: string; expired?: boolean; author: DemandAuthor; contactInfo?: DemandContact[]; riskFlags?: string[]; reviewReason?: string | null;
  rulesAcceptedAt?: string | null; reviewedAt?: string | null; related?: Demand[]; reportCount?: number;
};
export type DemandList = { items: Demand[]; pagination: { page: number; limit: number; total: number; totalPages: number } };
export type DemandBoardConfig = { bannerTitle: string; bannerSubtitle: string; rulesText: string; disclaimer: string; allowPhone: boolean; prohibitedKeywords?: string[]; normalDailyLimit?: number; verifiedDailyLimit?: number; connectDailyLimit?: number; maxPinned?: number };
export type DemandConnect = { id: string; demand: Demand; applicant: DemandAuthor; applyMsg: string; status: "pending_view" | "viewed" | "communicated" | "completed" | "cancelled"; isAnomalous?: boolean; riskReason?: string | null; countsTowardHeat?: boolean; viewedAt: string | null; createdAt: string; updatedAt: string };
export type DemandDashboard = { range: { from: string; to: string }; summary: { newDemands: number; reviewed: number; approved: number; approvalRate: number; blocked: number; completed: number; connectApplications: number }; industries: { id: string; name: string; demandCount: number; connectCount: number; averageHeat: number }[]; series: { date: string; newDemands: number; approvedDemands: number; connectApplications: number }[] };
export type AdminConnectList = { items: DemandConnect[]; pagination: DemandList["pagination"] };

async function publicRequest<T>(path: string) {
  const response = await fetch(`${apiBaseUrl}${path}`, { cache: "no-store" });
  const body = await response.json() as Envelope<T>;
  if (!response.ok || !body.success || body.data === undefined) throw new Error(body.error?.message ?? "需求数据暂时无法加载");
  return body.data;
}

function query(input: Record<string, string | number | boolean | undefined>) {
  const params = new URLSearchParams();
  Object.entries(input).forEach(([key, value]) => { if (value !== undefined && value !== "") params.set(key, String(value)); });
  return params.size ? `?${params}` : "";
}

export const demandTypeLabels: Record<DemandType, string> = { research_collection: "调研采集", report_writing: "报告撰写", field_visit: "实地走访", data_organization: "数据整理", policy_analysis: "政策解读", project_consulting: "项目咨询", other: "其他" };
export const demandBudgetLabels: Record<DemandBudget, string> = { volunteer: "无偿协作", under_500: "500 元内", "500_2000": "500–2,000 元", "2000_10000": "2,000–10,000 元", over_10000: "10,000 元以上" };
export const demandStatusLabels: Record<DemandStatus, string> = { draft: "草稿", pending_review: "待审核", published: "展示中", completed: "已完成", offline: "已下架", blocked: "违规封禁" };
export const contactTypeLabels: Record<DemandContactType, string> = { qq: "QQ", wechat: "微信", phone: "手机号", enterprise_wechat: "企业微信" };

export const getDemandBoardConfig = () => publicRequest<DemandBoardConfig>("/demands/config");
export const getDemands = (input: Record<string, string | number | boolean | undefined> = {}) => publicRequest<DemandList>(`/demands${query(input)}`);
export const getHotDemands = (window: "24h" | "7d") => publicRequest<Demand[]>(`/demands/hot?window=${window}`);
export const getDemand = (id: string) => publicRequest<Demand>(`/demands/${id}`);
export const getDemandContact = (id: string) => authorizedRequest<{ demandId: string; contactInfo: DemandContact[]; disclaimer: string }>(`/demands/${id}/contact`);
export const getOwnDemand = (id: string) => authorizedRequest<Demand>(`/demands/mine/${id}`);
export const getMyDemands = (input: Record<string, string | number | undefined> = {}) => authorizedRequest<DemandList>(`/demands/mine${query(input)}`);
export const createDemand = (input: Record<string, unknown>) => authorizedRequest<Demand>("/demands", { method: "POST", body: JSON.stringify(input) });
export const updateDemand = (id: string, input: Record<string, unknown>) => authorizedRequest<Demand>(`/demands/${id}`, { method: "PATCH", body: JSON.stringify(input) });
export const deleteDemand = (id: string) => authorizedRequest<{ id: string }>(`/demands/${id}`, { method: "DELETE" });
export const submitDemand = (id: string) => authorizedRequest<Demand>(`/demands/${id}/submit`, { method: "POST" });
export const offlineDemand = (id: string) => authorizedRequest<Demand>(`/demands/${id}/offline`, { method: "PATCH" });
export const completeDemand = (id: string) => authorizedRequest<Demand>(`/demands/${id}/complete`, { method: "PATCH" });
export const connectDemand = (id: string, applyMsg: string) => authorizedRequest<DemandConnect>(`/demands/${id}/connects`, { method: "POST", body: JSON.stringify({ applyMsg }) });
export const getDemandConnects = (id: string) => authorizedRequest<DemandConnect[]>(`/demands/${id}/connects`);
export const getMyDemandConnects = (direction: "sent" | "received") => authorizedRequest<DemandConnect[]>(`/demands/mine/connects?direction=${direction}`);
export const updateDemandConnect = (demandId: string, connectId: string, status: DemandConnect["status"]) => authorizedRequest<DemandConnect>(`/demands/${demandId}/connects/${connectId}`, { method: "PATCH", body: JSON.stringify({ status }) });

export const getAdminDemands = (input: Record<string, string | number | undefined> = {}) => authorizedRequest<DemandList>(`/admin/demands${query(input)}`);
export const getAdminDemand = (id: string) => authorizedRequest<Demand & { reports?: unknown[]; totalConnectRecords?: number }>(`/admin/demands/${id}`);
export const updateAdminDemand = (id: string, input: Record<string, unknown>) => authorizedRequest<Demand>(`/admin/demands/${id}`, { method: "PATCH", body: JSON.stringify(input) });
export const reviewDemand = (id: string, action: "approve" | "reject" | "block", reason?: string) => authorizedRequest<Demand>(`/admin/demands/${id}/review`, { method: "PATCH", body: JSON.stringify({ action, reason }) });
export const batchDemands = (ids: string[], action: "approve" | "reject" | "pin" | "unpin" | "offline" | "block", reason?: string, topWeight?: number) => authorizedRequest<{ updated: number; items: Demand[] }>("/admin/demands/batch", { method: "POST", body: JSON.stringify({ ids, action, reason, topWeight }) });
export const getAdminDemandConnects = (input: Record<string, string | number | undefined> = {}) => authorizedRequest<AdminConnectList>(`/admin/demand-connects${query(input)}`);
export const getAdminDemandConfig = () => authorizedRequest<DemandBoardConfig>("/admin/demands/config");
export const updateDemandConfig = (input: Record<string, unknown>) => authorizedRequest<DemandBoardConfig>("/admin/demands/config", { method: "PATCH", body: JSON.stringify(input) });
export const getDemandDashboard = (input: Record<string, string | undefined>) => authorizedRequest<DemandDashboard>(`/admin/demands/dashboard${query(input)}`);
export const sendDemandDeadlineReminders = () => authorizedRequest<{ sent: number; demandIds: string[] }>("/admin/demands/deadline-reminders", { method: "POST" });

export async function uploadDemandImage(file: File) {
  let token = getAccessToken();
  if (!token) { await refreshSession(); token = getAccessToken(); }
  const body = new FormData(); body.append("file", file);
  const response = await fetch(`${apiBaseUrl}/demands/uploads/images`, { method: "POST", credentials: "include", headers: { Authorization: `Bearer ${token}` }, body });
  const payload = await response.json() as Envelope<{ url: string }>;
  if (!response.ok || !payload.success || !payload.data) throw new Error(payload.error?.message ?? "图片上传失败");
  return payload.data;
}

export async function downloadDemandConnects(input: Record<string, string | undefined> = {}) {
  let token = getAccessToken();
  if (!token) { await refreshSession(); token = getAccessToken(); }
  const response = await fetch(`${apiBaseUrl}/admin/demand-connects.csv${query(input)}`, { credentials: "include", headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error("对接记录导出失败");
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a"); link.href = url; link.download = "opc-demand-connects.csv"; link.click(); URL.revokeObjectURL(url);
}
