import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Package, UserRound } from "lucide-react";
import { changePassword, respondToArtworkApproval, submitReview, updateProfile } from "@/app/account/actions";
import { PayButton } from "@/app/account/pay-button";
import { PhotoUpload } from "@/app/account/photo-upload";
import { signOutAction } from "@/app/auth/actions";
import { requireUser } from "@/lib/auth";
import { paymentsEnabled } from "@/lib/orders";
import { paymentNames, progressIndex, progressStages, statusNames } from "@/lib/order-status";
import { money } from "@/lib/site";
import { getSupabaseConfig } from "@/lib/supabase/env";

export const metadata: Metadata = { title: "My account", robots: { index: false, follow: false } };

const messages: Record<string, [string, boolean?]> = {
  "approval-saved": ["Thank you! Your preview is approved and your portrait is heading to the making table."],
  "edit-requested": ["Your notes are with the artist. We’ll share an updated preview soon."],
  "feedback-needed": ["Please tell the artist what you’d like changed before requesting an edit.", true],
  "approval-error": ["We couldn’t save that response. Please refresh and try again.", true],
  "order-placed": ["Your order is placed. The studio will review it and send you a secure payment link."],
  paid: ["Payment received — thank you! Your artist will start on your digital preview."],
  "payment-pending": ["Your order is saved but not yet paid. Complete payment below whenever you’re ready."],
  "review-saved": ["Thank you for your review! It will appear on the site once the studio has checked it."],
  "review-invalid": ["Please choose a rating and write at least a sentence.", true],
  "review-photo": ["Review photos must be JPG, PNG or WEBP and under 6 MB.", true],
  "review-error": ["We couldn’t save that review. Please try again.", true],
  "profile-saved": ["Your details are updated."],
  "profile-invalid": ["Please enter your name and a valid mobile number.", true],
  "password-saved": ["Your password is changed."],
  "password-short": ["Your new password needs at least 8 characters.", true],
  "password-mismatch": ["The two passwords don’t match. Please try again.", true],
  "password-same": ["That’s your current password. Please choose a new one.", true],
  "password-error": ["We couldn’t change your password. Please sign out and use “Forgot password?” instead.", true],
};

type Approval = { id: string; draft_image_path: string | null; approval_status: string; client_feedback: string | null; created_at: string };
type OrderItem = { id: string; product_title: string; variant_snapshot: Record<string, string> | null; unit_price: number; custom_reference_image_path: string | null; custom_notes: string | null; custom_artwork_approvals: Approval[] | null; reviews: { id: string }[] | null };
type Order = { id: string; order_number: string; status: string; payment_status: string; total_amount: number; created_at: string; courier_awb: string | null; courier_name: string | null; tracking_url: string | null; shipment_status: string | null; order_items: OrderItem[] | null };

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ message?: string; order?: string; section?: string }> }) {
  const { message, order: highlight, section } = await searchParams;
  const showDetails = section === "details";
  if (!getSupabaseConfig()) return <main className="account-page"><div className="setup-card">Connect Supabase to enable customer accounts. See <code>README.md</code> for setup.</div></main>;
  const { supabase, user } = await requireUser("/account");
  const [{ data: profile }, { data, error }] = await Promise.all([
    supabase.from("profiles").select("display_name,phone,role").eq("id", user.id).maybeSingle(),
    supabase.from("orders")
      .select("id,order_number,status,payment_status,total_amount,created_at,courier_awb,courier_name,tracking_url,shipment_status,order_items(id,product_title,variant_snapshot,unit_price,custom_reference_image_path,custom_notes,custom_artwork_approvals(id,draft_image_path,approval_status,client_feedback,created_at),reviews(id))")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);
  const orders = (data || []) as Order[];
  const items = orders.flatMap((order) => order.order_items || []);
  const referencePaths = items.map((item) => item.custom_reference_image_path).filter((path): path is string => Boolean(path));
  const draftPaths = items.flatMap((item) => (item.custom_artwork_approvals || []).map((approval) => approval.draft_image_path)).filter((path): path is string => Boolean(path));
  const [references, drafts] = await Promise.all([
    referencePaths.length ? supabase.storage.from("customer-reference-images").createSignedUrls(referencePaths, 3600) : { data: [] },
    draftPaths.length ? supabase.storage.from("approval-previews").createSignedUrls(draftPaths, 3600) : { data: [] },
  ]);
  const signed = new Map([...(references.data || []), ...(drafts.data || [])].filter((entry) => entry.path && entry.signedUrl).map((entry) => [entry.path as string, entry.signedUrl as string]));
  const canPayOnline = paymentsEnabled();
  const notice = message ? messages[message] : undefined;

  return <main className="account-page">
    <div className="account-heading"><div className="eyebrow">Your little corner</div><h1>Hello{profile?.display_name ? `, ${profile.display_name.split(" ")[0]}` : ""}.</h1><p>Here’s where your portraits and their stories live.</p>{profile?.role === "admin" && <Link className="text-link" href="/studio">Open the studio</Link>}</div>
    <nav className="account-tabs" aria-label="Your account">
      <Link href="/account" className={showDetails ? "" : "active"} aria-current={showDetails ? undefined : "page"}><Package size={17} /> My orders{orders.length > 0 && <em>{orders.length}</em>}</Link>
      <Link href="/account?section=details" className={showDetails ? "active" : ""} aria-current={showDetails ? "page" : undefined}><UserRound size={17} /> My details</Link>
    </nav>
    {notice && <p className={`auth-message${notice[1] ? " auth-error" : ""}`} role="status">{notice[0]}</p>}
    {!showDetails && <div className="order-list">{error ? <div className="empty-state">We couldn’t load your orders. Please try again later.</div> : orders.length ? orders.map((order) => {
      const currentStage = progressIndex(order.status);
      return <article className={`order-card${highlight === order.order_number ? " highlighted" : ""}`} key={order.id} id={order.order_number}>
        <div className="order-row"><div><h3>Order {order.order_number}</h3><p>{new Date(order.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" })} · {money(order.total_amount)} · {paymentNames[order.payment_status] || order.payment_status}</p></div><span className={`status-pill status-${order.status}`}>{statusNames[order.status] || order.status}</span></div>
        {order.status === "pending_payment" && <div className="order-callout"><p>Your order is saved. {canPayOnline ? "Complete payment to start your digital preview." : "The studio will send you a secure payment link shortly."}</p>{canPayOnline && <PayButton orderId={order.id} label={`Pay ${money(order.total_amount)}`} />}</div>}
        {order.status !== "cancelled" && order.status !== "pending_payment" && <ol className="order-progress" aria-label="Order progress">{progressStages.map((stage, index) => <li className={index < currentStage ? "complete" : index === currentStage ? "complete current" : ""} key={stage} aria-current={index === currentStage ? "step" : undefined}><span>{index < currentStage ? "✓" : index + 1}</span><small>{statusNames[stage]}</small></li>)}</ol>}
        {order.courier_awb && <div className="order-callout"><p>{order.status === "delivered" ? "Delivered" : "On its way"}{order.courier_name ? ` with ${order.courier_name}` : ""} · Tracking <strong>{order.courier_awb}</strong>{order.shipment_status ? ` · ${order.shipment_status}` : ""}</p>{order.tracking_url && /^https:\/\//.test(order.tracking_url) && <a className="text-link" href={order.tracking_url} target="_blank" rel="noreferrer">Track parcel</a>}</div>}
        {(order.order_items || []).map((item) => {
          const approvals = [...(item.custom_artwork_approvals || [])].sort((a, b) => b.created_at.localeCompare(a.created_at));
          const [latest, ...earlier] = approvals;
          const reference = item.custom_reference_image_path ? signed.get(item.custom_reference_image_path) : undefined;
          const latestUrl = latest?.draft_image_path ? signed.get(latest.draft_image_path) : undefined;
          return <div className="account-item" key={item.id}>
            <div className="account-item-head">{reference && <a href={reference} target="_blank" rel="noreferrer" className="account-thumb"><Image src={reference} alt="Your reference photo" fill sizes="56px" unoptimized /></a>}<div><h4>{item.product_title}</h4><p>{[item.variant_snapshot?.dimension, item.variant_snapshot?.frame_finish, item.variant_snapshot?.string_density].filter(Boolean).join(" · ")} · {money(item.unit_price)}</p>{item.custom_notes && <p className="fine-print align-left">Your notes: {item.custom_notes}</p>}</div></div>
            {!item.custom_reference_image_path && !latest && ["pending_payment", "confirmed"].includes(order.status) && <PhotoUpload orderItemId={item.id} userId={user.id} />}
            {latest ? <section className="approval-panel"><h4>{latest.approval_status === "pending" ? "Your digital preview is ready" : "Artwork preview"}</h4>
              {latestUrl ? <a href={latestUrl} target="_blank" rel="noreferrer" className="approval-image"><Image src={latestUrl} alt={`Digital preview for ${item.product_title}`} fill sizes="(max-width: 680px) 90vw, 420px" unoptimized /></a> : <p className="fine-print align-left">Your artist is preparing the preview.</p>}
              {latest.client_feedback && <p className="fine-print align-left">Your note: {latest.client_feedback}</p>}
              {latest.approval_status === "pending" ? <form action={respondToArtworkApproval}><input type="hidden" name="approvalId" value={latest.id} /><div className="field"><label htmlFor={`feedback-${latest.id}`}>Anything to change? <span>(required if requesting an edit)</span></label><textarea id={`feedback-${latest.id}`} name="feedback" maxLength={1000} rows={2} placeholder="e.g. Could the smile be a little softer?" /></div><div className="approval-actions"><button className="button" type="submit" name="decision" value="approved">Approve &amp; start making</button><button className="button button-outline" type="submit" name="decision" value="rejected">Request an edit</button></div></form> : <span className="status-pill">{latest.approval_status === "approved" ? "Approved" : "Edit requested — new preview coming"}</span>}
              {earlier.length > 0 && <details className="earlier-drafts"><summary>Earlier drafts ({earlier.length})</summary>{earlier.map((approval) => <p key={approval.id} className="fine-print align-left">{new Date(approval.created_at).toLocaleDateString("en-IN")} · {approval.approval_status === "rejected" ? "Edit requested" : approval.approval_status}{approval.client_feedback ? ` — “${approval.client_feedback}”` : ""}{approval.draft_image_path && signed.get(approval.draft_image_path) ? <> · <a className="text-link" href={signed.get(approval.draft_image_path)} target="_blank" rel="noreferrer">View</a></> : null}</p>)}</details>}
            </section> : order.status !== "pending_payment" && order.status !== "cancelled" && item.custom_reference_image_path && <p className="fine-print align-left">Your artist is mapping your photo. We’ll email you when the digital preview is ready.</p>}
            {order.status === "delivered" && !item.reviews?.length && <details className="review-form"><summary>Share how it turned out</summary><form action={submitReview} encType="multipart/form-data"><input type="hidden" name="orderItemId" value={item.id} />
              <fieldset className="rating-input"><legend>Your rating</legend>{[5, 4, 3, 2, 1].map((value) => <label key={value}><input type="radio" name="rating" value={value} required defaultChecked={value === 5} /><span>{"★".repeat(value)}</span></label>)}</fieldset>
              <div className="field"><label htmlFor={`review-${item.id}`}>Your review</label><textarea id={`review-${item.id}`} name="reviewText" required minLength={10} maxLength={1200} rows={3} placeholder="How did it feel to open it, or to give it?" /></div>
              <div className="field"><label htmlFor={`occasion-${item.id}`}>Occasion <span>(optional)</span></label><input id={`occasion-${item.id}`} name="occasion" maxLength={60} placeholder="Anniversary gift" /></div>
              <div className="field"><label htmlFor={`photo-${item.id}`}>Photo of your portrait at home <span>(optional, JPG/PNG up to 6 MB)</span></label><input id={`photo-${item.id}`} name="afterPhoto" type="file" accept="image/jpeg,image/png,image/webp" /></div>
              <label className="check-row"><input type="checkbox" name="photoConsent" /> I’m happy for Craftkiya to show my photos publicly with this review.</label>
              <label className="check-row"><input type="checkbox" name="includeOriginal" /> Also show my original reference photo as a before &amp; after.</label>
              <button className="button" type="submit">Submit review</button></form></details>}
          </div>;
        })}
      </article>;
    }) : <div className="orders-empty"><span className="orders-empty-icon"><Package size={30} /></span><h2>No orders yet</h2><p>Your portraits will appear here, with live progress from digital preview to delivery.</p><Link className="button button-clay" href="/#collection">Choose your portrait</Link></div>}</div>}
    {showDetails && <section className="details-card" id="details">
      <div className="details-head"><span className="account-avatar">{(profile?.display_name || user.email || "?").charAt(0).toUpperCase()}</span><div><h2>{profile?.display_name || "Your details"}</h2><p>{user.email || user.phone}</p></div></div>
      <form action={updateProfile} className="details-form"><div className="field"><label htmlFor="profile-name">Full name</label><input id="profile-name" name="name" required maxLength={100} defaultValue={profile?.display_name || ""} autoComplete="name" /></div><div className="field"><label htmlFor="profile-phone">Mobile number</label><input id="profile-phone" name="phone" type="tel" defaultValue={profile?.phone || ""} autoComplete="tel" /></div><div className="field"><label htmlFor="profile-email">Email</label><input id="profile-email" value={user.email || ""} disabled readOnly /></div><button className="button button-clay" type="submit">Save details</button></form>
      <details className="password-change"><summary>Change password</summary><form action={changePassword} className="details-form"><div className="field"><label htmlFor="new-password">New password</label><input id="new-password" name="password" type="password" required minLength={8} maxLength={72} autoComplete="new-password" /></div><div className="field"><label htmlFor="confirm-password">Confirm new password</label><input id="confirm-password" name="confirm" type="password" required minLength={8} maxLength={72} autoComplete="new-password" /></div><button className="button button-outline" type="submit">Update password</button></form></details>
      <p className="fine-print align-left">To delete your account and photos, email craftkiya.support@gmail.com.</p>
    </section>}
    <form action={signOutAction} className="account-signout-row"><button className="text-link" type="submit">Sign out</button></form>
  </main>;
}
