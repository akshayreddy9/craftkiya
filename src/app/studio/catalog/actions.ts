"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { publicStorageUrl } from "@/lib/supabase/public";

function done(message: string): never {
  redirect(`/studio/catalog?message=${message}`);
}
const text = (formData: FormData, key: string, max: number) => String(formData.get(key) || "").trim().slice(0, max);
const int = (formData: FormData, key: string) => Number.parseInt(String(formData.get(key) || ""), 10);
const imageTypes: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" };

function refreshStorefront() {
  revalidatePath("/", "layout");
}

export async function saveProduct(formData: FormData) {
  const id = text(formData, "id", 36);
  const slug = text(formData, "slug", 80).toLowerCase();
  const title = text(formData, "title", 120);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || title.length < 3) done("product-invalid");
  const imageUrl = text(formData, "coverImageUrl", 500);
  const allowedImage = /^(\/art\/[\w.-]+|https:\/\/(images\.unsplash\.com|[a-z0-9-]+\.supabase\.co)\/.*)$/;
  if (imageUrl && !allowedImage.test(imageUrl)) done("image-host");
  const galleryUrls = String(formData.get("galleryUrls") || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean).slice(0, 12);
  if (galleryUrls.some((url) => url.length > 500 || !allowedImage.test(url))) done("image-host");
  const sortOrder = int(formData, "sortOrder");

  const { supabase } = await requireAdmin();
  let coverImageUrl = imageUrl || null;
  const file = formData.get("coverImage");
  if (file instanceof File && file.size) {
    const extension = imageTypes[file.type];
    if (!extension || file.size > 6 * 1024 * 1024) done("image-invalid");
    const path = `products/${slug}/${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage.from("catalog-images").upload(path, file, { contentType: file.type });
    if (error) done("image-invalid");
    coverImageUrl = publicStorageUrl("catalog-images", path);
  }
  for (const galleryFile of formData.getAll("galleryImages")) {
    if (!(galleryFile instanceof File) || !galleryFile.size) continue;
    const extension = imageTypes[galleryFile.type];
    if (!extension || galleryFile.size > 6 * 1024 * 1024) done("image-invalid");
    const path = `products/${slug}/gallery-${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage.from("catalog-images").upload(path, galleryFile, { contentType: galleryFile.type });
    if (error) done("image-invalid");
    const url = publicStorageUrl("catalog-images", path);
    if (url && galleryUrls.length < 12) galleryUrls.push(url);
  }

  const values = {
    slug, title,
    subtitle: text(formData, "subtitle", 160),
    description: text(formData, "description", 3000),
    badge: text(formData, "badge", 40) || null,
    seo_title: text(formData, "seoTitle", 70) || null,
    seo_description: text(formData, "seoDescription", 170) || null,
    sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
    is_active: formData.get("isActive") === "on",
    gallery_image_urls: galleryUrls,
    ...(coverImageUrl ? { cover_image_url: coverImageUrl } : {}),
  };
  const { error } = id ? await supabase.from("products").update(values).eq("id", id) : await supabase.from("products").insert(values);
  if (error) done(error.code === "23505" ? "slug-taken" : "save-error");
  refreshStorefront();
  done("product-saved");
}

export async function saveVariant(formData: FormData) {
  const id = text(formData, "id", 36);
  const price = int(formData, "price");
  const sortOrder = int(formData, "sortOrder");
  if (!id || !Number.isSafeInteger(price) || price < 1 || price > 1_000_000) done("variant-invalid");
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("product_variants").update({ price_inr: price, is_active: formData.get("isActive") === "on", sort_order: Number.isFinite(sortOrder) ? sortOrder : 0 }).eq("id", id);
  if (error) done("save-error");
  refreshStorefront();
  done("variant-saved");
}

export async function addVariant(formData: FormData) {
  const productId = text(formData, "productId", 36);
  const dimension = text(formData, "dimension", 40);
  const frameFinish = text(formData, "frameFinish", 40);
  const stringDensity = text(formData, "stringDensity", 40) || "Standard";
  const price = int(formData, "price");
  if (!productId || !dimension || !frameFinish || !Number.isSafeInteger(price) || price < 1) done("variant-invalid");
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("product_variants").insert({ product_id: productId, dimension, frame_finish: frameFinish, string_density: stringDensity, price_inr: price, sort_order: 999 });
  if (error) done(error.code === "23505" ? "variant-exists" : "save-error");
  refreshStorefront();
  done("variant-saved");
}

export async function adjustPrices(formData: FormData) {
  const productId = text(formData, "productId", 36);
  const percent = Number(formData.get("percent"));
  if (!productId || !Number.isFinite(percent) || percent === 0 || Math.abs(percent) > 50) done("variant-invalid");
  const { supabase } = await requireAdmin();
  const { data: variants } = await supabase.from("product_variants").select("id,price_inr").eq("product_id", productId);
  for (const variant of variants || []) {
    // Round to the nearest ₹100 so prices stay tidy.
    const price = Math.max(100, Math.round((variant.price_inr * (1 + percent / 100)) / 100) * 100);
    await supabase.from("product_variants").update({ price_inr: price }).eq("id", variant.id);
  }
  refreshStorefront();
  done("variant-saved");
}
