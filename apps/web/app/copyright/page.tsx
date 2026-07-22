import { LegalPolicyPage } from "../../components/legal-policy-page";
import { pageMetadata } from "../../lib/metadata";

export const metadata = pageMetadata({ title: "版权投诉", description: "向 OPC Nexus 提交版权、商标或其他内容权利投诉。", path: "/copyright" });

const sections = [
  { title: "提交材料", items: ["权利人或授权代理人的姓名、有效联系方式及授权证明。", "被投诉内容的准确页面链接、标题和可识别位置。", "权利归属证明、原作品或合法发布记录，以及要求采取的措施。", "关于所提交信息真实、准确并愿意承担相应责任的声明。"] },
  { title: "提交方式", paragraphs: ["请发送邮件至 wangzongheng02@gmail.com，主题写明“OPC Nexus｜版权投诉”。不要在公开帖子中披露身份证件、合同或其他敏感材料。", "材料不足时，我们可能请求补充信息；无法准确定位内容或验证权利基础的投诉可能无法立即处理。"] },
  { title: "处理流程", paragraphs: ["平台收到完整材料后会进行必要核验，并可根据风险先行限制访问。平台可能将必要的投诉信息转交内容发布者，以便其说明来源或提交反通知。", "对于争议复杂或需要司法认定的权利主张，平台可建议各方通过有权机关解决，并根据有效法律文书采取后续措施。"] },
  { title: "善意与反通知", paragraphs: ["请勿提交明知失实、用于骚扰或妨碍正当表达的投诉。发布者认为内容被错误处理时，可通过同一邮箱提交权利来源、授权依据和具体说明申请复核。"] },
];

export default function CopyrightPage() { return <LegalPolicyPage eyebrow="RIGHTS DESK · 版权投诉" title="让权利主张可核验、可追踪。" intro="本页面说明版权、商标和其他内容权利投诉的提交材料与处理路径。" updatedAt="2026 年 7 月 20 日" sections={sections} />; }
