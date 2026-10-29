import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { emails, sendEmail } from "@/lib/email";
import { createRazorpayOrder, getRazorpayConfig } from "@/lib/payments/razorpay";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type PaymentLaunch = {
  keyId: string;
  razorpayOrderId: string;
  amountPaise: number;
  orderId: string;
  orderNumber: string;
  prefill: { name: string; email: string; contact: string };
};

export const paymentsEnabled = () => Boolean(getRazorpayConfig() && createSupabaseAdminClient());

/**
 * Creates (or reuses) the Razorpay order for one of the signed-in customer's
 * unpaid orders. `supabase` is the customer's RLS-scoped client, so a customer
 * can only start payment for their own order; the amount always comes from the DB.
 */
export async function preparePayment(supabase: SupabaseClient, orderId: string): Promise<{ launch: PaymentLaunch | null; error?: string }> {
  const config = getRazorpayConfig();
  const admin = createSupabaseAdminClient();
  if (!config || !admin) return { launch: null };
  const { data: order } = await supabase.from("orders")
    .select("id,order_number,total_amount,payment_status,status,payment_order_id,contact_name,contact_email,contact_phone")
    .eq("id", orderId).maybeSingle();
  if (!order) return { launch: null, error: "We couldn’t find that order." };
  if (order.payment_status === "paid" || order.status !== "pending_payment") return { launch: null, error: "This order doesn’t need payment." };

  let razorpayOrderId: string | null = order.payment_order_id;
  if (!razorpayOrderId) {
    try {
      const created = await createRazorpayOrder({ amountInr: order.total_amount, receipt: order.order_number, notes: { order_id: order.id, order_number: order.order_number } });
      await admin.from("orders").update({ payment_order_id: created.id, payment_provider: "razorpay" }).eq("id", order.id).is("payment_order_id", null);
      // Re-read so concurrent attempts converge on the one stored id.
      const { data: stored } = await admin.from("orders").select("payment_order_id").eq("id", order.id).maybeSingle();
      razorpayOrderId = stored?.payment_order_id || null;
    } catch {
      return { launch: null, error: "Payment could not be started. Please try again in a moment." };
    }
  }
  if (!razorpayOrderId) return { launch: null, error: "Payment could not be started. Please try again in a moment." };
  return {
    launch: {
      keyId: config.keyId, razorpayOrderId, amountPaise: order.total_amount * 100, orderId: order.id, orderNumber: order.order_number,
      prefill: { name: order.contact_name || "", email: order.contact_email || "", contact: order.contact_phone || "" },
    },
  };
}

/** Idempotently marks an order paid. Safe to call from both the browser callback and the webhook. */
export async function markOrderPaid({ paymentOrderId, paymentId, amountPaise }: { paymentOrderId: string; paymentId: string; amountPaise?: number }) {
  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false as const, reason: "not_configured" };
  const { data: order } = await admin.from("orders")
    .select("id,order_number,total_amount,payment_status,status,contact_name,contact_email")
    .eq("payment_order_id", paymentOrderId).maybeSingle();
  if (!order) return { ok: false as const, reason: "not_found" };
  if (amountPaise !== undefined && amountPaise !== order.total_amount * 100) return { ok: false as const, reason: "amount_mismatch" };
  if (order.payment_status === "paid") return { ok: true as const, orderId: order.id };

  const { data: updated } = await admin.from("orders")
    .update({ payment_status: "paid", payment_id: paymentId, paid_at: new Date().toISOString(), status: order.status === "pending_payment" ? "confirmed" : order.status })
    .eq("id", order.id).neq("payment_status", "paid").select("id");
  if (updated?.length && order.contact_email) {
    await sendEmail({ to: order.contact_email, ...emails.orderConfirmed({ name: order.contact_name || "", orderNumber: order.order_number, total: order.total_amount }) });
  }
  return { ok: true as const, orderId: order.id };
}
