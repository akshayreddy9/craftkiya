import type { MetadataRoute } from "next";
import { absoluteUrl, noIndex } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  if (noIndex) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/account", "/studio", "/login", "/checkout", "/auth/", "/api/"] },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
