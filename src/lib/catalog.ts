import { cache } from "react";
import { createSupabasePublicClient } from "@/lib/supabase/public";

/** compareAtInr is the optional "original" price shown struck through; always higher than priceInr. */
export type Variant = { id: string | null; dimension: string; frameFinish: string; stringDensity: string; priceInr: number; compareAtInr: number | null };
export type Product = {
  id: string | null;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  badge: string | null;
  image: string;
  /** Slideshow images for the product page: the cover first, then the gallery. */
  images: string[];
  seoTitle: string | null;
  seoDescription: string | null;
  variants: Variant[];
};

// Mirrors the database (see 202610280012_couple_family_photos.sql): three products,
// each one 24-inch circle. Used when Supabase is not connected; such variants
// have no id, so checkout stays disabled. Each product shows its own real pieces.
const singleFacePhotos = ["/art/portrait-studio-smile.jpg", "/art/craftkiya-easel-portrait.jpg", "/art/portrait-studio-scarf.jpg", "/art/portrait-studio-glance.jpg", "/art/portrait-studio-warm.jpg"];
const fallbackVariants = (priceInr: number, compareAtInr: number): Variant[] => [{ id: null, dimension: "24-inch circle", frameFinish: "White ring frame", stringDensity: "Single thread", priceInr, compareAtInr }];

const fallbackCatalog: Product[] = [
  {
    id: null, slug: "single-face-string-art-portrait", title: "Single Face String Art Portrait", subtitle: "One face, threaded by hand", badge: "Perfect gift",
    description: "A 24-inch circular string-art portrait of one face (a parent, partner or friend) made from your photograph. Our artist maps your photo, then winds one continuous black thread around a ring of pins until the face appears.",
    image: singleFacePhotos[0], images: singleFacePhotos, seoTitle: null, seoDescription: null, variants: fallbackVariants(4499, 6427),
  },
  {
    id: null, slug: "double-face-string-art-portrait", title: "Double Face String Art Portrait", subtitle: "Two faces, one circle", badge: "For couples",
    description: "A 24-inch hand-threaded string-art portrait of you and your favourite person, made from a photo of the two of you. Perfect for anniversaries, weddings and couples.",
    image: "/art/portrait-couple-1.jpg", images: ["/art/portrait-couple-1.jpg", "/art/portrait-couple-3.jpg", "/art/portrait-couple-2.jpg", "/art/portrait-couple-4.jpg"], seoTitle: null, seoDescription: null, variants: fallbackVariants(5999, 8570),
  },
  {
    id: null, slug: "family-string-art-portrait", title: "Family String Art Portrait", subtitle: "Everyone you love, in one frame", badge: "For families",
    description: "Bring the whole family into one 24-inch circle, hand-threaded from your family photo with one continuous black thread. Works best for three to five people standing close together.",
    image: "/art/portrait-family-3.jpg", images: ["/art/portrait-family-3.jpg", "/art/portrait-family-2.jpg", "/art/portrait-family-5.jpg", "/art/portrait-family-1.jpg", "/art/portrait-family-4.jpg"], seoTitle: null, seoDescription: null, variants: fallbackVariants(7499, 10713),
  },
];

type ProductRow = {
  id: string; slug: string; title: string; subtitle: string | null; description: string; badge: string | null; cover_image_url: string | null;
  seo_title: string | null; seo_description: string | null; gallery_image_urls: string[] | null;
  product_variants: { id: string; dimension: string; frame_finish: string; string_density: string; price_inr: number; compare_at_price_inr: number | null; sort_order: number; is_active: boolean }[] | null;
};

export const getProducts = cache(async (): Promise<Product[]> => {
  const supabase = createSupabasePublicClient();
  if (!supabase) return fallbackCatalog;
  const { data, error } = await supabase.from("products")
    .select("id,slug,title,subtitle,description,badge,cover_image_url,seo_title,seo_description,gallery_image_urls,product_variants(id,dimension,frame_finish,string_density,price_inr,compare_at_price_inr,sort_order,is_active)")
    .eq("is_active", true)
    .order("sort_order");
  const rows = data as ProductRow[] | null;
  if (error || !rows?.length) return fallbackCatalog;
  const fallbackImage = fallbackCatalog[0].image;
  return rows.map((row) => {
    const image = row.cover_image_url || fallbackCatalog.find((product) => product.slug === row.slug)?.image || fallbackImage;
    return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle || "",
    description: row.description,
    badge: row.badge,
    image,
    images: [image, ...(row.gallery_image_urls || []).filter((url) => url && url !== image)].slice(0, 8),
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    variants: (row.product_variants || []).filter((variant) => variant.is_active).sort((a, b) => a.sort_order - b.sort_order)
      .map((variant) => ({
        id: variant.id, dimension: variant.dimension, frameFinish: variant.frame_finish, stringDensity: variant.string_density, priceInr: variant.price_inr,
        compareAtInr: variant.compare_at_price_inr && variant.compare_at_price_inr > variant.price_inr ? variant.compare_at_price_inr : null,
      })),
    };
  }).filter((product) => product.variants.length > 0);
});

export const getProduct = cache(async (slug: string) => (await getProducts()).find((product) => product.slug === slug) || null);

export const priceRange = (product: Product) => {
  const prices = product.variants.map((variant) => variant.priceInr);
  return { low: Math.min(...prices), high: Math.max(...prices) };
};

export const isPurchasable = (product: Product) => product.variants.every((variant) => variant.id);

/** Unique option values in catalog order. */
export const optionValues = (variants: Variant[], key: "dimension" | "frameFinish" | "stringDensity") => [...new Set(variants.map((variant) => variant[key]))];
