import Link from "next/link";

export type SupportSection = "about" | "faq" | "contact" | "search";

const supportRoutes = [
  { key: "about", label: "关于我们", route: "/ABOUT", href: "/about" },
  { key: "faq", label: "常见问题", route: "/FAQ", href: "/faq" },
  { key: "contact", label: "联系方式", route: "/CONTACT", href: "/contact" },
  { key: "search", label: "全站搜索", route: "/SEARCH", href: "/search" },
] as const;

type SupportPageHeaderProps = {
  active: SupportSection;
  eyebrow: string;
  title: string;
  description: string;
  note: string;
};

export function SupportPageHeader({ active, eyebrow, title, description, note }: SupportPageHeaderProps) {
  return <>
    <header className="support-page-hero">
      <div className="support-page-title">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
      </div>
      <div className="support-page-intro">
        <p>{description}</p>
        <span>{note}</span>
      </div>
    </header>
    <nav className="support-route-nav" aria-label="服务支持">
      {supportRoutes.map((item) => {
        const current = item.key === active;
        return <Link className={current ? "active" : undefined} href={item.href} aria-current={current ? "page" : undefined} key={item.key}>
          <small>{item.route}</small>
          <strong>{item.label}</strong>
          <span aria-hidden="true">↗</span>
        </Link>;
      })}
    </nav>
  </>;
}
