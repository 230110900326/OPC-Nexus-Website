import Link from "next/link";
import { SiteChrome } from "./site-chrome";

export type LegalSection = { title: string; paragraphs?: string[]; items?: string[] };

export function LegalPolicyPage({ eyebrow, title, intro, updatedAt, sections }: { eyebrow: string; title: string; intro: string; updatedAt: string; sections: LegalSection[] }) {
  return <SiteChrome>
    <main className="legal-policy-page">
      <header>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{intro}</p>
        <small>最近更新：{updatedAt}</small>
      </header>
      <div className="legal-policy-layout">
        <aside>
          <strong>页面目录</strong>
          <nav aria-label={`${title}目录`}>
            {sections.map((section, index) => <a href={`#section-${index + 1}`} key={section.title}>{String(index + 1).padStart(2, "0")} · {section.title}</a>)}
          </nav>
          <Link href="/contact">需要进一步帮助？</Link>
        </aside>
        <article>
          {sections.map((section, index) => <section id={`section-${index + 1}`} key={section.title}>
            <p className="eyebrow">SECTION {String(index + 1).padStart(2, "0")}</p>
            <h2>{section.title}</h2>
            {section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            {section.items && <ul>{section.items.map((item) => <li key={item}>{item}</li>)}</ul>}
          </section>)}
        </article>
      </div>
    </main>
  </SiteChrome>;
}
