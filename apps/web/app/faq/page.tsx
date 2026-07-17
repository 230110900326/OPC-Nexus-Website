import type { Metadata } from "next";
import Link from "next/link";
import { SiteChrome } from "../../components/site-chrome";
import { SupportPageHeader } from "../../components/support-page-header";

export const metadata: Metadata = {
  title: "常见问题 | OPC Nexus",
  description: "查找 OPC Nexus 账号、内容、社区、需求对接与隐私相关问题的解答。",
};

const faqGroups = [
  {
    id: "platform",
    label: "平台与内容",
    questions: [
      {
        question: "OPC Nexus 是什么？",
        answer: <>OPC Nexus 是面向财经、产业、投资与企业经营者的内容和交流平台，包含资讯与政策、行业洞察、社区讨论、活动信息及需求广场。平台帮助用户发现和连接信息，不提供投资建议，也不为第三方内容或合作结果背书。</>,
      },
      {
        question: "不登录可以使用哪些功能？",
        answer: <>游客可以浏览公开内容、社区帖子、活动和已发布需求。发布内容、参与互动、查看需求方联系方式或管理个人记录时，需要登录账号。</>,
      },
      {
        question: "推荐、资讯、政策和洞察有什么区别？",
        answer: <>“推荐”是跨频道的精选入口；“资讯”关注公开行业动态；“政策”聚合政策与监管信息；“洞察”侧重有分析框架的专栏内容。使用<Link href="/search">全站搜索</Link>可以跨这些频道检索。</>,
      },
      {
        question: "搜索不到内容时怎么办？",
        answer: <>先尝试更短的核心词，再清空内容类型、来源和日期筛选。公司名称可以同时尝试简称与全称；政策内容建议使用发布机构或文件主题搜索。</>,
      },
    ],
  },
  {
    id: "account",
    label: "账号与隐私",
    questions: [
      {
        question: "收不到登录、注册或重置密码邮件怎么办？",
        answer: <>先确认邮箱拼写，并检查垃圾邮件或广告邮件目录。等待几分钟后仍未收到，可重新发起一次；如果问题持续，请在<Link href="/contact">联系方式</Link>页面按“账号与数据”路径反馈，并写明发生时间和浏览器，不要发送密码或验证码。</>,
      },
      {
        question: "如何修改资料或管理自己的内容？",
        answer: <>登录后进入个人中心可以修改公开资料，并查看自己发布的内容、需求和对接记录。不同内容的编辑、下架与审核状态会显示在对应管理入口。</>,
      },
      {
        question: "如何申请导出、更正或删除个人数据？",
        answer: <>请使用注册邮箱发送请求，并说明要处理的账号及具体范围。为避免他人冒用，平台可能要求完成必要的身份核验；依法需要保留的安全或审计记录不在即时删除范围内。详情请查看<Link href="/privacy">隐私政策</Link>。</>,
      },
    ],
  },
  {
    id: "community",
    label: "社区与发布",
    questions: [
      {
        question: "为什么发布后没有立即公开？",
        answer: <>部分文章、活动和需求需要经过合规审核。审核会关注信息是否完整、来源是否清楚，以及是否包含违规金融信息、骚扰引流或不当个人信息。你可以在个人中心查看当前状态和驳回原因。</>,
      },
      {
        question: "发现侵权、虚假信息或不当内容如何处理？",
        answer: <>内容详情页有举报入口时，请优先在原页面提交，便于系统带上内容编号。涉及版权、隐私或无法通过页面举报的情况，可通过<Link href="/contact">邮件渠道</Link>提供链接、问题说明和可核验材料。</>,
      },
      {
        question: "社区允许出现不同观点吗？",
        answer: <>允许。OPC Nexus 鼓励有事实依据的分歧，但不接受人身攻击、骚扰、歧视、虚假身份、垃圾广告或违法金融活动。讨论观点时，请把事实、推断和个人立场分开表达。</>,
      },
    ],
  },
  {
    id: "matching",
    label: "需求与对接",
    questions: [
      {
        question: "为什么游客看不到需求方的联系方式？",
        answer: <>联系方式属于发布人主动提供的非公开对接信息，只向登录用户在需求详情页按需展示，不进入公开列表或游客接口。请勿将看到的联系方式再次公开传播。</>,
      },
      {
        question: "平台会审核合作方、担保交易或收取佣金吗？",
        answer: <>不会。平台会审核公开发布内容是否符合规则，但这不等于对身份、能力或履约作出认证。OPC Nexus 不参与谈判、收款、交付和争议处理，也不收取对接解锁费用或撮合佣金。合作前请独立核验，并使用可追溯的合同与付款方式。</>,
      },
      {
        question: "对接后发生纠纷怎么办？",
        answer: <>先保存需求页面、沟通记录、合同和付款凭证，并直接与对方协商。发现虚假身份、诈骗或违法行为时，应及时停止付款并向相应平台或执法机构求助；同时可在需求详情页举报，平台会依据规则处理站内内容和账号。</>,
      },
    ],
  },
] as const;

export default function FaqPage() {
  return <SiteChrome>
    <main className="support-page">
      <div className="support-frame">
        <SupportPageHeader
          active="faq"
          eyebrow="SERVICE NOTES · 常见问题"
          title="答案应该比问题更容易找到。"
          description="这里整理了浏览、账号、社区和需求对接中最常见的问题。先按主题定位，再展开需要的答案；涉及具体账号或内容时，请通过联系页面提供可核验信息。"
          note={`${faqGroups.reduce((total, group) => total + group.questions.length, 0)} 个常见问题 · 持续更新`}
        />

        <div className="faq-layout">
          <aside className="faq-index">
            <p className="eyebrow">QUICK INDEX · 快速定位</p>
            <nav aria-label="常见问题主题">
              {faqGroups.map((group) => <a href={`#${group.id}`} key={group.id}>
                <span>{group.label}</span>
                <small>{String(group.questions.length).padStart(2, "0")}</small>
              </a>)}
            </nav>
            <div>
              <strong>没有找到答案？</strong>
              <p>带上页面链接、发生时间和问题截图，会比只写“无法使用”更容易定位。</p>
              <Link href="/contact">联系支持 <span aria-hidden="true">→</span></Link>
            </div>
          </aside>

          <div className="faq-groups">
            {faqGroups.map((group) => <section id={group.id} key={group.id}>
              <header>
                <p className="eyebrow">{group.label}</p>
                <span>{group.questions.length} QUESTIONS</span>
              </header>
              <div className="faq-list">
                {group.questions.map((item, index) => <details open={group.id === "platform" && index === 0} key={item.question}>
                  <summary>
                    <span>{item.question}</span>
                    <i aria-hidden="true" />
                  </summary>
                  <div className="faq-answer"><p>{item.answer}</p></div>
                </details>)}
              </div>
            </section>)}
          </div>
        </div>
      </div>
    </main>
  </SiteChrome>;
}
