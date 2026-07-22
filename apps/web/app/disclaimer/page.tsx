import { LegalPolicyPage } from "../../components/legal-policy-page";
import { pageMetadata } from "../../lib/metadata";

export const metadata = pageMetadata({ title: "财经免责声明", description: "OPC Nexus 财经内容、第三方来源和供需协作风险说明。", path: "/disclaimer" });

const sections = [
  { title: "不构成投资建议", paragraphs: ["OPC Nexus 发布或聚合的资讯、政策摘要、视频概要、社区讨论和需求信息仅供一般信息交流，不构成证券、基金、期货、保险、信贷或任何其他交易的投资建议，也不构成法律、税务或会计意见。"] },
  { title: "信息可能变化", paragraphs: ["平台努力标明来源、发布时间和内容边界，但不保证第三方信息完整、准确、持续有效或适合任何特定目的。政策、市场数据和企业情况可能随时变化，重要决定应以主管机构、原始文件和独立专业意见为准。"] },
  { title: "用户独立决策", paragraphs: ["用户应结合自身目标、风险承受能力和实际情况独立核验。因依赖平台内容、外部链接、用户观点或第三方服务而作出的任何决定及其结果，由用户自行承担。历史表现、案例或模拟结果均不代表未来收益。"] },
  { title: "第三方与供需协作", paragraphs: ["外部原文、视频和服务由第三方提供，平台不控制其持续可用性。需求广场和社区中的身份、能力、报价及履约情况需要双方自行核验；平台不参与交易、托管资金或担保合作结果。发现欺诈或违法行为时请停止付款并及时联系有权机关。"] },
];

export default function DisclaimerPage() { return <LegalPolicyPage eyebrow="FINANCIAL NOTICE · 财经免责声明" title="信息帮助判断，但不替你作决定。" intro="阅读和使用 OPC Nexus 的财经、产业及合作信息前，请理解以下边界。" updatedAt="2026 年 7 月 20 日" sections={sections} />; }
