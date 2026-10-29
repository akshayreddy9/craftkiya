"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { startPayment } from "@/app/checkout/actions";
import { payWithRazorpay } from "@/lib/razorpay-client";

export function PayButton({ orderId, label }: { orderId: string; label: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pay = async () => {
    setBusy(true);
    setError("");
    const started = await startPayment(orderId);
    if (!started.ok) { setError(started.error); setBusy(false); return; }
    const result = await payWithRazorpay(started.launch);
    if (!result.ok && result.error) setError(result.error);
    setBusy(false);
    router.refresh();
  };
  return <div className="pay-box"><button className="button button-clay" type="button" onClick={pay} disabled={busy}>{busy ? "Opening secure payment…" : label}</button>{error && <p className="form-status error" role="alert">{error}</p>}</div>;
}
