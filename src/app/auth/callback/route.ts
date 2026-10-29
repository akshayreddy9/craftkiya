import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/site";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = request.nextUrl.searchParams.get("next");
  if (!code || !getSupabaseConfig()) return NextResponse.redirect(new URL("/login?message=oauth", request.url));
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(new URL("/login?message=oauth", request.url));
  if (next && safeNextPath(next) !== "/account") return NextResponse.redirect(new URL(safeNextPath(next), request.url));
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
    : { data: null };
  return NextResponse.redirect(new URL(profile?.role === "admin" ? "/studio" : "/#collection", request.url));
}
