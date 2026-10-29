"use server";

import { redirect } from "next/navigation";
import { getSupabaseConfig } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { safeNextPath, siteUrl } from "@/lib/site";

type Mode = "signin" | "signup" | "verify" | "forgot" | "reset" | "new-password";

function loginRedirect(code: string, mode: Mode, next?: string | null, email?: string): never {
  const params = new URLSearchParams({ message: code });
  if (mode !== "signin") params.set("mode", mode);
  if (next) params.set("next", next);
  if (email) params.set("email", email);
  redirect(`/login?${params}`);
}

async function redirectForRole(userId: string, next: string | null) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  // Customers land on the collection; admins on the studio. An explicit `next` (e.g. checkout) wins,
  // except the plain account page, which is just where the header's profile icon points.
  const target = next && next !== "/account" ? next : null;
  redirect(target || (data?.role === "admin" ? "/studio" : "/#collection"));
}

const nextFrom = (formData: FormData) => {
  const raw = formData.get("next");
  return raw ? safeNextPath(raw) : null;
};
const emailFrom = (formData: FormData) => String(formData.get("email") || "").trim().toLowerCase().slice(0, 254);
const codeFrom = (formData: FormData) => String(formData.get("code") || "").replace(/\D/g, "").slice(0, 10);

/** Accepts "98765 43210", "+91 98765-43210" etc. Returns +91XXXXXXXXXX for Indian numbers, or null if invalid. */
function normalizePhone(value: string) {
  const digits = value.replace(/[\s()-]/g, "");
  if (/^[6-9]\d{9}$/.test(digits)) return `+91${digits}`;
  if (/^0[6-9]\d{9}$/.test(digits)) return `+91${digits.slice(1)}`;
  if (/^\+[1-9]\d{9,12}$/.test(digits)) return digits;
  return null;
}

export async function signInAction(formData: FormData) {
  const next = nextFrom(formData);
  if (!getSupabaseConfig()) loginRedirect("setup", "signin", next);
  const email = emailFrom(formData);
  const password = String(formData.get("password") || "");
  if (!email || !password) loginRedirect("invalid", "signin", next);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error?.message?.toLowerCase().includes("confirm")) {
    // Account exists but was never verified: send a fresh code and show the code screen.
    await supabase.auth.resend({ type: "signup", email });
    loginRedirect("unconfirmed", "verify", next, email);
  }
  if (error || !data.user) loginRedirect("signin", "signin", next);
  await redirectForRole(data.user.id, next);
}

export async function signUpAction(formData: FormData) {
  const next = nextFrom(formData);
  if (!getSupabaseConfig()) loginRedirect("setup", "signup", next);
  const name = String(formData.get("name") || "").trim().slice(0, 100);
  const phone = normalizePhone(String(formData.get("phone") || ""));
  const email = emailFrom(formData);
  const password = String(formData.get("password") || "");
  if (!name || !email || password.length < 8) loginRedirect("invalid", "signup", next);
  if (!phone) loginRedirect("phone", "signup", next);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: name, phone }, emailRedirectTo: `${siteUrl}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ""}` },
  });
  if (error) loginRedirect(error.message.toLowerCase().includes("rate") ? "rate-limit" : "signup", "signup", next);
  if (data.session && data.user) await redirectForRole(data.user.id, next);
  loginRedirect("code-sent", "verify", next, email);
}

/** Confirms a new account with the 6-digit code from the sign-up email. */
export async function verifySignupAction(formData: FormData) {
  const next = nextFrom(formData);
  const email = emailFrom(formData);
  const code = codeFrom(formData);
  if (!email || code.length < 6) loginRedirect("code-invalid", "verify", next, email);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
  if (error || !data.user) loginRedirect("code-invalid", "verify", next, email);
  await redirectForRole(data.user.id, next);
}

export async function resendSignupCodeAction(formData: FormData) {
  const next = nextFrom(formData);
  const email = emailFrom(formData);
  if (!email) loginRedirect("invalid", "verify", next);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo: `${siteUrl}/auth/callback` } });
  loginRedirect(error ? "rate-limit" : "code-resent", "verify", next, email);
}

/** Sends a password-reset email containing a 6-digit code (and a link, for email apps that show it). */
export async function forgotPasswordAction(formData: FormData) {
  const next = nextFrom(formData);
  const email = emailFrom(formData);
  if (!email) loginRedirect("invalid", "forgot", next);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent("/login?mode=new-password")}` });
  // Same reply whether or not the account exists, so the form can't be used to check emails.
  loginRedirect(error?.message?.toLowerCase().includes("rate") ? "rate-limit" : "reset-sent", "reset", next, email);
}

/** Code + new password in one step. */
export async function resetPasswordAction(formData: FormData) {
  const next = nextFrom(formData);
  const email = emailFrom(formData);
  const code = codeFrom(formData);
  const password = String(formData.get("password") || "");
  if (password.length < 8) loginRedirect("password-short", "reset", next, email);
  if (!email || code.length < 6) loginRedirect("code-invalid", "reset", next, email);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.verifyOtp({ email, token: code, type: "recovery" });
  if (error || !data.user) loginRedirect("code-invalid", "reset", next, email);
  const { error: updateError } = await supabase.auth.updateUser({ password });
  if (updateError) loginRedirect("password-error", "reset", next, email);
  await redirectForRole(data.user.id, next);
}

/** After clicking the reset link in the email (already signed in by /auth/callback). */
export async function setNewPasswordAction(formData: FormData) {
  const password = String(formData.get("password") || "");
  if (password.length < 8) loginRedirect("password-short", "new-password");
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) loginRedirect("link-expired", "forgot");
  const { error } = await supabase.auth.updateUser({ password });
  if (error) loginRedirect("password-error", "new-password");
  await redirectForRole(user.id, null);
}

export async function signOutAction() {
  if (getSupabaseConfig()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}
