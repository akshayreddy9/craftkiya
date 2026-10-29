import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { saveSettings } from "@/app/studio/settings/actions";
import { requireAdmin } from "@/lib/auth";
import { defaultSettings, settingKeys, type SiteSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Site settings" };

const messages: Record<string, [string, boolean?]> = {
  saved: ["Saved. The website updates within a minute."],
  phone: ["Phone and WhatsApp numbers need at least 10 digits, e.g. +91 79898 37891.", true],
  email: ["That email address doesn’t look right.", true],
  url: ["Social links must be full links starting with https://", true],
  image: ["Homepage photo must be JPG, PNG, WEBP or AVIF under 6 MB.", true],
  "missing-table": ["The settings table isn’t set up yet. Run supabase/migrations/202610290001_site_settings.sql in the Supabase SQL Editor, then save again.", true],
  error: ["Couldn’t save. Please try again.", true],
};

function Field({ name, label, value, hint, type = "text", wide, rows }: { name: keyof SiteSettings; label: string; value: string; hint?: string; type?: string; wide?: boolean; rows?: number }) {
  return <div className={`field${wide ? " field-wide" : ""}`}><label htmlFor={`s-${name}`}>{label}{hint && <span> {hint}</span>}</label>
    {rows ? <textarea id={`s-${name}`} name={name} rows={rows} defaultValue={value} /> : <input id={`s-${name}`} name={name} type={type} defaultValue={value} />}</div>;
}

export default async function StudioSettingsPage({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  const { message } = await searchParams;
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.from("site_settings").select("data").eq("id", 1).maybeSingle();
  const stored = (data?.data || {}) as Partial<SiteSettings>;
  const s = { ...defaultSettings };
  for (const key of settingKeys) if (typeof stored[key] === "string") s[key] = stored[key] as string;
  const notice = message ? messages[message] : undefined;

  return <main className="studio-page">
    <div className="studio-heading"><div className="eyebrow">Control centre</div><h1>Site settings</h1><p>Change your contact details, social links and homepage without touching code. Everything updates on the website within a minute of saving.</p></div>
    {notice && <p className={`auth-message${notice[1] ? " auth-error" : ""}`} role="status">{notice[0]}</p>}
    {error && <div className="setup-card">The settings table isn’t set up yet, so the site is showing the default values. Run <code>supabase/migrations/202610290001_site_settings.sql</code> in the Supabase SQL Editor once, then save this page.</div>}

    <form action={saveSettings} encType="multipart/form-data" className="settings-form">
      <section className="studio-order settings-card"><h2>Contact details</h2><p className="muted">Shown on the Contact page, footer and floating WhatsApp button.</p>
        <div className="field-grid">
          <Field name="phone" label="Phone number" value={s.phone} type="tel" />
          <Field name="whatsapp" label="WhatsApp number" value={s.whatsapp} type="tel" />
          <Field name="email" label="Contact email" value={s.email} type="email" />
          <Field name="hours" label="Working hours" value={s.hours} hint="(optional)" />
          <Field name="address" label="Address / city" value={s.address} hint="(optional)" wide />
          <Field name="whatsappMessage" label="WhatsApp starter message" value={s.whatsappMessage} hint="(pre-filled when customers tap WhatsApp)" wide rows={2} />
        </div>
      </section>

      <section className="studio-order settings-card"><h2>Social media</h2><p className="muted">Paste full profile links (starting with https://). Leave blank to hide. Icons appear in the footer and Contact page.</p>
        <div className="field-grid">
          <Field name="instagram" label="Instagram" value={s.instagram} type="url" hint="https://instagram.com/…" />
          <Field name="facebook" label="Facebook" value={s.facebook} type="url" hint="https://facebook.com/…" />
          <Field name="youtube" label="YouTube" value={s.youtube} type="url" hint="https://youtube.com/@…" />
          <Field name="pinterest" label="Pinterest" value={s.pinterest} type="url" hint="https://pinterest.com/…" />
          <Field name="x" label="X (Twitter)" value={s.x} type="url" hint="https://x.com/…" />
        </div>
      </section>

      <section className="studio-order settings-card"><h2>Homepage top section</h2><p className="muted">The first thing visitors see.</p>
        <div className="settings-hero">
          <div className="settings-hero-preview"><Image src={s.heroImage} alt="Current homepage photo" fill sizes="200px" /></div>
          <div className="field-grid">
            <Field name="heroEyebrow" label="Small line above the headline" value={s.heroEyebrow} wide />
            <Field name="heroTitle" label="Headline" value={s.heroTitle} />
            <Field name="heroHighlight" label="Highlighted words (pink)" value={s.heroHighlight} />
            <Field name="heroText" label="Text under the headline" value={s.heroText} wide rows={3} />
            <div className="field field-wide"><label htmlFor="s-heroImageFile">Change homepage photo <span>(square works best; JPG/PNG/WEBP up to 6 MB)</span></label><input id="s-heroImageFile" name="heroImageFile" type="file" accept="image/jpeg,image/png,image/webp,image/avif" /><input type="hidden" name="heroImage" value={s.heroImage} /></div>
          </div>
        </div>
      </section>

      <div className="settings-save"><button className="button button-clay" type="submit">Save all settings</button><Link className="text-link" href="/" target="_blank">View website</Link></div>
    </form>

    <section className="studio-section"><h2>Everything else you can change</h2>
      <div className="settings-links">
        <Link href="/studio/catalog"><strong>Products &amp; prices</strong><span>Names, descriptions, prices, 30% off, photos and slideshows</span></Link>
        <Link href="/studio/storefront"><strong>Banners, FAQs &amp; video</strong><span>Top announcement bar, offers, FAQ answers and the process video</span></Link>
        <Link href="/studio/reviews"><strong>Reviews</strong><span>Approve, feature or reply to customer reviews</span></Link>
        <Link href="/studio"><strong>Orders</strong><span>Payments, artwork previews, dispatch and tracking</span></Link>
      </div>
    </section>
  </main>;
}
