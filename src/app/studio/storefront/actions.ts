"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";

function done(message: string): never {
  redirect(`/studio/storefront?message=${message}`);
}
const text = (formData: FormData, key: string, max: number) => String(formData.get(key) || "").trim().slice(0, max);
const dateOrNull = (value: string) => value ? new Date(`${value}T00:00:00+05:30`).toISOString() : null;

export async function saveBanner(formData: FormData) {
  const id = text(formData, "id", 36);
  const kind = text(formData, "kind", 20);
  const title = text(formData, "title", 140);
  const targetUrl = text(formData, "targetUrl", 300);
  if (!["announcement", "promo", "video"].includes(kind) || !title) done("invalid");
  if (kind === "video" && !/^https:\/\//.test(targetUrl) && !/^\/videos\/[\w.-]+\.mp4$/.test(targetUrl)) done("invalid-video");
  if (targetUrl && !(targetUrl.startsWith("/") && !targetUrl.startsWith("//")) && !/^https:\/\//.test(targetUrl)) done("invalid-link");
  const values = {
    kind, title,
    body: text(formData, "body", 200) || null,
    target_url: targetUrl || null,
    is_active: formData.get("isActive") === "on",
    start_date: dateOrNull(text(formData, "startDate", 10)),
    end_date: dateOrNull(text(formData, "endDate", 10)),
    sort_order: Number.parseInt(text(formData, "sortOrder", 6), 10) || 0,
  };
  const { supabase } = await requireAdmin();
  const { error } = id ? await supabase.from("site_banners").update(values).eq("id", id) : await supabase.from("site_banners").insert(values);
  if (error) done("save-error");
  revalidatePath("/", "layout");
  done("saved");
}

export async function deleteBanner(formData: FormData) {
  const id = text(formData, "id", 36);
  const { supabase } = await requireAdmin();
  await supabase.from("site_banners").delete().eq("id", id);
  revalidatePath("/", "layout");
  done("deleted");
}

export async function saveFaq(formData: FormData) {
  const id = text(formData, "id", 36);
  const question = text(formData, "question", 200);
  const answer = text(formData, "answer", 2000);
  if (question.length < 5 || answer.length < 5) done("invalid");
  const values = { question, answer, is_active: formData.get("isActive") === "on", sort_order: Number.parseInt(text(formData, "sortOrder", 6), 10) || 0 };
  const { supabase } = await requireAdmin();
  const { error } = id ? await supabase.from("faqs").update(values).eq("id", id) : await supabase.from("faqs").insert(values);
  if (error) done("save-error");
  revalidatePath("/", "layout");
  done("saved");
}

export async function deleteFaq(formData: FormData) {
  const id = text(formData, "id", 36);
  const { supabase } = await requireAdmin();
  await supabase.from("faqs").delete().eq("id", id);
  revalidatePath("/", "layout");
  done("deleted");
}
