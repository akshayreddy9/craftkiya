import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client for trusted server code only (payment verification and
 * courier webhooks). Reads a server-only env var; never import from client code.
 */
export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
