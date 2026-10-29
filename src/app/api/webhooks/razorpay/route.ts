import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { markOrderPaid } from "@/lib/orders";
import { verifyWebhookSignature } from "@/lib/payments/razorpay";

type RazorpayEvent = {
  event: string;
  payload?: {
    payment?: { entity?: { id?: string; order_id?: string; amount?: number; status?: string } };
    order?: { entity?: { id?: string; amount_paid?: number } };
  };
};

// Configure in Razorpay Dashboard → Webhooks with events payment.captured and order.paid,
// and the same secret as RAZORPAY_WEBHOOK_SECRET.
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  if (!verifyWebhookSignature(rawBody, request.headers.get("x-razorpay-signature") || "")) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }
  let event: RazorpayEvent;
  try { event = JSON.parse(rawBody); } catch { return NextResponse.json({ error: "invalid body" }, { status: 400 }); }

  const payment = event.payload?.payment?.entity;
  const orderEntity = event.payload?.order?.entity;
  if ((event.event === "payment.captured" || event.event === "order.paid") && payment?.id) {
    const paymentOrderId = payment.order_id || orderEntity?.id;
    if (paymentOrderId) {
      const result = await markOrderPaid({ paymentOrderId, paymentId: payment.id, amountPaise: orderEntity?.amount_paid ?? payment.amount });
      // Unknown orders are acknowledged so Razorpay stops retrying; anything else is retried.
      if (!result.ok && result.reason !== "not_found" && result.reason !== "amount_mismatch") return NextResponse.json({ error: result.reason }, { status: 500 });
      revalidatePath("/studio");
    }
  }
  return NextResponse.json({ received: true });
}
