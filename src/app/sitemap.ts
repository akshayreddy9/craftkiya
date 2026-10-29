import type { MetadataRoute } from "next";
import { getProducts } from "@/lib/catalog";
import { landingPages } from "@/lib/landing-pages";
import { absoluteImage, absoluteUrl } from "@/lib/site";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();
  const products = await getProducts();
  return [
    { url: absoluteUrl("/"), lastModified, changeFrequency: "weekly", priority: 1 },
    ...products.map((product) => ({ url: absoluteUrl(`/products/${product.slug}`), lastModified, changeFrequency: "weekly" as const, priority: 0.9, images: [absoluteImage(product.image)] })),
    { url: absoluteUrl("/gifts"), lastModified, changeFrequency: "monthly", priority: 0.7 },
    { url: absoluteUrl("/contact"), lastModified, changeFrequency: "monthly", priority: 0.5 },
    ...landingPages.map((page) => ({ url: absoluteUrl(page.route), lastModified, changeFrequency: "monthly" as const, priority: 0.7 })),
    ...["shipping", "returns", "privacy", "terms"].map((slug) => ({ url: absoluteUrl(`/policies/${slug}`), lastModified, changeFrequency: "yearly" as const, priority: 0.2 })),
  ];
}
