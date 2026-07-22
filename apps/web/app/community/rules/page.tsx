import { LegalPolicyPage } from "../../../components/legal-policy-page";
import { pageMetadata } from "../../../lib/metadata";

export const metadata = pageMetadata({ title: "社区规范", description: "OPC Nexus 社区发布、互动、举报和内容审核规则。", path: "/community/rules" });

const sections = [
  { title: "讨论原则", items: ["区分事实、推断和个人观点；引用数据、政策或第三方内容时尽量附来源。", "允许有依据的分歧，不以身份、人身攻击或群体标签代替论证。", "涉及自身业务、持仓或合作利益时，应主动披露可能影响判断的利益关系。"] },
  { title: "禁止内容", items: ["违法金融活动、荐股带单、代客理财、承诺收益、内幕交易或非法募资。", "虚假身份、诈骗、恶意引流、垃圾广告、钓鱼链接或恶意软件。", "骚扰、威胁、诽谤、歧视、泄露他人隐私或未经授权公开个人联系方式。", "侵犯版权、商标或其他合法权益，以及明知失实仍持续传播的内容。"] },
  { title: "财经内容边界", paragraphs: ["平台内容仅供信息交流，不构成投资、法律、税务或其他专业建议。任何交易、投资和经营决定均应由用户独立判断并自行承担风险。", "命中高风险财经词、异常发布行为或其他安全规则的内容会先进入人工审核，不会直接公开。审核通过不代表平台对真实性、收益或履约能力作出背书。"] },
  { title: "举报与处置", paragraphs: ["用户可在内容详情页提交举报，也可通过联系页面提供内容链接、问题说明和可核验材料。平台会根据风险采取限制展示、锁定讨论、删除内容或限制账号等措施。", "审核会保留必要的操作记录。被处置用户可通过注册邮箱申请复核；涉及违法犯罪、现实人身风险或财产损失时，请同时联系有权机关。"] },
];

export default function CommunityRulesPage() { return <LegalPolicyPage eyebrow="COMMUNITY STANDARD · 社区规范" title="让不同判断，在清楚边界内发生。" intro="这些规则适用于帖子、评论、个人资料以及平台内的其他用户生成内容。" updatedAt="2026 年 7 月 20 日" sections={sections} />; }
