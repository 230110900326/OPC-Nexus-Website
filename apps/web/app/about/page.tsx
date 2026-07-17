import type { Metadata } from "next";
import Link from "next/link";
import { SiteChrome } from "../../components/site-chrome";
import { SupportPageHeader } from "../../components/support-page-header";

export const metadata: Metadata = {
  title: "关于 OPC Nexus | OPC Nexus",
  description: "了解 OPC Nexus 的平台定位、内容板块与社区原则。",
};

const capabilities = [
  {
    code: "READ / 读",
    title: "把信息放回行业语境",
    body: "汇集政策、产业、公司与市场内容，保留来源、时间和分类，让一条信息不脱离它发生的背景。",
    href: "/discover",
    action: "浏览今日推荐",
  },
  {
    code: "DISCUSS / 议",
    title: "让不同判断彼此校验",
    body: "围绕真实议题展开讨论。观点可以不同，但事实、出处和利益关系应尽可能说清楚。",
    href: "/community",
    action: "进入社区",
  },
  {
    code: "MATCH / 联",
    title: "让需求找到合适的人",
    body: "需求广场承接调研、数据、咨询与项目协作信息；平台提供展示与对接，不替任何一方背书。",
    href: "/demands",
    action: "查看需求广场",
  },
  {
    code: "MEET / 聚",
    title: "把线上交流带到现场",
    body: "活动板块用于发现公开行业活动、交流议程与报名信息，让持续关系从一次具体见面开始。",
    href: "/events",
    action: "查看近期活动",
  },
] as const;

export default function AboutPage() {
  return <SiteChrome>
    <main className="support-page">
      <div className="support-frame">
        <SupportPageHeader
          active="about"
          eyebrow="ABOUT OPC NEXUS · 平台说明"
          title="把分散的行业信号，接成可行动的判断。"
          description="OPC Nexus 面向财经、产业、投资与企业经营者，连接内容阅读、专业讨论、行业活动和供需协作。我们希望用户不仅看见信息，也能理解它从哪里来、与谁有关、下一步可以做什么。"
          note="内容 · 社群 · 活动 · 供需"
        />

        <section className="support-lead-grid">
          <aside className="support-ledger-mark" aria-label="平台定位">
            <span>NEXUS</span>
            <p>不是信息终点，<br />而是判断的连接处。</p>
          </aside>
          <article className="support-prose">
            <p className="eyebrow">WHY WE EXIST · 为什么存在</p>
            <h2>信息很多，真正稀缺的是上下文、可信度与可以继续追问的人。</h2>
            <p>行业信息常常散落在新闻、政策原文、从业者经验和项目现场里。OPC Nexus 将这些线索放进同一个可检索、可讨论、可对接的空间，帮助用户更快形成自己的判断。</p>
            <p>平台不替用户作投资或经营决策，也不承诺任何合作结果。我们的工作，是尽可能让信息边界清楚、交流路径顺畅、风险提示可见。</p>
          </article>
        </section>

        <section className="support-content-section">
          <header className="support-section-heading">
            <div>
              <p className="eyebrow">WHAT YOU CAN DO · 平台能力</p>
              <h2>从看见信号，到找到同行</h2>
            </div>
            <p>四个彼此连接的入口，服务同一件事：让一次行业判断有材料、有讨论，也有后续行动。</p>
          </header>
          <div className="about-capability-grid">
            {capabilities.map((item) => <article key={item.code}>
              <small>{item.code}</small>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
              <Link href={item.href}>{item.action} <span aria-hidden="true">→</span></Link>
            </article>)}
          </div>
        </section>

        <section className="support-content-section about-principles">
          <header className="support-section-heading">
            <div>
              <p className="eyebrow">HOW WE WORK · 社区原则</p>
              <h2>我们坚持的三条边界</h2>
            </div>
          </header>
          <dl>
            <div>
              <dt>来源优先</dt>
              <dd>事实尽量附出处，观点明确是观点；信息更新时保留时间与上下文。</dd>
            </div>
            <div>
              <dt>不同判断</dt>
              <dd>欢迎有依据的分歧，不用立场代替事实，也不以身份压过具体论证。</dd>
            </div>
            <div>
              <dt>风险自决</dt>
              <dd>平台提供信息与连接，不提供投资建议、不参与交易，也不为合作结果担保。</dd>
            </div>
          </dl>
        </section>

        <section className="support-closing-panel" id="contact">
          <div>
            <p className="eyebrow">KEEP THE SIGNAL OPEN</p>
            <h2>有建议、内容线索或合作想法？</h2>
          </div>
          <p>先到联系方式页面选择问题类型，我们会更容易把邮件送到正确的处理路径。</p>
          <Link href="/contact">联系 OPC Nexus <span aria-hidden="true">→</span></Link>
        </section>
      </div>
    </main>
  </SiteChrome>;
}
