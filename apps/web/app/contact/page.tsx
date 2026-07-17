import type { Metadata } from "next";
import Link from "next/link";
import { SiteChrome } from "../../components/site-chrome";
import { SupportPageHeader } from "../../components/support-page-header";

export const metadata: Metadata = {
  title: "联系方式 | OPC Nexus",
  description: "联系 OPC Nexus，反馈账号、内容、隐私或商务合作相关事项。",
};

const supportEmail = "wangzongheng02@gmail.com";

const contactPaths = [
  {
    code: "ACCOUNT / DATA",
    title: "账号与数据",
    body: "登录异常、密码重置、账号资料、个人数据访问、更正或删除请求。请使用注册邮箱来信，便于核验。",
    subject: "OPC Nexus｜账号与数据问题",
    checklist: "账号邮箱（可部分隐藏） · 发生时间 · 浏览器或设备 · 错误提示",
  },
  {
    code: "CONTENT / SAFETY",
    title: "内容与社区",
    body: "内容纠错、侵权通知、隐私暴露、社区举报或需求广场风险线索。页面内有举报入口时请优先使用。",
    subject: "OPC Nexus｜内容与社区反馈",
    checklist: "内容链接 · 问题类型 · 事实说明 · 可核验材料",
  },
  {
    code: "PARTNERSHIP",
    title: "内容与商务合作",
    body: "内容供稿、行业活动、专题共建或其他清晰具体的合作建议。请说明合作主体、目标和预期形式。",
    subject: "OPC Nexus｜合作沟通",
    checklist: "机构或个人介绍 · 合作目标 · 方案摘要 · 期望时间",
  },
] as const;

function mailto(subject: string) {
  return `mailto:${supportEmail}?subject=${encodeURIComponent(subject)}`;
}

export default function ContactPage() {
  return <SiteChrome>
    <main className="support-page">
      <div className="support-frame">
        <SupportPageHeader
          active="contact"
          eyebrow="CONTACT DESK · 联系我们"
          title="把问题说清楚，才能更快送到对的人手里。"
          description="OPC Nexus 目前通过电子邮件接收服务反馈。按下面的问题类型发起邮件，并提供最少但足够的核验信息；请勿发送密码、验证码、证件原件或与问题无关的敏感资料。"
          note="唯一公开邮箱 · 按问题类型分流"
        />

        <section className="contact-address-block" aria-labelledby="contact-address-title">
          <div>
            <p className="eyebrow">PUBLIC MAILBOX · 公开邮箱</p>
            <h2 id="contact-address-title"><a href={`mailto:${supportEmail}`}>{supportEmail}</a></h2>
          </div>
          <p>收到邮件后将按事项类型处理；需要身份核验或补充材料时，会通过来信邮箱继续联系。平台不会通过邮件索取密码或一次性验证码。</p>
        </section>

        <section className="contact-paths">
          {contactPaths.map((item) => <article key={item.code}>
            <small>{item.code}</small>
            <h2>{item.title}</h2>
            <p>{item.body}</p>
            <dl>
              <dt>建议附上</dt>
              <dd>{item.checklist}</dd>
            </dl>
            <a href={mailto(item.subject)}>按此类型写邮件 <span aria-hidden="true">→</span></a>
          </article>)}
        </section>

        <section className="contact-guide">
          <header>
            <p className="eyebrow">BEFORE YOU SEND · 发送前</p>
            <h2>一封容易处理的邮件，通常包含这些信息</h2>
          </header>
          <ol>
            <li>
              <span>问题发生在哪里</span>
              <p>附上具体页面链接、内容标题或相关账号，而不是只描述“网站里”。</p>
            </li>
            <li>
              <span>你已经看到什么</span>
              <p>写明发生时间、操作步骤和完整错误提示；必要时附一张已遮挡敏感信息的截图。</p>
            </li>
            <li>
              <span>你希望如何处理</span>
              <p>明确说明是需要纠错、下架、账号协助、数据请求，还是希望进一步讨论合作。</p>
            </li>
          </ol>
        </section>

        <section className="support-closing-panel contact-safety-note">
          <div>
            <p className="eyebrow">SAFETY BOUNDARY</p>
            <h2>涉及资金或人身安全的紧急事项</h2>
          </div>
          <p>OPC Nexus 不是交易、支付或执法机构。若你怀疑诈骗、账户被盗或现实安全受到威胁，请先停止相关操作，并联系支付平台、账号服务商或当地执法机构。</p>
          <Link href="/faq#matching">查看对接安全说明 <span aria-hidden="true">→</span></Link>
        </section>
      </div>
    </main>
  </SiteChrome>;
}
