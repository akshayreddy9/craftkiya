"use client";

import { confirmPayment } from "@/app/checkout/actions";
import type { PaymentLaunch } from "@/lib/orders";

type RazorpayResponse = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
type RazorpayInstance = { open: () => void; on: (event: string, handler: () => void) => void };
declare global {
  interface Window { Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance }
}

let loader: Promise<boolean> | null = null;
function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve(true);
  loader ??= new Promise<boolean>((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => { loader = null; resolve(false); };
    document.body.appendChild(script);
  });
  return loader;
}

/** Opens Razorpay Checkout and resolves once the payment is verified server-side, or the customer closes it. */
export async function payWithRazorpay(launch: PaymentLaunch): Promise<{ ok: boolean; error?: string }> {
  if (!(await loadRazorpay()) || !window.Razorpay) return { ok: false, error: "The payment window couldn’t load. Check your connection and try again from your account." };
  const Razorpay = window.Razorpay;
  return new Promise((resolve) => {
    const checkout = new Razorpay({
      key: launch.keyId,
      amount: launch.amountPaise,
      currency: "INR",
      name: "Craftkiya",
      description: `Order ${launch.orderNumber}`,
      order_id: launch.razorpayOrderId,
      prefill: launch.prefill,
      notes: { order_number: launch.orderNumber },
      theme: { color: "#364d3d" },
      handler: async (response: RazorpayResponse) => {
        resolve(await confirmPayment({ orderId: launch.orderId, razorpayOrderId: response.razorpay_order_id, razorpayPaymentId: response.razorpay_payment_id, razorpaySignature: response.razorpay_signature }));
      },
      modal: { ondismiss: () => resolve({ ok: false, error: "Payment wasn’t completed. Your order is saved — you can pay any time from your account." }) },
    });
    checkout.open();
  });
}
