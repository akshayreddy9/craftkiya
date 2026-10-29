import type { Metadata } from "next";
import { CheckoutForm } from "@/app/checkout/checkout-form";
import { requireUser } from "@/lib/auth";
import { getProducts } from "@/lib/catalog";
import { paymentsEnabled } from "@/lib/orders";
import { getSupabaseConfig } from "@/lib/supabase/env";

export const metadata: Metadata = { title: "Checkout", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  if (!getSupabaseConfig()) return <main className="checkout-page"><div className="setup-card">Checkout needs Supabase. Connect the project and run the migrations described in <code>README.md</code>.</div></main>;
  const { supabase, user } = await requireUser("/checkout");
  const [{ data: profile }, products] = await Promise.all([
    supabase.from("profiles").select("display_name,phone").eq("id", user.id).maybeSingle(),
    getProducts(),
  ]);
  // Current server-side prices; the database recalculates them again when the order is placed.
  const prices = Object.fromEntries(products.flatMap((product) => product.variants.filter((variant) => variant.id).map((variant) => [variant.id as string, variant.priceInr])));
  return <main className="checkout-page">
    <div className="checkout-heading"><div className="eyebrow">Almost there</div><h1>Checkout</h1></div>
    <CheckoutForm userId={user.id} email={user.email || ""} defaultName={profile?.display_name || ""} defaultPhone={profile?.phone || user.phone || ""} prices={prices} paymentsEnabled={paymentsEnabled()} />
  </main>;
}
