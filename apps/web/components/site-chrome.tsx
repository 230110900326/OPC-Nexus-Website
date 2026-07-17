import type { ReactNode } from "react";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

export function SiteChrome({ children }: { children: ReactNode }) {
  return <div className="site-shell"><SiteHeader /><div className="site-content">{children}</div><SiteFooter /></div>;
}
