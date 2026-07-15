import Link from "next/link";

export function BrandLogo({ href = "/", tone = "dark", className = "" }: { href?: string; tone?: "dark" | "light"; className?: string }) {
  return <Link className={`brand-logo ${className}`.trim()} href={href} aria-label="OPC Nexus 首页"><img src={`/brand/opc-nexus-lockup-${tone}.png`} width={458} height={128} alt="OPC Nexus" /></Link>;
}
