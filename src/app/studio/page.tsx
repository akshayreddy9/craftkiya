import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { markOrderPaidManually, sendArtworkApprovalEmail, updateOrder, uploadArtworkPreview } from "@/app/studio/actions";
import { requireAdmin } from "@/lib/auth";
import { isEmailConfigured } from "@/lib/email";
import { orderStatuses, paymentNames, statusNames } from "@/lib/order-status";
import { money } from "@/lib/site";

export const metadata: Metadata = { title: "Orders" };

const messages: Record<string, [string, boolean?]> = {
  saved: ["Order updated."],
  "saved-emailed": ["Order updated and the customer was emailed their tracking details."],
  paid: ["Payment recorded. The order is confirmed."],
  "paid-invalid": ["Enter a payment reference (e.g. UPI transaction ID) to mark an order paid.", true],
  "proof-saved": ["Preview uploaded privately. The order moved to “Preview ready”."],
  "proof-emailed": ["Preview uploaded and the customer was emailed to approve it."],
  "proof-saved-no-email": ["Preview uploaded. Email isn’t configured, so let the customer know another way.", true],
  "proof-email-failed": ["Preview uploaded, but the email could not be sent.", true],
  "email-sent": ["Approval email sent."],
  "email-not-configured": ["Email isn’t configured. Add the SMTP settings (or Resend) to the server environment.", true],
  "proof-invalid": ["Proofs must be JPG, PNG or WEBP under 10 MB.", true],
};

type Approval = { id: string; approval_status: string; client_feedback: string | null; created_at: string; draft_image_path: string | null };
type Item = { id: string; product_title: string; variant_snapshot: Record<string, string> | null; unit_price: number; quantity: number; custom_reference_image_path: string | null; custom_notes: string | null; custom_artwork_approvals: Approval[] | null };
type Order = {
  id: string; order_number: string; status: string; payment_status: string; payment_provider: string | null; payment_id: string | null; total_amount: number; created_at: string;
  contact_name: string | null; contact_email: string | null; contact_phone: string | null; gift_note: string | null; shipping_address: Record<string, string> | null;
  courier_awb: string | null; courier_name: string | null; tracking_url: string | null; shipment_status: string | null; order_items: Item[] | null;
};

const filters = [["active", "Needs attention"], ["pending_payment", "Awaiting payment"], ["confirmed", "To draft"], ["draft_prepared", "Awaiting approval"], ["preview_approved", "Ready to make"], ["in_production", "In production"], ["dispatched", "Dispatched"], ["delivered", "Delivered"], ["all", "All"]] as const;

export default async function StudioOrdersPage({ searchParams }: { searchParams: Promise<{ message?: string; status?: string; q?: string }> }) {
  const { message, status = "active", q = "" } = await searchParams;
  const { supabase } = await requireAdmin();

  let query = supabase.from("orders")
    .select("id,order_number,status,payment_status,payment_provider,payment_id,total_amount,created_at,contact_name,contact_email,contact_phone,gift_note,shipping_address,courier_awb,courier_name,tracking_url,shipment_status,order_items(id,product_title,variant_snapshot,unit_price,quantity,custom_reference_image_path,custom_notes,custom_artwork_approvals(id,approval_status,client_feedback,created_at,draft_image_path))")
    .order("created_at", { ascending: false })
    .limit(100);
  const search = q.trim().slice(0, 40);
  if (search) query = query.or(`order_number.ilike.%${search.replace(/[^a-zA-Z0-9@.+-]/g, "")}%,contact_email.ilike.%${search.replace(/[^a-zA-Z0-9@.+-]/g, "")}%`);
  else if (status === "active") query = query.in("status", ["pending_payment", "confirmed", "draft_prepared", "preview_approved", "in_production"]);
  else if (status !== "all" && (orderStatuses as readonly string[]).includes(status)) query = query.eq("status", status);

  const [{ data, error }, { data: counts }] = await Promise.all([query, supabase.from("orders").select("status")]);
  const orders = (data || []) as Order[];
  const countBy = (counts || []).reduce<Record<string, number>>((acc, row) => { acc[row.status] = (acc[row.status] || 0) + 1; return acc; }, {});
  const items = orders.flatMap((order) => order.order_items || []);
  const refPaths = items.map((item) => item.custom_reference_image_path).filter((path): path is string => Boolean(path));
  const proofPaths = items.flatMap((item) => (item.custom_artwork_approvals || []).map((approval) => approval.draft_image_path)).filter((path): path is string => Boolean(path));
  const [refs, proofs] = await Promise.all([
    refPaths.length ? supabase.storage.from("customer-reference-images").createSignedUrls(refPaths, 900) : { data: [] },
    proofPaths.length ? supabase.storage.from("approval-previews").createSignedUrls(proofPaths, 900) : { data: [] },
  ]);
  const signed = new Map([...(refs.data || []), ...(proofs.data || [])].filter((entry) => entry.path && entry.signedUrl).map((entry) => [entry.path as string, entry.signedUrl as string]));
  const returnTo = `/studio?status=${encodeURIComponent(status)}${search ? `&q=${encodeURIComponent(search)}` : ""}`;
  const notice = message ? messages[message] || ["That update could not be completed. Check the details and try again.", true] : null;
  const emailReady = isEmailConfigured();

  return <main className="studio-page">
    <div className="studio-heading"><div className="eyebrow">The maker’s desk</div><h1>Order pipeline</h1><p>Confirm payments, share proofs, track making and dispatch.</p></div>
    {notice && <p className={`auth-message${notice[1] ? " auth-error" : ""}`} role="status">{notice[0]}</p>}
    <div className="studio-toolbar"><nav className="filter-tabs" aria-label="Filter orders">{filters.map(([key, label]) => { const count = key === "all" ? undefined : key === "active" ? ["pending_payment", "confirmed", "draft_prepared", "preview_approved", "in_production"].reduce((sum, value) => sum + (countBy[value] || 0), 0) : countBy[key] || 0; return <Link key={key} href={`/studio?status=${key}`} className={status === key && !search ? "active" : ""}>{label}{count !== undefined && <span>{count}</span>}</Link>; })}</nav>
      <form className="studio-search" role="search"><input name="q" defaultValue={search} placeholder="Order no. or email" aria-label="Search orders" /><button className="button button-outline" type="submit">Search</button></form></div>

    {error ? <div className="empty-state">Orders could not be loaded. Confirm all Supabase migrations have been applied.</div> : orders.length ? <div className="studio-orders">
      {orders.map((order) => {
        const address = order.shipping_address || {};
        return <article className="studio-order" key={order.id}>
          <div className="studio-order-top">
            <div><span className="order-id">{order.order_number} · {new Date(order.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span><strong>{order.contact_name || "Customer"}</strong><span className="muted">{order.contact_email}{order.contact_phone ? ` · ${order.contact_phone}` : ""}</span></div>
            <div className="studio-order-money"><strong>{money(order.total_amount)}</strong><span className={`status-pill payment-${order.payment_status}`}>{paymentNames[order.payment_status] || order.payment_status}{order.payment_provider ? ` · ${order.payment_provider}` : ""}</span></div>
          </div>
          <div className="studio-order-details"><p><strong>Ship to:</strong> {[address.line1, address.line2, address.landmark, address.city, address.state, address.pincode].filter(Boolean).join(", ") || "—"}</p>{order.gift_note && <p><strong>Gift note:</strong> {order.gift_note}</p>}{order.shipment_status && <p><strong>Courier status:</strong> {order.shipment_status}</p>}</div>
          {order.payment_status !== "paid" && <form action={markOrderPaidManually} className="studio-inline-form"><input type="hidden" name="orderId" value={order.id} /><input type="hidden" name="returnTo" value={returnTo} /><input name="reference" placeholder="UPI / bank reference" maxLength={120} aria-label="Payment reference" required /><button className="button button-outline" type="submit">Mark paid (offline)</button></form>}
          <form action={updateOrder} className="studio-order-form">
            <input type="hidden" name="orderId" value={order.id} /><input type="hidden" name="returnTo" value={returnTo} />
            <div className="studio-controls studio-controls-4">
              <label><span>Progress</span><select name="status" defaultValue={order.status}>{orderStatuses.map((value) => <option value={value} key={value}>{statusNames[value]}</option>)}</select></label>
              <label><span>Courier AWB</span><input name="courierAwb" defaultValue={order.courier_awb || ""} maxLength={100} placeholder="Tracking number" /></label>
              <label><span>Courier</span><input name="courierName" defaultValue={order.courier_name || ""} maxLength={80} placeholder="Delhivery" /></label>
              <label><span>Tracking link</span><input name="trackingUrl" type="url" defaultValue={order.tracking_url || ""} maxLength={300} placeholder="https://…" /></label>
            </div>
            <div className="studio-form-foot"><label className="check-row"><input type="checkbox" name="notify" defaultChecked disabled={!emailReady} /> Email the customer when marked dispatched or delivered</label><button className="button" type="submit">Save order</button></div>
          </form>
          {order.order_items?.map((item) => {
            const approvals = [...(item.custom_artwork_approvals || [])].sort((a, b) => b.created_at.localeCompare(a.created_at));
            const latest = approvals[0];
            const reference = item.custom_reference_image_path ? signed.get(item.custom_reference_image_path) : undefined;
            return <div className="studio-item" key={item.id}>
              <div className="studio-item-grid">
                <div className="studio-ref">{reference ? <a href={reference} target="_blank" rel="noreferrer" title="Open full-size customer photo"><Image src={reference} alt={`Customer reference for ${item.product_title}`} fill sizes="96px" unoptimized /></a> : <span>Waiting for customer photo</span>}</div>
                <div>
                  <strong>{item.product_title}</strong>
                  <p className="muted">{[item.variant_snapshot?.dimension, item.variant_snapshot?.frame_finish, item.variant_snapshot?.string_density].filter(Boolean).join(" · ")} · {money(item.unit_price)}{item.quantity > 1 ? ` × ${item.quantity}` : ""}</p>
                  {item.custom_notes && <p className="studio-notes">{item.custom_notes}</p>}
                  {latest && <p className={`approval-state approval-${latest.approval_status}`}>Latest proof: {latest.approval_status === "pending" ? "awaiting customer" : latest.approval_status === "approved" ? "approved ✓" : "edit requested"}{latest.client_feedback ? ` — “${latest.client_feedback}”` : ""}{latest.draft_image_path && signed.get(latest.draft_image_path) ? <> · <a className="text-link" href={signed.get(latest.draft_image_path)} target="_blank" rel="noreferrer">view</a></> : null}</p>}
                  {approvals.length > 1 && <details className="earlier-drafts"><summary>Proof history ({approvals.length})</summary>{approvals.slice(1).map((approval) => <p key={approval.id} className="muted">{new Date(approval.created_at).toLocaleDateString("en-IN")} · {approval.approval_status}{approval.client_feedback ? ` — “${approval.client_feedback}”` : ""}</p>)}</details>}
                </div>
              </div>
              <div className="studio-item-actions">
                <form action={uploadArtworkPreview}><input type="hidden" name="orderItemId" value={item.id} /><input type="hidden" name="returnTo" value={returnTo} /><input type="file" name="proof" accept="image/jpeg,image/png,image/webp" required aria-label={`Preview proof for ${item.product_title}`} /><label className="check-row"><input type="checkbox" name="notify" defaultChecked={emailReady} disabled={!emailReady} /> Email customer</label><button className="button" type="submit">Upload proof</button></form>
                <form action={sendArtworkApprovalEmail}><input type="hidden" name="orderItemId" value={item.id} /><input type="hidden" name="returnTo" value={returnTo} /><button className="button button-outline" type="submit" disabled={latest?.approval_status !== "pending" || !emailReady}>Resend approval email</button></form>
              </div>
            </div>;
          })}
        </article>;
      })}
    </div> : <div className="empty-state" style={{ marginTop: 22 }}>{search ? "No orders match that search." : "Nothing here right now."}</div>}
  </main>;
}
