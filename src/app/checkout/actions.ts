"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { adminEmail, emails, sendEmail } from "@/lib/email";
import { markOrderPaid, preparePayment, type PaymentLaunch } from "@/lib/orders";
import { verifyCheckoutSignature } from "@/lib/payments/razorpay";

export type CheckoutInput = {
  idempotencyKey: string;
  items: { variantId: string; referencePath: string; notes: string }[];
  contact: { name: string; phone: string };
  shipping: { line1: string; line2: string; landmark: string; city: string; state: string; pincode: string };
  giftNote: string;
};
export type PlaceOrderResult =
  | { ok: true; orderId: string; orderNumber: string; total: number; payment: PaymentLaunch | null; paymentError?: string }
  | { ok: false; error: string };

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const text = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : "";

const rpcErrors: Record<string, string> = {
  invalid_address: "Please check your name, phone number and delivery address. Pincodes have 6 digits.",
  invalid_items: "Something in your bag looks out of date. Please remove it and add it again.",
  variant_unavailable: "One of the options in your bag is no longer available. Please remove it and choose again.",
  missing_reference_photo: "We couldn’t find one of your uploaded photos. Please re-attach it and try again.",
  not_authenticated: "Your session has expired. Please sign in again.",
};

function parse(input: CheckoutInput): CheckoutInput | null {
  if (!input || !uuid.test(input.idempotencyKey) || !Array.isArray(input.items) || input.items.length < 1 || input.items.length > 10) return null;
  const items = input.items.map((item) => ({ variantId: text(item?.variantId, 36), referencePath: text(item?.referencePath, 300), notes: text(item?.notes, 1000) }));
  // referencePath may be empty: "buy now, customize later" orders get their photo from the account page.
  if (items.some((item) => !uuid.test(item.variantId))) return null;
  const phone = text(input.contact?.phone, 20).replace(/[\s-]/g, "");
  return {
    idempotencyKey: input.idempotencyKey,
    items,
    contact: { name: text(input.contact?.name, 100), phone },
    shipping: {
      line1: text(input.shipping?.line1, 200), line2: text(input.shipping?.line2, 200), landmark: text(input.shipping?.landmark, 120),
      city: text(input.shipping?.city, 80), state: text(input.shipping?.state, 80), pincode: text(input.shipping?.pincode, 6),
    },
    giftNote: text(input.giftNote, 500),
  };
}

export async function placeOrder(input: CheckoutInput): Promise<PlaceOrderResult> {
  const data = parse(input);
  if (!data) return { ok: false, error: "Please check your details and try again." };
  const { supabase, user } = await requireUser("/checkout");
  if (data.items.some((item) => item.referencePath && !item.referencePath.startsWith(`${user.id}/`))) return { ok: false, error: rpcErrors.missing_reference_photo };

  const { data: rows, error } = await supabase.rpc("place_order", {
    p_items: data.items.map((item) => ({ variant_id: item.variantId, quantity: 1, reference_path: item.referencePath, notes: item.notes })),
    p_contact: data.contact,
    p_shipping: data.shipping,
    p_gift_note: data.giftNote,
    p_idempotency_key: data.idempotencyKey,
  });
  const order = Array.isArray(rows) ? rows[0] as { order_id: string; order_number: string; total_amount: number } | undefined : undefined;
  if (error || !order) {
    const code = Object.keys(rpcErrors).find((key) => error?.message?.includes(key));
    return { ok: false, error: code ? rpcErrors[code] : "We couldn’t place your order just now. Nothing has been charged — please try again." };
  }

  // Remember the phone number for next time (best effort).
  await supabase.from("profiles").update({ phone: data.contact.phone }).eq("id", user.id);

  // Order emails (best effort; checkout never fails because of email).
  const { data: lines } = await supabase.from("order_items").select("product_title").eq("order_id", order.order_id);
  const needsPhoto = data.items.some((item) => !item.referencePath);
  const items = (lines || []).map((line) => line.product_title).join(", ") || "Portrait";
  await Promise.all([
    user.email ? sendEmail({ to: user.email, ...emails.orderPlaced({ name: data.contact.name, orderNumber: order.order_number, total: order.total_amount, needsPhoto }) }) : Promise.resolve(false),
    sendEmail({ to: adminEmail(), ...emails.adminNewOrder({ name: data.contact.name, phone: data.contact.phone, orderNumber: order.order_number, total: order.total_amount, items, needsPhoto }) }),
  ]);
  const payment = await preparePayment(supabase, order.order_id);
  revalidatePath("/account");
  revalidatePath("/studio");
  return { ok: true, orderId: order.order_id, orderNumber: order.order_number, total: order.total_amount, payment: payment.launch, paymentError: payment.error };
}

export async function startPayment(orderId: string): Promise<{ ok: true; launch: PaymentLaunch } | { ok: false; error: string }> {
  if (typeof orderId !== "string" || !uuid.test(orderId)) return { ok: false, error: "We couldn’t find that order." };
  const { supabase } = await requireUser("/account");
  const { launch, error } = await preparePayment(supabase, orderId);
  return launch ? { ok: true, launch } : { ok: false, error: error || "Online payment isn’t available yet. The studio will contact you with a payment link." };
}

export async function confirmPayment(input: { orderId: string; razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string }): Promise<{ ok: boolean; error?: string }> {
  const { supabase } = await requireUser("/account");
  const fields = [input?.orderId, input?.razorpayOrderId, input?.razorpayPaymentId, input?.razorpaySignature];
  if (fields.some((value) => typeof value !== "string" || !value || value.length > 200)) return { ok: false, error: "Payment details were incomplete." };
  if (!verifyCheckoutSignature(input.razorpayOrderId, input.razorpayPaymentId, input.razorpaySignature)) return { ok: false, error: "We couldn’t verify that payment. If you were charged, it will be confirmed automatically within a few minutes." };

  // RLS: this read only succeeds for the customer's own order.
  const { data: order } = await supabase.from("orders").select("id,payment_order_id").eq("id", input.orderId).maybeSingle();
  if (!order || order.payment_order_id !== input.razorpayOrderId) return { ok: false, error: "That payment doesn’t match this order." };
  const result = await markOrderPaid({ paymentOrderId: input.razorpayOrderId, paymentId: input.razorpayPaymentId });
  revalidatePath("/account");
  revalidatePath("/studio");
  return result.ok ? { ok: true } : { ok: false, error: "Payment received but not yet recorded. It will update automatically shortly." };
}
