"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { emails, isEmailConfigured, sendEmail } from "@/lib/email";
import { orderStatuses } from "@/lib/order-status";

const allowedStatuses = new Set<string>(orderStatuses);

/** Redirects back to the studio list the admin came from, keeping filters. */
function back(formData: FormData, message: string): never {
  const raw = String(formData.get("returnTo") || "/studio");
  const base = raw.startsWith("/studio") && !raw.startsWith("//") ? raw.split("#")[0] : "/studio";
  const url = new URL(base, "http://studio.local");
  url.searchParams.set("message", message);
  redirect(`${url.pathname}${url.search}`);
}

async function customerFor(supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"], orderId: string) {
  const { data: order } = await supabase.from("orders").select("id,user_id,order_number,contact_name,contact_email,courier_awb,courier_name,tracking_url").eq("id", orderId).maybeSingle();
  if (!order) return null;
  if (order.contact_email) return { order, email: order.contact_email as string, name: (order.contact_name || "") as string };
  const { data: profile } = await supabase.from("profiles").select("email,display_name").eq("id", order.user_id).maybeSingle();
  return profile?.email ? { order, email: profile.email as string, name: profile.display_name as string } : null;
}

export async function updateOrder(formData: FormData) {
  const orderId = String(formData.get("orderId") || "");
  const status = String(formData.get("status") || "");
  if (!orderId || !allowedStatuses.has(status)) back(formData, "invalid");
  const courierAwb = String(formData.get("courierAwb") || "").trim().slice(0, 100) || null;
  const courierName = String(formData.get("courierName") || "").trim().slice(0, 80) || null;
  const trackingUrl = String(formData.get("trackingUrl") || "").trim().slice(0, 300) || null;
  if (trackingUrl && !/^https:\/\//.test(trackingUrl)) back(formData, "invalid");
  const notify = formData.get("notify") === "on";

  const { supabase } = await requireAdmin();
  const { data: previous } = await supabase.from("orders").select("status").eq("id", orderId).maybeSingle();
  const { error } = await supabase.from("orders").update({ status, courier_awb: courierAwb, courier_name: courierName, tracking_url: trackingUrl }).eq("id", orderId);
  if (error) back(formData, "save-error");

  let emailed = false;
  if (notify && status === "dispatched" && previous?.status !== "dispatched" && courierAwb) {
    const customer = await customerFor(supabase, orderId);
    if (customer) emailed = await sendEmail({ to: customer.email, ...emails.dispatched({ name: customer.name, orderNumber: customer.order.order_number, awb: courierAwb, courier: courierName, trackingUrl }) });
  }
  if (notify && status === "delivered" && previous?.status !== "delivered") {
    const customer = await customerFor(supabase, orderId);
    if (customer) emailed = await sendEmail({ to: customer.email, ...emails.delivered({ name: customer.name, orderNumber: customer.order.order_number }) });
  }
  revalidatePath("/studio");
  revalidatePath("/account");
  back(formData, emailed ? "saved-emailed" : "saved");
}

export async function markOrderPaidManually(formData: FormData) {
  const orderId = String(formData.get("orderId") || "");
  const reference = String(formData.get("reference") || "").trim().slice(0, 120);
  if (!orderId || !reference) back(formData, "paid-invalid");
  const { supabase } = await requireAdmin();
  const { data: order } = await supabase.from("orders").select("status,payment_status").eq("id", orderId).maybeSingle();
  if (!order || order.payment_status === "paid") back(formData, "save-error");
  const { error } = await supabase.from("orders").update({
    payment_status: "paid", payment_provider: "manual", payment_id: reference, paid_at: new Date().toISOString(),
    status: order.status === "pending_payment" ? "confirmed" : order.status,
  }).eq("id", orderId);
  if (error) back(formData, "save-error");
  revalidatePath("/studio");
  revalidatePath("/account");
  back(formData, "paid");
}

export async function uploadArtworkPreview(formData: FormData) {
  const orderItemId = String(formData.get("orderItemId") || "");
  const file = formData.get("proof");
  const notify = formData.get("notify") === "on";
  if (!orderItemId || !(file instanceof File) || !file.size) back(formData, "proof-invalid");
  const extensions: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
  const extension = extensions[file.type];
  if (!extension || file.size > 10 * 1024 * 1024) back(formData, "proof-invalid");

  const { supabase } = await requireAdmin();
  const { data: item } = await supabase.from("order_items").select("id,order_id,product_title").eq("id", orderItemId).maybeSingle();
  if (!item) back(formData, "proof-error");
  const { data: order } = await supabase.from("orders").select("user_id").eq("id", item.order_id).maybeSingle();
  if (!order) back(formData, "proof-error");

  const path = `${order.user_id}/${item.id}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage.from("approval-previews").upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) back(formData, "proof-error");
  const { error: insertError } = await supabase.from("custom_artwork_approvals").insert({ order_item_id: item.id, draft_image_path: path, approval_status: "pending" });
  if (insertError) {
    await supabase.storage.from("approval-previews").remove([path]);
    back(formData, "proof-error");
  }
  let emailed = false;
  if (notify) {
    const customer = await customerFor(supabase, item.order_id);
    if (customer) emailed = await sendEmail({ to: customer.email, ...emails.previewReady({ name: customer.name, productTitle: item.product_title }) });
  }
  revalidatePath("/studio");
  revalidatePath("/account");
  back(formData, notify ? (emailed ? "proof-emailed" : isEmailConfigured() ? "proof-email-failed" : "proof-saved-no-email") : "proof-saved");
}

export async function sendArtworkApprovalEmail(formData: FormData) {
  const orderItemId = String(formData.get("orderItemId") || "");
  if (!orderItemId) back(formData, "email-error");
  if (!isEmailConfigured()) back(formData, "email-not-configured");
  const { supabase } = await requireAdmin();
  const { data: item } = await supabase.from("order_items").select("id,order_id,product_title").eq("id", orderItemId).maybeSingle();
  if (!item) back(formData, "email-error");
  const { data: approval } = await supabase.from("custom_artwork_approvals").select("id").eq("order_item_id", item.id).eq("approval_status", "pending").limit(1).maybeSingle();
  const customer = await customerFor(supabase, item.order_id);
  if (!approval || !customer) back(formData, "email-error");
  const sent = await sendEmail({ to: customer.email, ...emails.previewReady({ name: customer.name, productTitle: item.product_title }) });
  back(formData, sent ? "email-sent" : "email-error");
}
