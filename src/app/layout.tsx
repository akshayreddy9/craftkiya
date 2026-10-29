import type { Metadata, Viewport } from "next";
import { DM_Sans, Playfair_Display } from "next/font/google";
import { SiteFooter, SiteHeader } from "@/components/site-shell";
import { CartProvider } from "@/components/cart-provider";
import { WhatsAppButton } from "@/components/whatsapp-button";
import { formatPhone, getSettings, phoneDigits, socialLinks, whatsappLink } from "@/lib/settings";
import { getBanners } from "@/lib/storefront";
import { absoluteUrl, brand, jsonLd, noIndex, siteUrl } from "@/lib/site";
import "./globals.css";
import "./components.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Craftkiya | Handmade string art portraits from your photo", template: "%s | Craftkiya" },
  description: "Turn a favorite photograph into a handmade string-art portrait. Approve a digital preview, then an artisan threads it by hand in India. Free insured delivery.",
  applicationName: brand.name,
  openGraph: { type: "website", siteName: brand.name, locale: "en_IN", title: "Craftkiya | Handmade string art, made from your story", description: "Custom string-art portraits, thoughtfully made by hand from your favorite photographs.", images: [{ url: "/art/craftkiya-easel-portrait.jpg", width: 1600, height: 1600, alt: "A Craftkiya string-art portrait on an easel" }] },
  twitter: { card: "summary_large_image" },
  formatDetection: { telephone: false },
  ...(noIndex ? { robots: { index: false, follow: false } } : {}),
};

export const viewport: Viewport = { themeColor: "#fdf6ec", width: "device-width", initialScale: 1 };

// Self-hosted and preloaded by Next (no request to Google at runtime); exposed as CSS variables used in globals.css.
const sans = DM_Sans({ subsets: ["latin"], display: "swap", variable: "--font-sans" });
const serif = Playfair_Display({ subsets: ["latin"], style: ["normal", "italic"], display: "swap", variable: "--font-serif" });

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [{ announcement }, settings] = await Promise.all([getBanners(), getSettings()]);
  const socials = socialLinks(settings);
  const organization = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization", "@id": absoluteUrl("/#organization"), name: brand.name, legalName: brand.legalName, url: siteUrl, logo: absoluteUrl(brand.logo),
        email: settings.email, telephone: settings.phone, areaServed: "IN",
        ...(socials.length ? { sameAs: socials.map(([, , url]) => url) } : {}),
        contactPoint: { "@type": "ContactPoint", telephone: settings.phone, email: settings.email, contactType: "customer service", areaServed: "IN", availableLanguage: ["en", "hi"] },
      },
      { "@type": "WebSite", "@id": absoluteUrl("/#website"), name: brand.name, url: siteUrl, publisher: { "@id": absoluteUrl("/#organization") }, inLanguage: "en-IN" },
    ],
  };
  const contact = { phone: settings.phone, phoneLabel: formatPhone(settings.phone), email: settings.email, whatsappHref: whatsappLink(settings), socials: socials.map(([key, label, url]) => ({ key, label, url })) };
  return (
    <html lang="en-IN" data-scroll-behavior="smooth" className={`${sans.variable} ${serif.variable}`}>
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(organization)} />
        <CartProvider><SiteHeader announcement={announcement} /><div id="main">{children}</div><SiteFooter contact={contact} /></CartProvider>
        {phoneDigits(settings.whatsapp).length >= 10 && <WhatsAppButton href={contact.whatsappHref} />}
      </body>
    </html>
  );
}
