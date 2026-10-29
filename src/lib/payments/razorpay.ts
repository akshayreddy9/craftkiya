import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

export function getRazorpayConfig() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  return keyId && keySecret ? { keyId, keySecret, webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || "" } : null;
}

export async function createRazorpayOrder(input: { amountInr: number; receipt: string; notes: Record<string, string> }) {
  const config = getRazorpayConfig();
  if (!config) throw new Error("Razorpay is not configured.");
  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${config.keyId}:${config.keySecret}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ amount: input.amountInr * 100, currency: "INR", receipt: input.receipt.slice(0, 40), notes: input.notes }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Razorpay order creation failed (${response.status}).`);
  const order = await response.json() as { id: string; amount: number };
  return order;
}

function safeEqualHex(expected: string, received: string) {
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(received, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Signature returned to the browser after a successful Checkout payment. */
export function verifyCheckoutSignature(razorpayOrderId: string, paymentId: string, signature: string) {
  const config = getRazorpayConfig();
  if (!config) return false;
  const expected = createHmac("sha256", config.keySecret).update(`${razorpayOrderId}|${paymentId}`).digest("hex");
  return safeEqualHex(expected, signature);
}

/** X-Razorpay-Signature over the raw webhook body. */
export function verifyWebhookSignature(rawBody: string, signature: string) {
  const config = getRazorpayConfig();
  if (!config?.webhookSecret || !signature) return false;
  const expected = createHmac("sha256", config.webhookSecret).update(rawBody).digest("hex");
  return safeEqualHex(expected, signature);
}
