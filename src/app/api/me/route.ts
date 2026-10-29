import { NextResponse } from "next/server";
import { getSupabaseConfig } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Minimal signed-in summary for the header's account menu. */
export async function GET() {
  const headers = { "Cache-Control": "private, no-store" };
  if (!getSupabaseConfig()) return NextResponse.json({ user: null }, { headers });
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ user: null }, { headers });
  const [{ data: profile }, { count }] = await Promise.all([
    supabase.from("profiles").select("display_name,role").eq("id", user.id).maybeSingle(),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("user_id", user.id),
  ]);
  return NextResponse.json({
    user: { name: profile?.display_name || "", email: user.email || "", isAdmin: profile?.role === "admin", orders: count || 0 },
  }, { headers });
}
