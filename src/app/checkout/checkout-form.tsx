"use client";

import { useState, useSyncExternalStore, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, ShieldCheck } from "lucide-react";
import { placeOrder } from "@/app/checkout/actions";
import { useCart, type CartItem } from "@/components/cart-provider";
import { useCartPhoto } from "@/components/cart-photo";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getPhoto, savePhoto, validatePhoto } from "@/lib/photo-store";
import { payWithRazorpay } from "@/lib/razorpay-client";
import { money } from "@/lib/site";

const states = ["Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chandigarh", "Chhattisgarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"];
const extensions: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic", "image/heif": "heif" };
const noop = () => () => {};

type Props = { userId: string; email: string; defaultName: string; defaultPhone: string; prices: Record<string, number>; paymentsEnabled: boolean };

function CheckoutLine({ item, price, onPhoto, version }: { item: CartItem; price: number | undefined; onPhoto: (file: File) => void; version: number }) {
  const { updateItem, removeItem } = useCart();
  const { url, loaded, blob } = useCartPhoto(item.id, version);
  return <article className="checkout-line">
    <div className="checkout-thumb">{url ? <span style={{ backgroundImage: `url(${url})`, backgroundPosition: `${item.focus.x}% ${item.focus.y}%` }} /> : <small>{loaded && blob ? "Photo attached" : "No photo"}</small>}</div>
    <div className="checkout-line-body">
      <div className="checkout-line-head"><h3>{item.productTitle}</h3><strong>{price ? money(price) : "Unavailable"}</strong></div>
      <p>{item.dimension} · {item.frameFinish} · {item.stringDensity}</p>
      {!price && <p className="cart-warning">This option is no longer available. Please remove it and choose again.</p>}
      {price && price !== item.price && <p className="cart-warning">Price updated to {money(price)}.</p>}
      {loaded && !blob && <p className="photo-later">No photo yet: add it now, or upload it from your account after ordering.</p>}
      <label className="text-link file-link">{blob ? "Replace photo" : "Add your photo now"}<input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif" onChange={(event) => { const file = event.target.files?.[0]; if (file) onPhoto(file); }} /></label>
      <textarea aria-label={`Notes for the artist about ${item.productTitle}`} rows={2} maxLength={500} placeholder="Notes for the artist (optional)" defaultValue={item.notes} onBlur={(event) => updateItem(item.id, { notes: event.target.value.slice(0, 1000) })} />
      <button type="button" className="remove-line" onClick={() => removeItem(item.id)}>Remove</button>
    </div>
  </article>;
}

export function CheckoutForm({ userId, email, defaultName, defaultPhone, prices, paymentsEnabled }: Props) {
  const router = useRouter();
  const { items, updateItem, clearCart } = useCart();
  const hydrated = useSyncExternalStore(noop, () => true, () => false);
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [stage, setStage] = useState<"idle" | "uploading" | "placing" | "paying">("idle");
  const [error, setError] = useState("");
  const [photoVersions, setPhotoVersions] = useState<Record<string, number>>({});
  const total = items.reduce((sum, item) => sum + (item.variantId ? prices[item.variantId] || 0 : 0), 0);
  const unavailable = items.some((item) => !item.variantId || !prices[item.variantId]);

  const attachPhoto = async (item: CartItem, file: File) => {
    const problem = validatePhoto(file);
    if (problem) { setError(problem); return; }
    try {
      await savePhoto(item.id, file);
      updateItem(item.id, { photoName: file.name });
      setPhotoVersions((current) => ({ ...current, [item.id]: (current[item.id] || 0) + 1 }));
      setError("");
    } catch { setError("We couldn’t read that photo. Please try another file."); }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (unavailable) { setError("Please remove unavailable items from your bag first."); return; }
    const form = new FormData(event.currentTarget);
    const field = (name: string) => String(form.get(name) || "").trim();
    setError("");
    setStage("uploading");
    try {
      const supabase = createSupabaseBrowserClient();
      const uploaded: { variantId: string; referencePath: string; notes: string }[] = [];
      for (const item of items) {
        const blob = await getPhoto(item.id);
        const framing = item.focus.x !== 50 || item.focus.y !== 50 ? `Framing focus: ${item.focus.x}% across, ${item.focus.y}% down.` : "";
        // No photo yet ("customize later"): the customer uploads it from their account after ordering.
        if (!blob) { uploaded.push({ variantId: item.variantId as string, referencePath: "", notes: item.notes }); continue; }
        const type = blob.type || "image/jpeg";
        const path = `${userId}/${idempotencyKey}/${item.id}.${extensions[type] || "jpg"}`;
        const { error: uploadError } = await supabase.storage.from("customer-reference-images").upload(path, blob, { contentType: type, upsert: false });
        if (uploadError && !/exists|duplicate/i.test(uploadError.message)) throw new Error("A photo upload failed. Please check your connection and try again.");
        uploaded.push({ variantId: item.variantId as string, referencePath: path, notes: [item.notes, framing].filter(Boolean).join("\n") });
      }
      setStage("placing");
      const result = await placeOrder({
        idempotencyKey,
        items: uploaded,
        contact: { name: field("name"), phone: field("phone") },
        shipping: { line1: field("line1"), line2: field("line2"), landmark: field("landmark"), city: field("city"), state: field("state"), pincode: field("pincode") },
        giftNote: field("giftNote"),
      });
      if (!result.ok) { setError(result.error); setStage("idle"); return; }
      clearCart();
      if (result.payment) {
        setStage("paying");
        const payment = await payWithRazorpay(result.payment);
        router.push(`/account?order=${result.orderNumber}&message=${payment.ok ? "paid" : "payment-pending"}`);
      } else {
        router.push(`/account?order=${result.orderNumber}&message=order-placed`);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong. Please try again.");
      setStage("idle");
    }
  };

  if (!hydrated) return <div className="checkout-loading">Loading your bag…</div>;
  if (!items.length && stage === "idle") return <div className="empty-state">Your bag is empty. <Link className="text-link" href="/#collection">Create a portrait</Link></div>;
  const busy = stage !== "idle";

  return <form className="checkout-grid" onSubmit={submit}>
    <div className="checkout-main">
      <section className="checkout-panel"><h2>1. Your portraits</h2>{items.map((item) => <CheckoutLine key={item.id} item={item} price={item.variantId ? prices[item.variantId] : undefined} version={photoVersions[item.id] || 0} onPhoto={(file) => attachPhoto(item, file)} />)}<p className="fine-print align-left"><Lock size={11} /> Photos upload to a private folder only you and the studio can open.</p></section>
      <section className="checkout-panel"><h2>2. Contact</h2>
        <div className="field-grid"><div className="field"><label htmlFor="co-name">Full name</label><input id="co-name" name="name" autoComplete="name" required minLength={2} maxLength={100} defaultValue={defaultName} /></div>
          <div className="field"><label htmlFor="co-phone">Mobile number</label><input id="co-phone" name="phone" type="tel" autoComplete="tel" inputMode="tel" required pattern="\+?[0-9\s-]{10,16}" placeholder="+91 98765 43210" defaultValue={defaultPhone} /></div></div>
        <p className="fine-print align-left">Order updates go to {email || "your account email"}. We call only if there is a question about your photo or delivery.</p>
      </section>
      <section className="checkout-panel"><h2>3. Delivery address</h2>
        <div className="field"><label htmlFor="co-line1">House / flat, street</label><input id="co-line1" name="line1" autoComplete="address-line1" required minLength={3} maxLength={200} /></div>
        <div className="field-grid"><div className="field"><label htmlFor="co-line2">Area / locality</label><input id="co-line2" name="line2" autoComplete="address-line2" maxLength={200} /></div><div className="field"><label htmlFor="co-landmark">Landmark <span>(optional)</span></label><input id="co-landmark" name="landmark" maxLength={120} /></div></div>
        <div className="field-grid field-grid-3"><div className="field"><label htmlFor="co-city">City</label><input id="co-city" name="city" autoComplete="address-level2" required minLength={2} maxLength={80} /></div><div className="field"><label htmlFor="co-state">State</label><select id="co-state" name="state" autoComplete="address-level1" required defaultValue=""><option value="" disabled>Choose…</option>{states.map((state) => <option key={state}>{state}</option>)}</select></div><div className="field"><label htmlFor="co-pincode">Pincode</label><input id="co-pincode" name="pincode" autoComplete="postal-code" inputMode="numeric" required pattern="[1-9][0-9]{5}" maxLength={6} /></div></div>
        <div className="field"><label htmlFor="co-gift">Gift note <span>(optional, printed on a card)</span></label><textarea id="co-gift" name="giftNote" rows={2} maxLength={500} placeholder="Happy anniversary, Ma and Papa — with love, Riya" /></div>
      </section>
    </div>
    <aside className="checkout-summary">
      <h2>Order summary</h2>
      {items.map((item) => <div className="summary-row" key={item.id}><span>{item.productTitle}<small>{item.dimension} · {item.frameFinish}</small></span><span>{item.variantId && prices[item.variantId] ? money(prices[item.variantId]) : "—"}</span></div>)}
      <div className="summary-row"><span>Insured delivery</span><span>Free</span></div>
      <div className="summary-row summary-total"><span>Total <small>Incl. all taxes</small></span><strong>{money(total)}</strong></div>
      <button className="button button-clay add-button" type="submit" disabled={busy || unavailable}>{stage === "uploading" ? "Uploading your photos…" : stage === "placing" ? "Placing your order…" : stage === "paying" ? "Waiting for payment…" : paymentsEnabled ? `Pay ${money(total)} securely` : "Place order"}</button>
      {error && <p className="form-status error" role="alert">{error}</p>}
      <ul className="summary-promises"><li><ShieldCheck size={14} /> Digital preview for your approval before we make it</li><li><ShieldCheck size={14} /> Free remake if it arrives damaged</li><li><ShieldCheck size={14} /> {paymentsEnabled ? "UPI, cards & netbanking via Razorpay" : "We’ll send a secure payment link after review"}</li></ul>
      <p className="fine-print">By placing your order you agree to our <Link href="/policies/terms">terms</Link> and <Link href="/policies/returns">returns policy</Link>.</p>
    </aside>
  </form>;
}
