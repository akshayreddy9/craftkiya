import { createClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "@/lib/supabase/env";

/** Cookie-free anon client for public catalog/CMS reads, so those pages can stay statically cached. */
export function createSupabasePublicClient() {
  const config = getSupabaseConfig();
  if (!config) return null;
  return createClient(config.url, config.key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function publicStorageUrl(bucket: string, path: string | null | undefined) {
  const config = getSupabaseConfig();
  if (!config || !path) return null;
  return `${config.url}/storage/v1/object/public/${bucket}/${path.split("/").map(encodeURIComponent).join("/")}`;
}
