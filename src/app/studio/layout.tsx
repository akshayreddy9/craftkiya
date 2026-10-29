import type { Metadata } from "next";
import Link from "next/link";
import { signOutAction } from "@/app/auth/actions";
import { requireAdmin } from "@/lib/auth";
import { getSupabaseConfig } from "@/lib/supabase/env";

export const metadata: Metadata = { title: { default: "Studio", template: "%s · Studio" }, robots: { index: false, follow: false } };

const sections = [["/studio", "Orders"], ["/studio/catalog", "Catalog"], ["/studio/storefront", "Banners & FAQs"], ["/studio/reviews", "Reviews"], ["/studio/settings", "Site settings"]];

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  if (!getSupabaseConfig()) {
    return <main className="studio-page"><div className="studio-heading"><div className="eyebrow">The maker’s desk</div><h1>Studio</h1></div><div className="setup-card">Connect Supabase and run the migrations before using this admin area. See <code>README.md</code>. Studio access requires a signed-in account with the admin role.</div></main>;
  }
  const { user } = await requireAdmin();
  return <div className="studio-shell">
    <nav className="studio-nav" aria-label="Studio sections"><div className="wrap studio-nav-inner"><strong>Studio</strong><div>{sections.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}</div><form action={signOutAction}><span>{user.email}</span><button className="text-link" type="submit">Sign out</button></form></div></nav>
    {children}
  </div>;
}
