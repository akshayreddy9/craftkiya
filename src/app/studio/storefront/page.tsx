import type { Metadata } from "next";
import { deleteBanner, deleteFaq, saveBanner, saveFaq } from "@/app/studio/storefront/actions";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Banners & FAQs" };

const messages: Record<string, [string, boolean?]> = {
  saved: ["Saved. The storefront refreshes automatically."],
  deleted: ["Deleted."],
  invalid: ["Please fill in the required fields.", true],
  "invalid-link": ["Links must start with / (a page on this site) or https://.", true],
  "invalid-video": ["For a process video, paste a YouTube link or a direct https:// .mp4 link in Link.", true],
  "save-error": ["That change could not be saved.", true],
};

type Banner = { id: string; kind: string; title: string; body: string | null; target_url: string | null; is_active: boolean; start_date: string | null; end_date: string | null; sort_order: number };
type Faq = { id: string; question: string; answer: string; is_active: boolean; sort_order: number };
const day = (value: string | null) => value ? new Date(value).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }) : "";

function BannerFields({ banner }: { banner?: Banner }) {
  return <>
    <div className="field-grid field-grid-3"><div className="field"><label>Type</label><select name="kind" defaultValue={banner?.kind || "announcement"}><option value="announcement">Announcement strip (top of every page)</option><option value="promo">Home page promo card</option><option value="video">Process video (homepage &amp; product pages)</option></select></div><div className="field"><label>Headline</label><input name="title" required maxLength={140} defaultValue={banner?.title} placeholder="Diwali gifting is open" /></div><div className="field"><label>Highlight text</label><input name="body" maxLength={200} defaultValue={banner?.body || ""} placeholder="Order by 20 Oct for delivery" /></div></div>
    <div className="field-grid field-grid-4"><div className="field"><label>Link</label><input name="targetUrl" maxLength={300} defaultValue={banner?.target_url || ""} placeholder="/gifts" /></div><div className="field"><label>Starts</label><input name="startDate" type="date" defaultValue={day(banner?.start_date || null)} /></div><div className="field"><label>Ends</label><input name="endDate" type="date" defaultValue={day(banner?.end_date || null)} /></div><div className="field"><label>Order</label><input name="sortOrder" type="number" defaultValue={banner?.sort_order ?? 0} /></div></div>
    <label className="check-row"><input type="checkbox" name="isActive" defaultChecked={banner?.is_active ?? true} /> Live</label>
  </>;
}

export default async function StudioStorefrontPage({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  const { message } = await searchParams;
  const { supabase } = await requireAdmin();
  const [{ data: banners }, { data: faqs }] = await Promise.all([
    supabase.from("site_banners").select("id,kind,title,body,target_url,is_active,start_date,end_date,sort_order").order("kind").order("sort_order"),
    supabase.from("faqs").select("id,question,answer,is_active,sort_order").order("sort_order"),
  ]);
  const notice = message ? messages[message] : undefined;
  const now = new Date().toISOString();
  const isLive = (banner: Banner) => banner.is_active && (!banner.start_date || new Date(banner.start_date).toISOString() <= now) && (!banner.end_date || new Date(banner.end_date).toISOString() >= now);

  return <main className="studio-page">
    <div className="studio-heading"><div className="eyebrow">Visual CMS</div><h1>Banners &amp; FAQs</h1><p>Schedule announcements and seasonal promos, and keep the FAQ answers buyers see on every product page up to date.</p></div>
    {notice && <p className={`auth-message${notice[1] ? " auth-error" : ""}`} role="status">{notice[0]}</p>}
    <section className="studio-section"><h2>Announcements &amp; promos</h2><p className="muted">Only one announcement shows at a time (the first live one by order). Up to two promo cards appear on the home page. For the process video, choose “Process video”, put the heading in Headline, a short caption in Highlight text, and a YouTube link (or direct .mp4 link) in Link.</p>
      <div className="studio-orders">{((banners || []) as Banner[]).map((banner) => <article className="studio-order" key={banner.id}><details className="studio-card-details"><summary className="catalog-summary"><div><strong>{banner.title}</strong><span className="muted">{banner.kind === "announcement" ? "Announcement strip" : banner.kind === "video" ? "Process video" : "Promo card"}{banner.body ? ` · ${banner.body}` : ""}</span></div><span className={`status-pill${isLive(banner) ? "" : " muted-pill"}`}>{isLive(banner) ? "Live now" : banner.is_active ? "Scheduled" : "Off"}</span></summary>
        <form action={saveBanner} className="studio-form"><input type="hidden" name="id" value={banner.id} /><BannerFields banner={banner} /><div className="studio-form-foot"><button className="button" type="submit">Save</button></div></form>
        <form action={deleteBanner} className="studio-form-foot studio-delete"><input type="hidden" name="id" value={banner.id} /><button className="text-link danger" type="submit">Delete banner</button></form></details></article>)}</div>
      <form action={saveBanner} className="studio-form studio-order"><h3>New banner</h3><BannerFields /><div className="studio-form-foot"><button className="button" type="submit">Add banner</button></div></form>
    </section>
    <section className="studio-section"><h2>FAQs</h2><p className="muted">Shown on the home page, product pages and gift pages, and published as FAQ structured data for search engines.</p>
      <div className="studio-orders">{((faqs || []) as Faq[]).map((faq) => <article className="studio-order" key={faq.id}><details className="studio-card-details"><summary className="catalog-summary"><div><strong>{faq.question}</strong><span className="muted">{faq.answer.slice(0, 110)}{faq.answer.length > 110 ? "…" : ""}</span></div><span className={`status-pill${faq.is_active ? "" : " muted-pill"}`}>{faq.is_active ? "Live" : "Hidden"}</span></summary>
        <form action={saveFaq} className="studio-form"><input type="hidden" name="id" value={faq.id} /><div className="field"><label>Question</label><input name="question" required maxLength={200} defaultValue={faq.question} /></div><div className="field"><label>Answer</label><textarea name="answer" required rows={3} maxLength={2000} defaultValue={faq.answer} /></div><div className="studio-form-foot"><label className="check-row"><input type="checkbox" name="isActive" defaultChecked={faq.is_active} /> Live</label><input className="small-input" name="sortOrder" type="number" defaultValue={faq.sort_order} aria-label="Order" /><button className="button" type="submit">Save</button></div></form>
        <form action={deleteFaq} className="studio-form-foot studio-delete"><input type="hidden" name="id" value={faq.id} /><button className="text-link danger" type="submit">Delete FAQ</button></form></details></article>)}</div>
      <form action={saveFaq} className="studio-form studio-order"><h3>New FAQ</h3><div className="field"><label>Question</label><input name="question" required maxLength={200} /></div><div className="field"><label>Answer</label><textarea name="answer" required rows={3} maxLength={2000} /></div><div className="studio-form-foot"><label className="check-row"><input type="checkbox" name="isActive" defaultChecked /> Live</label><input className="small-input" name="sortOrder" type="number" defaultValue={(faqs?.length || 0) + 1} aria-label="Order" /><button className="button" type="submit">Add FAQ</button></div></form>
    </section>
  </main>;
}
