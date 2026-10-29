"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";

function done(message: string, filter: string): never {
  redirect(`/studio/reviews?message=${message}&filter=${filter === "approved" ? "approved" : "pending"}`);
}

export async function moderateReview(formData: FormData) {
  const id = String(formData.get("id") || "");
  const action = String(formData.get("action") || "");
  const filter = String(formData.get("filter") || "pending");
  const reply = String(formData.get("reply") || "").trim().slice(0, 600);
  const { supabase } = await requireAdmin();

  if (action === "delete") {
    const { data: review } = await supabase.from("reviews").select("before_image_path,after_image_path").eq("id", id).maybeSingle();
    const { error } = await supabase.from("reviews").delete().eq("id", id);
    if (error) done("error", filter);
    const paths = [review?.before_image_path, review?.after_image_path].filter((path): path is string => Boolean(path));
    if (paths.length) await supabase.storage.from("review-photos").remove(paths);
  } else {
    const updates: Record<string, Record<string, unknown>> = {
      approve: { is_approved: true },
      unapprove: { is_approved: false, is_featured: false },
      feature: { is_featured: true, is_approved: true },
      unfeature: { is_featured: false },
      reply: { admin_reply: reply || null, replied_at: reply ? new Date().toISOString() : null },
      "hide-photos": { photo_consent: false },
    };
    if (!updates[action]) done("error", filter);
    const { error } = await supabase.from("reviews").update(updates[action]).eq("id", id);
    if (error) done("error", filter);
  }
  revalidatePath("/", "layout");
  done("saved", filter);
}
