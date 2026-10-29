import type { Metadata } from "next";
import Link from "next/link";
import { forgotPasswordAction, resendSignupCodeAction, resetPasswordAction, setNewPasswordAction, signInAction, signUpAction, verifySignupAction } from "@/app/auth/actions";
import { getSupabaseConfig } from "@/lib/supabase/env";
import { safeNextPath } from "@/lib/site";

export const metadata: Metadata = { title: "Sign in or create an account", robots: { index: false, follow: false } };

const messages: Record<string, [string, boolean?]> = {
  setup: ["Sign-in isn’t available yet. Please try again shortly.", true],
  invalid: ["Please fill in every field. Passwords need at least 8 characters.", true],
  phone: ["Please enter a valid 10-digit mobile number.", true],
  signin: ["That email and password don’t match. Please try again, or reset your password.", true],
  unconfirmed: ["Please verify your email first. We’ve sent you a new email: click its link or enter the code below."],
  signup: ["We couldn’t create that account. The email may already be registered. Try signing in instead.", true],
  "code-sent": ["We’ve sent you an email. Click the link in it, or enter the 6-digit code below, to activate your account."],
  "code-resent": ["A new code is on its way. Check your inbox (and spam folder)."],
  "code-invalid": ["That code didn’t work. Check the latest email, or request a new code.", true],
  "rate-limit": ["Too many emails were requested just now. Please wait a minute and try again.", true],
  "reset-sent": ["If an account exists for this email, we’ve sent a reset email. Click its link, or enter the 6-digit code below with your new password."],
  "password-short": ["Your new password needs at least 8 characters.", true],
  "password-error": ["We couldn’t update your password. Please try again.", true],
  "link-expired": ["That reset link has expired. Request a new code below.", true],
};

const titles: Record<string, [string, string]> = {
  signin: ["Welcome back", "Track your order and approve your portrait preview."],
  signup: ["Create your account", "Track your order and approve your portrait preview."],
  verify: ["Check your email", "Click the link we sent, or enter the 6-digit code from the email."],
  forgot: ["Forgot your password?", "Enter your email and we’ll send you a link and code to reset it."],
  reset: ["Set a new password", "Click the link in your email, or enter the 6-digit code and a new password here."],
  "new-password": ["Set a new password", "Choose a new password for your account."],
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ message?: string; next?: string; mode?: string; email?: string }> }) {
  const { message, next: rawNext, mode: rawMode, email: rawEmail } = await searchParams;
  const next = rawNext ? safeNextPath(rawNext) : "";
  const mode = rawMode && rawMode in titles ? rawMode : "signin";
  const email = (rawEmail || "").slice(0, 254);
  const configured = Boolean(getSupabaseConfig());
  const notice = message ? messages[message] : undefined;
  const href = (target: string) => {
    const params = new URLSearchParams();
    if (target !== "signin") params.set("mode", target);
    if (next) params.set("next", next);
    if (email && target !== "signup") params.set("email", email);
    const query = params.toString();
    return `/login${query ? `?${query}` : ""}`;
  };
  const hidden = <>{next && <input type="hidden" name="next" value={next} />}</>;
  const codeField = <div className="field"><label htmlFor="auth-code">6-digit code</label><input id="auth-code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,12}" maxLength={12} required placeholder="123456" className="code-input" /></div>;
  const [title, subtitle] = titles[mode];

  return <main className="auth-page auth-simple">
    <div className="auth-card">
      <div className="auth-card-head">
        <h1>{title}</h1>
        <p>{mode === "signin" && next === "/checkout" ? "Your cart is saved. Sign in or create an account to place your order." : subtitle}</p>
      </div>
      {(mode === "signin" || mode === "signup") && <nav className="auth-tabs" aria-label="Sign in or create an account">
        <Link href={href("signin")} className={mode === "signin" ? "active" : ""} aria-current={mode === "signin" ? "page" : undefined}>Sign in</Link>
        <Link href={href("signup")} className={mode === "signup" ? "active" : ""} aria-current={mode === "signup" ? "page" : undefined}>Create account</Link>
      </nav>}
      {notice && <p className={`auth-message${notice[1] ? " auth-error" : ""}`} role="status">{notice[0]}</p>}

      {mode === "signin" && <form action={signInAction} className="auth-form">
        {hidden}
        <div className="field"><label htmlFor="signin-email">Email</label><input id="signin-email" name="email" type="email" autoComplete="email" inputMode="email" required defaultValue={email} /></div>
        <div className="field"><label htmlFor="signin-password">Password <Link className="field-link" href={href("forgot")}>Forgot password?</Link></label><input id="signin-password" name="password" type="password" autoComplete="current-password" required /></div>
        <button className="button button-clay" type="submit" disabled={!configured}>Sign in</button>
        <p className="auth-switch">New here? <Link href={href("signup")}>Create an account</Link></p>
      </form>}

      {mode === "signup" && <form action={signUpAction} className="auth-form">
        {hidden}
        <div className="field"><label htmlFor="signup-name">Full name</label><input id="signup-name" name="name" autoComplete="name" required maxLength={100} /></div>
        <div className="field"><label htmlFor="signup-phone">Mobile number</label><input id="signup-phone" name="phone" type="tel" autoComplete="tel" inputMode="tel" required placeholder="98765 43210" pattern="[0-9+\s()\-]{10,16}" /></div>
        <div className="field"><label htmlFor="signup-email">Email</label><input id="signup-email" name="email" type="email" autoComplete="email" inputMode="email" required /></div>
        <div className="field"><label htmlFor="signup-password">Password <span>(at least 8 characters)</span></label><input id="signup-password" name="password" type="password" minLength={8} autoComplete="new-password" required /></div>
        <button className="button button-clay" type="submit" disabled={!configured}>Create account</button>
        <p className="auth-switch">Already have an account? <Link href={href("signin")}>Sign in</Link></p>
      </form>}

      {mode === "verify" && <>
        <form action={verifySignupAction} className="auth-form">
          {hidden}
          <div className="field"><label htmlFor="verify-email">Email</label><input id="verify-email" name="email" type="email" required defaultValue={email} autoComplete="email" /></div>
          {codeField}
          <button className="button button-clay" type="submit">Verify &amp; continue</button>
        </form>
        <form action={resendSignupCodeAction} className="auth-inline">{hidden}<input type="hidden" name="email" value={email} /><span>Didn’t get it?</span><button className="text-link" type="submit" disabled={!email}>Resend code</button></form>
      </>}

      {mode === "forgot" && <form action={forgotPasswordAction} className="auth-form">
        {hidden}
        <div className="field"><label htmlFor="forgot-email">Email</label><input id="forgot-email" name="email" type="email" autoComplete="email" inputMode="email" required defaultValue={email} /></div>
        <button className="button button-clay" type="submit">Send reset code</button>
        <p className="auth-switch"><Link href={href("signin")}>Back to sign in</Link></p>
      </form>}

      {mode === "reset" && <>
        <form action={resetPasswordAction} className="auth-form">
          {hidden}
          <div className="field"><label htmlFor="reset-email">Email</label><input id="reset-email" name="email" type="email" required defaultValue={email} autoComplete="email" /></div>
          {codeField}
          <div className="field"><label htmlFor="reset-password">New password <span>(at least 8 characters)</span></label><input id="reset-password" name="password" type="password" minLength={8} autoComplete="new-password" required /></div>
          <button className="button button-clay" type="submit">Reset password</button>
        </form>
        <form action={forgotPasswordAction} className="auth-inline">{hidden}<input type="hidden" name="email" value={email} /><span>Didn’t get it?</span><button className="text-link" type="submit" disabled={!email}>Send a new code</button></form>
      </>}

      {mode === "new-password" && <form action={setNewPasswordAction} className="auth-form">
        <div className="field"><label htmlFor="new-password">New password <span>(at least 8 characters)</span></label><input id="new-password" name="password" type="password" minLength={8} autoComplete="new-password" required /></div>
        <button className="button button-clay" type="submit">Save new password</button>
      </form>}
    </div>
  </main>;
}
