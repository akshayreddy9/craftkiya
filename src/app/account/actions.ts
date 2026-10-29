"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";

const imageExtensions: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export async function respondToArtworkApproval(formData: FormData) {
  const approvalId = String(formData.get("approvalId") || "");
  const decision = String(formData.get("decision") || "");
  const feedback = String(formData.get("feedback") || "").trim().slice(0, 1000);
  if (!approvalId || !["approved", "rejected"].includes(decision)) redirect("/account?message=approval-error");
  if (decision === "rejected" && !feedback) redirect("/account?message=feedback-needed");

  const { supabase } = await requireUser();
  const { data, error } = await supabase.from("custom_artwork_approvals")
    .update({ approval_status: decision, client_feedback: feedback || null, approved_at: new Date().toISOString() })
    .eq("id", approvalId)
    .eq("approval_status", "pending")
    .select("id");

  if (error || !data?.length) redirect("/account?message=approval-error");
  revalidatePath("/account");
  revalidatePath("/studio");
  redirect(`/account?message=${decision === "approved" ? "approval-saved" : "edit-requested"}`);
}

export async function submitReview(formData: FormData) {
  const orderItemId = String(formData.get("orderItemId") || "");
  const rating = Number(formData.get("rating"));
  const text = String(formData.get("reviewText") || "").trim().slice(0, 1200);
  const occasion = String(formData.get("occasion") || "").trim().slice(0, 60);
  const consent = formData.get("photoConsent") === "on";
  const includeOriginal = formData.get("includeOriginal") === "on";
  const photo = formData.get("afterPhoto");
  if (!orderItemId || !Number.isInteger(rating) || rating < 1 || rating > 5 || text.length < 10) redirect("/account?message=review-invalid");

  const { supabase, user } = await requireUser();
  // RLS limits this to the customer's own delivered order items.
  const { data: item } = await supabase.from("order_items")
    .select("id,custom_reference_image_path,product_variant_id,variant_snapshot,orders!inner(status,contact_name)")
    .eq("id", orderItemId).maybeSingle();
  const order = (item?.orders as unknown as { status: string; contact_name: string | null } | null) || null;
  if (!item || order?.status !== "delivered") redirect("/account?message=review-error");

  const slug = (item.variant_snapshot as { product_slug?: string } | null)?.product_slug;
  const { data: product } = slug ? await supabase.from("products").select("id").eq("slug", slug).maybeSingle() : { data: null };
  if (!product) redirect("/account?message=review-error");

  let afterPath: string | null = null;
  let beforePath: string | null = null;
  const uploaded: string[] = [];
  if (consent && photo instanceof File && photo.size) {
    const extension = imageExtensions[photo.type];
    if (!extension || photo.size > 6 * 1024 * 1024) redirect("/account?message=review-photo");
    afterPath = `${user.id}/${item.id}/after-${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage.from("review-photos").upload(afterPath, photo, { contentType: photo.type });
    if (error) redirect("/account?message=review-error");
    uploaded.push(afterPath);
  }
  if (consent && includeOriginal && item.custom_reference_image_path) {
    const { data: original } = await supabase.storage.from("customer-reference-images").download(item.custom_reference_image_path);
    const extension = original ? imageExtensions[original.type] : undefined;
    if (original && extension && original.size <= 6 * 1024 * 1024) {
      beforePath = `${user.id}/${item.id}/before-${crypto.randomUUID()}.${extension}`;
      const { error } = await supabase.storage.from("review-photos").upload(beforePath, original, { contentType: original.type });
      if (error) beforePath = null; else uploaded.push(beforePath);
    }
  }

  const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
  const fullName = (profile?.display_name || order?.contact_name || "").trim();
  const [first, ...rest] = fullName.split(/\s+/);
  const customerName = first ? `${first}${rest.length ? ` ${rest[rest.length - 1][0]}.` : ""}` : "Craftkiya customer";

  const { error } = await supabase.from("reviews").insert({
    user_id: user.id, product_id: product.id, order_item_id: item.id, rating, review_text: text, occasion: occasion || null,
    customer_name: customerName, photo_consent: consent, after_image_path: afterPath, before_image_path: beforePath,
  });
  if (error) {
    if (uploaded.length) await supabase.storage.from("review-photos").remove(uploaded);
    redirect("/account?message=review-error");
  }
  revalidatePath("/account");
  revalidatePath("/studio/reviews");
  redirect("/account?message=review-saved");
}

/** "Customize later": link a photo the customer just uploaded to their own order line. */
export async function attachReferencePhoto(orderItemId: string, path: string): Promise<{ ok: boolean; error?: string }> {
  if (typeof orderItemId !== "string" || typeof path !== "string" || !orderItemId || !path || path.length > 300) return { ok: false, error: "Please choose your photo again." };
  const { supabase, user } = await requireUser();
  if (!path.startsWith(`${user.id}/`)) return { ok: false, error: "Please choose your photo again." };
  const { error } = await supabase.rpc("attach_reference_photo", { p_order_item_id: orderItemId, p_path: path });
  if (error) return { ok: false, error: error.message.includes("not_allowed") ? "This order’s artwork has already started, so the photo can’t be changed here. Please contact us." : "We couldn’t save your photo. Please try again." };
  revalidatePath("/account");
  revalidatePath("/studio");
  return { ok: true };
}

export async function updateProfile(formData: FormData) {
  const name = String(formData.get("name") || "").trim().slice(0, 100);
  const phone = String(formData.get("phone") || "").replace(/[\s-]/g, "").slice(0, 16);
  if (!name || (phone && !/^\+?[0-9]{10,13}$/.test(phone))) redirect("/account?section=details&message=profile-invalid");
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("profiles").update({ display_name: name, phone: phone || null }).eq("id", user.id);
  if (error) redirect("/account?section=details&message=profile-invalid");
  revalidatePath("/account");
  redirect("/account?section=details&message=profile-saved");
}

export async function changePassword(formData: FormData) {
  const password = String(formData.get("password") || "");
  const confirm = String(formData.get("confirm") || "");
  if (password.length < 8 || password.length > 72) redirect("/account?section=details&message=password-short");
  if (password !== confirm) redirect("/account?section=details&message=password-mismatch");
  const { supabase } = await requireUser();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect(`/account?section=details&message=${error.code === "same_password" ? "password-same" : "password-error"}`);
  redirect("/account?section=details&message=password-saved");
}
