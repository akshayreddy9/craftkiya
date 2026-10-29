import { cache } from "react";
import { createSupabasePublicClient, publicStorageUrl } from "@/lib/supabase/public";

export type Faq = { question: string; answer: string };
export type Banner = { id: string; title: string; body: string | null; targetUrl: string | null; imageUrl: string | null };
export type Review = {
  id: string; productId: string; rating: number; text: string; customerName: string; occasion: string | null;
  beforeUrl: string | null; afterUrl: string | null; adminReply: string | null; featured: boolean; createdAt: string;
};

// Mirrors the FAQ seed in supabase/migrations/202610280002_seed_catalog.sql.
export const fallbackFaqs: Faq[] = [
  { question: "What kind of photo should I send?", answer: "Choose a well-lit, in-focus photo where the people you want in your portrait are easy to see. A close-up with a simple background usually translates beautifully into thread art. Phone photos are perfect as long as they are not heavily filtered." },
  { question: "Do I get to see it before you make it?", answer: "Yes. We prepare a digital draft and share it in your Craftkiya account for approval. Your piece only moves into physical making after you approve it, and you can request edits first." },
  { question: "How long does it take?", answer: "Your digital preview is usually ready within 2–3 working days. Once you approve it, threading and framing take around 5–7 working days, followed by insured delivery anywhere in India." },
  { question: "Can I send it as a gift?", answer: "Absolutely. Add a gift note at checkout and ship it straight to the recipient. Prices are never printed on the packaging." },
  { question: "What size is the portrait?", answer: "Every Craftkiya portrait is a 24-inch (about 61 cm) circle on a white ring frame, threaded by hand with a single continuous black thread. It is sized to be the centrepiece of a wall." },
  { question: "Can I return a custom portrait?", answer: "Because every portrait is made to order from your photo, we cannot accept returns for a change of mind. If your piece arrives damaged or differs from the approved preview, tell us within 48 hours of delivery and we will repair or remake it." },
  { question: "Is my photo kept private?", answer: "Your photo is stored in a private, access-controlled folder that only you and our studio team can open. We never publish it without your written permission." },
];

export const getFaqs = cache(async (): Promise<Faq[]> => {
  const supabase = createSupabasePublicClient();
  if (!supabase) return fallbackFaqs;
  const { data, error } = await supabase.from("faqs").select("question,answer").eq("is_active", true).order("sort_order");
  return error || !data?.length ? fallbackFaqs : data;
});

export const getBanners = cache(async (): Promise<{ announcement: Banner | null; promos: Banner[]; video: Banner | null }> => {
  const supabase = createSupabasePublicClient();
  if (!supabase) return { announcement: null, promos: [], video: null };
  // RLS returns only active banners inside their date window to the public.
  const { data } = await supabase.from("site_banners").select("id,kind,title,body,target_url,image_url,sort_order").order("sort_order").order("created_at", { ascending: false });
  const rows = (data || []).map((row) => ({ kind: row.kind as string, id: row.id, title: row.title, body: row.body, targetUrl: safeHref(row.target_url), imageUrl: row.image_url }));
  return {
    announcement: rows.find((row) => row.kind === "announcement") || null,
    promos: rows.filter((row) => row.kind === "promo").slice(0, 2),
    video: rows.find((row) => row.kind === "video" && row.targetUrl) || null,
  };
});

function safeHref(value: string | null) {
  if (!value) return null;
  return value.startsWith("/") && !value.startsWith("//") ? value : /^https:\/\//.test(value) ? value : null;
}

export const getReviews = cache(async (): Promise<Review[]> => {
  const supabase = createSupabasePublicClient();
  if (!supabase) return [];
  const { data, error } = await supabase.from("reviews")
    .select("id,product_id,rating,review_text,customer_name,occasion,before_image_path,after_image_path,photo_consent,admin_reply,is_featured,created_at")
    .eq("is_approved", true)
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(200);
  if (error || !data) return [];
  return data.map((row) => ({
    id: row.id, productId: row.product_id, rating: row.rating, text: row.review_text, customerName: row.customer_name || "Craftkiya customer",
    occasion: row.occasion, adminReply: row.admin_reply, featured: row.is_featured, createdAt: row.created_at,
    beforeUrl: row.photo_consent ? publicStorageUrl("review-photos", row.before_image_path) : null,
    afterUrl: row.photo_consent ? publicStorageUrl("review-photos", row.after_image_path) : null,
  }));
});

export function summarizeReviews(reviews: Review[]) {
  if (!reviews.length) return null;
  const average = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
  return { average: Math.round(average * 10) / 10, count: reviews.length };
}
