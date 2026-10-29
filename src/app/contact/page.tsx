import type { Metadata } from "next";
import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { WhatsAppIcon, socialIcons } from "@/components/brand-icons";
import { formatPhone, getSettings, socialLinks, whatsappLink } from "@/lib/settings";

export const revalidate = 300;
export const metadata: Metadata = {
  title: "Contact us",
  description: "Questions about a custom string-art portrait? Call, WhatsApp or email Craftkiya. We usually reply within a few hours.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage() {
  const settings = await getSettings();
  const socials = socialLinks(settings);
  return <main className="contact-page"><div className="wrap">
    <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link> / <span aria-current="page">Contact us</span></nav>
    <div className="contact-head"><div className="eyebrow">We’d love to hear from you</div><h1 className="page-title">Talk to the Craftkiya studio.</h1><p>Questions about your photo, a gift deadline or an order? Message us. A real person replies, usually within a few hours.</p></div>
    <div className="contact-grid">
      <a className="contact-card contact-whatsapp" href={whatsappLink(settings)} target="_blank" rel="noreferrer"><span className="contact-icon"><WhatsAppIcon size={26} /></span><strong>WhatsApp</strong><span>{formatPhone(settings.whatsapp)}</span><em>Fastest reply · Send your photo for advice</em></a>
      <a className="contact-card" href={`tel:${settings.phone}`}><span className="contact-icon"><Phone size={24} /></span><strong>Call us</strong><span>{formatPhone(settings.phone)}</span>{settings.hours && <em>{settings.hours}</em>}</a>
      {settings.email && <a className="contact-card" href={`mailto:${settings.email}`}><span className="contact-icon"><Mail size={24} /></span><strong>Email</strong><span>{settings.email}</span><em>For orders, bulk and corporate gifting</em></a>}
    </div>
    <div className="contact-extra">
      {settings.address && <p><MapPin size={17} /> {settings.address}</p>}
      {socials.length > 0 && <div className="contact-social"><span>Follow our work</span>{socials.map(([key, label, url]) => { const Icon = socialIcons[key]; return <a key={key} href={url} target="_blank" rel="noreferrer" aria-label={`Craftkiya on ${label}`}><Icon size={20} /></a>; })}</div>}
    </div>
    <p className="contact-orders">Already ordered? <Link className="text-link" href="/account">Track your order</Link> or read our <Link className="text-link" href="/#faq">FAQs</Link>.</p>
  </div></main>;
}
