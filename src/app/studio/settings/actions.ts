"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { defaultSettings, settingKeys, type SiteSettings } from "@/lib/settings";
import { publicStorageUrl } from "@/lib/supabase/public";

function done(message: string): never {
  redirect(`/studio/settings?message=${message}`);
}

const limits: Partial<Record<keyof SiteSettings, number>> = { heroText: 400, whatsappMessage: 300, address: 300 };
const urlKeys: (keyof SiteSettings)[] = ["instagram", "facebook", "youtube", "pinterest", "x"];
const imageTypes: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" };

export async function saveSettings(formData: FormData) {
  const values = {} as SiteSettings;
  for (const key of settingKeys) values[key] = String(formData.get(key) ?? "").trim().slice(0, limits[key] ?? 160);

  if (!/^\+?[0-9\s-]{10,16}$/.test(values.phone) || !/^\+?[0-9\s-]{10,16}$/.test(values.whatsapp)) done("phone");
  if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) done("email");
  if (urlKeys.some((key) => values[key] && !/^https:\/\//.test(values[key]))) done("url");
  if (!values.heroTitle) values.heroTitle = defaultSettings.heroTitle;
  if (values.heroImage && !/^(\/art\/[\w.-]+|https:\/\/[a-z0-9-]+\.supabase\.co\/storage\/v1\/object\/public\/.+)$/.test(values.heroImage)) done("image");

  const { supabase } = await requireAdmin();
  const file = formData.get("heroImageFile");
  if (file instanceof File && file.size) {
    const extension = imageTypes[file.type];
    if (!extension || file.size > 6 * 1024 * 1024) done("image");
    const path = `site/hero-${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage.from("catalog-images").upload(path, file, { contentType: file.type });
    if (error) done("image");
    values.heroImage = publicStorageUrl("catalog-images", path) || values.heroImage;
  }
  if (!values.heroImage) values.heroImage = defaultSettings.heroImage;

  const { error } = await supabase.from("site_settings").upsert({ id: 1, data: values });
  if (error) done(error.code === "42P01" || error.message.includes("site_settings") ? "missing-table" : "error");
  revalidatePath("/", "layout");
  done("saved");
}
