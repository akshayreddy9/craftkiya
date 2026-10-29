import { cache } from "react";
import { createSupabasePublicClient } from "@/lib/supabase/public";

/** Site-wide content edited in /studio/settings (stored in public.site_settings). */
export type SiteSettings = {
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  hours: string;
  instagram: string;
  facebook: string;
  youtube: string;
  pinterest: string;
  x: string;
  whatsappMessage: string;
  heroEyebrow: string;
  heroTitle: string;
  heroHighlight: string;
  heroText: string;
  heroImage: string;
};

export const defaultSettings: SiteSettings = {
  phone: "+917989837891",
  whatsapp: "+917989837891",
  email: "craftkiya.support@gmail.com",
  address: "",
  hours: "Mon–Sat, 10 am – 7 pm",
  instagram: "",
  facebook: "",
  youtube: "",
  pinterest: "",
  x: "",
  whatsappMessage: "Hi Craftkiya! I'd like to know more about a custom string-art portrait.",
  heroEyebrow: "A portrait, patiently made",
  heroTitle: "A little piece of your story,",
  heroHighlight: "by hand.",
  heroText: "One photograph. Thousands of metres of thread. Your favorite people, reimagined in thread and wood by an artisan who takes their time — and shows you a preview before they begin.",
  heroImage: "/art/craftkiya-easel-portrait.jpg",
};

export const settingKeys = Object.keys(defaultSettings) as (keyof SiteSettings)[];

export const getSettings = cache(async (): Promise<SiteSettings> => {
  const supabase = createSupabasePublicClient();
  if (!supabase) return defaultSettings;
  const { data, error } = await supabase.from("site_settings").select("data").eq("id", 1).maybeSingle();
  if (error || !data?.data) return defaultSettings;
  const stored = data.data as Partial<Record<keyof SiteSettings, unknown>>;
  const merged = { ...defaultSettings };
  for (const key of settingKeys) {
    const value = stored[key];
    // Empty strings are allowed for optional fields (e.g. removing a social link).
    if (typeof value === "string" && (value.trim() || !["phone", "email", "heroTitle", "heroImage"].includes(key))) merged[key] = value.trim();
  }
  return merged;
});

/** Digits only, for wa.me and tel: links. */
export const phoneDigits = (value: string) => value.replace(/\D/g, "");
/** "+917989837891" -> "+91 79898 37891" */
export function formatPhone(value: string) {
  const digits = phoneDigits(value);
  if (digits.length === 12 && digits.startsWith("91")) return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  if (digits.length === 10) return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  return value;
}
export const whatsappLink = (settings: Pick<SiteSettings, "whatsapp" | "whatsappMessage">) =>
  `https://wa.me/${phoneDigits(settings.whatsapp)}${settings.whatsappMessage ? `?text=${encodeURIComponent(settings.whatsappMessage)}` : ""}`;

export const socialLinks = (settings: SiteSettings) => ([
  ["instagram", "Instagram", settings.instagram],
  ["facebook", "Facebook", settings.facebook],
  ["youtube", "YouTube", settings.youtube],
  ["pinterest", "Pinterest", settings.pinterest],
  ["x", "X", settings.x],
] as const).filter(([, , url]) => /^https:\/\//.test(url));
