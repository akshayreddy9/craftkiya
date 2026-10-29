import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig } from "@/lib/supabase/env";

export async function proxy(request: NextRequest) {
  const config = getSupabaseConfig();
  if (!config) return NextResponse.next({ request });

  let response = NextResponse.next({ request });
  const supabase = createServerClient(config.url, config.key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirectWithCookies(`/login?next=${encodeURIComponent(request.nextUrl.pathname)}`, request, response);

  if (request.nextUrl.pathname.startsWith("/studio")) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (profile?.role !== "admin") return redirectWithCookies("/account", request, response);
  }
  return response;
}

function redirectWithCookies(path: string, request: NextRequest, source: NextResponse) {
  const redirectResponse = NextResponse.redirect(new URL(path, request.url));
  source.cookies.getAll().forEach(({ name, value, ...options }) => redirectResponse.cookies.set(name, value, options));
  return redirectResponse;
}

export const config = { matcher: ["/account/:path*", "/studio/:path*", "/checkout/:path*"] };
