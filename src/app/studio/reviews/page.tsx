import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { moderateReview } from "@/app/studio/reviews/actions";
import { requireAdmin } from "@/lib/auth";
import { publicStorageUrl } from "@/lib/supabase/public";

export const metadata: Metadata = { title: "Reviews" };

type Review = { id: string; rating: number; review_text: string; customer_name: string; occasion: string | null; is_approved: boolean; is_featured: boolean; photo_consent: boolean; before_image_path: string | null; after_image_path: string | null; admin_reply: string | null; created_at: string; products: { title: string } | null };

export default async function StudioReviewsPage({ searchParams }: { searchParams: Promise<{ message?: string; filter?: string }> }) {
  const { message, filter = "pending" } = await searchParams;
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.from("reviews")
    .select("id,rating,review_text,customer_name,occasion,is_approved,is_featured,photo_consent,before_image_path,after_image_path,admin_reply,created_at,products(title)")
    .eq("is_approved", filter === "approved")
    .order("created_at", { ascending: false })
    .limit(100);
  const reviews = (data || []) as unknown as Review[];
  const action = (review: Review, value: string, label: string, className = "button button-outline") => <form action={moderateReview}><input type="hidden" name="id" value={review.id} /><input type="hidden" name="filter" value={filter} /><input type="hidden" name="action" value={value} /><button className={className} type="submit">{label}</button></form>;

  return <main className="studio-page">
    <div className="studio-heading"><div className="eyebrow">Review moderation</div><h1>Reviews</h1><p>Only reviews from delivered orders can be submitted. Approved reviews appear on the site and in product rich results.</p></div>
    {message === "saved" && <p className="auth-message" role="status">Review updated.</p>}
    {message === "error" && <p className="auth-message auth-error" role="status">That change could not be saved.</p>}
    <nav className="filter-tabs" aria-label="Filter reviews"><Link href="/studio/reviews?filter=pending" className={filter !== "approved" ? "active" : ""}>Waiting for approval</Link><Link href="/studio/reviews?filter=approved" className={filter === "approved" ? "active" : ""}>Published</Link></nav>
    {error ? <div className="empty-state">Reviews could not be loaded.</div> : reviews.length ? <div className="studio-orders">{reviews.map((review) => {
      const before = review.photo_consent ? publicStorageUrl("review-photos", review.before_image_path) : null;
      const after = review.photo_consent ? publicStorageUrl("review-photos", review.after_image_path) : null;
      return <article className="studio-order studio-review" key={review.id}>
        <div className="studio-review-body">
          {(before || after) && <div className="studio-review-photos">{before && <a href={before} target="_blank" rel="noreferrer"><Image src={before} alt="Before" fill sizes="90px" /></a>}{after && <a href={after} target="_blank" rel="noreferrer"><Image src={after} alt="After" fill sizes="90px" /></a>}</div>}
          <div><div className="stars">{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</div><p className="review-text">“{review.review_text}”</p><p className="muted">{review.customer_name} · {review.occasion || "No occasion"} · {review.products?.title} · {new Date(review.created_at).toLocaleDateString("en-IN")}{review.is_featured ? " · Featured" : ""}</p></div>
        </div>
        <form action={moderateReview} className="studio-inline-form"><input type="hidden" name="id" value={review.id} /><input type="hidden" name="filter" value={filter} /><input type="hidden" name="action" value="reply" /><input name="reply" maxLength={600} defaultValue={review.admin_reply || ""} placeholder="Public reply from the studio (optional)" aria-label="Reply" /><button className="button button-outline" type="submit">Save reply</button></form>
        <div className="studio-item-actions">
          {review.is_approved ? action(review, "unapprove", "Unpublish") : action(review, "approve", "Approve & publish", "button")}
          {review.is_featured ? action(review, "unfeature", "Remove from featured") : action(review, "feature", "Feature on home page")}
          {review.photo_consent && (before || after) && action(review, "hide-photos", "Hide photos")}
          {action(review, "delete", "Delete", "text-link danger")}
        </div>
      </article>;
    })}</div> : <div className="empty-state" style={{ marginTop: 22 }}>{filter === "approved" ? "No published reviews yet." : "No reviews are waiting. They arrive after orders are delivered."}</div>}
  </main>;
}
