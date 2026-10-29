const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "";
export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || vercelUrl || "http://localhost:3000").replace(/\/+$/, "");
/** True on preview deployments: keeps the whole site out of search engines until launch. */
export const noIndex = process.env.NEXT_PUBLIC_NOINDEX === "true";
export const absoluteUrl = (path = "/") => new URL(path, `${siteUrl}/`).toString();
/** Structured data and sitemaps need absolute image URLs; local images are stored as "/art/...". */
export const absoluteImage = (src: string) => src.startsWith("/") ? absoluteUrl(src) : src;

export const brand = {
  name: "Craftkiya",
  legalName: "Craftkiya Studio",
  email: "craftkiya.support@gmail.com",
  tagline: "Handmade string-art portraits, made from your story",
  logo: "/icon.svg",
};

export const money = (value: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);

export const jsonLd = (data: unknown) => ({ __html: JSON.stringify(data).replace(/</g, "\\u003c") });

/** Only allow same-site relative redirects such as "/checkout". */
export function safeNextPath(value: unknown, fallback = "/account") {
  const path = typeof value === "string" ? value : "";
  return path.startsWith("/") && !path.startsWith("//") && !path.startsWith("/\\") ? path.slice(0, 200) : fallback;
}
