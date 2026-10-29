import { timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { emails, sendEmail } from "@/lib/email";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// Shiprocket tracking webhook. Shiprocket rejects URLs containing "shiprocket",
// so this lives at /api/webhooks/shipping. Set the same token in the Shiprocket
// webhook settings ("x-api-key") and in SHIPPING_WEBHOOK_TOKEN.
type ShipmentEvent = { awb?: string | number; current_status?: string; shipment_status?: string; courier_name?: string; courier?: string };

const forwardOnly = ["confirmed", "draft_prepared", "preview_approved", "in_production", "dispatched", "delivered"];

function mapStatus(value: string) {
  const status = value.toUpperCase();
  if (status === "DELIVERED") return "delivered";
  if (["PICKED UP", "SHIPPED", "IN TRANSIT", "OUT FOR DELIVERY", "REACHED AT DESTINATION HUB", "OUT FOR PICKUP"].includes(status)) return "dispatched";
  return null;
}

function tokenMatches(received: string) {
  const expected = process.env.SHIPPING_WEBHOOK_TOKEN || "";
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  return expected.length > 0 && a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  if (!tokenMatches(request.headers.get("x-api-key") || "")) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "not configured" }, { status: 503 });
  let event: ShipmentEvent;
  try { event = await request.json(); } catch { return NextResponse.json({ error: "invalid body" }, { status: 400 }); }

  const awb = String(event.awb || "").trim();
  const shipmentStatus = String(event.current_status || event.shipment_status || "").trim().slice(0, 80);
  if (!awb || !shipmentStatus) return NextResponse.json({ received: true });

  const { data: order } = await admin.from("orders").select("id,status,order_number,contact_name,contact_email,courier_name,tracking_url").eq("courier_awb", awb).maybeSingle();
  if (!order) return NextResponse.json({ received: true });

  const mapped = mapStatus(shipmentStatus);
  const advance = mapped && forwardOnly.indexOf(mapped) > forwardOnly.indexOf(order.status);
  const courierName = String(event.courier_name || event.courier || order.courier_name || "").slice(0, 80) || null;
  await admin.from("orders").update({ shipment_status: shipmentStatus, courier_name: courierName, ...(advance ? { status: mapped } : {}) }).eq("id", order.id);
  if (advance && mapped === "dispatched" && order.contact_email) {
    await sendEmail({ to: order.contact_email, ...emails.dispatched({ name: order.contact_name || "", orderNumber: order.order_number, awb, courier: courierName, trackingUrl: order.tracking_url }) });
  }
  if (advance && mapped === "delivered" && order.contact_email) {
    await sendEmail({ to: order.contact_email, ...emails.delivered({ name: order.contact_name || "", orderNumber: order.order_number }) });
  }
  revalidatePath("/studio");
  return NextResponse.json({ received: true });
}
