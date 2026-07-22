import type { MetadataRoute } from "next";
import { getSiteUrl } from "../lib/metadata";

export default function robots(): MetadataRoute.Robots {
  const origin = getSiteUrl().origin;
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/admin/", "/account/", "/notifications", "/auth/reset-password"] },
    ],
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}
