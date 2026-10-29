"use client";

import Link from "next/link";
import { ArrowRight, Mail, Menu, Phone, ShoppingBag, X } from "lucide-react";
import { WhatsAppIcon, socialIcons } from "@/components/brand-icons";
import { useEffect, useState } from "react";
import { useCart } from "@/components/cart-provider";
import { CartPhoto } from "@/components/cart-photo";
import { CustomizeSheet } from "@/components/add-to-cart";
import { AccountMenu } from "@/components/account-menu";
import { LogoMark, Wordmark } from "@/components/logo";
import { money } from "@/lib/site";

type Announcement = { title: string; body: string | null; targetUrl: string | null } | null;

export function SiteHeader({ announcement }: { announcement: Announcement }) {
  const { items, total, removeItem, isOpen, setIsOpen } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setIsOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, setIsOpen]);
  const strip = announcement
    ? <>{announcement.title}{announcement.body && <strong> · {announcement.body}</strong>}</>
    : <>A LITTLE SOMETHING, MADE BY HAND <strong>· Complimentary delivery across India</strong></>;
  const close = () => setMenuOpen(false);
  return <>
    <a className="skip-link" href="#main">Skip to content</a>
    <div className="announcement">{announcement?.targetUrl ? <Link href={announcement.targetUrl}>{strip}</Link> : strip}</div>
    <header className="header"><div className="wrap header-inner"><Link className="brand" href="/" aria-label="Craftkiya home"><LogoMark size={40} className="brand-logo" /><Wordmark /></Link>
      <nav className={`nav${menuOpen ? " open" : ""}`} aria-label="Main navigation"><Link onClick={close} href="/#collection">The collection</Link><Link onClick={close} href="/gifts">Gift ideas</Link><Link onClick={close} href="/#story">Our process</Link><Link onClick={close} href="/#reviews">Kind words</Link><Link onClick={close} href="/contact">Contact</Link></nav>
      <div className="header-actions"><AccountMenu /><button className="icon-button bag-button" onClick={() => setIsOpen(true)} aria-label={`Open bag, ${items.length} items`}><ShoppingBag size={20} />{items.length > 0 && <span className="bag-count" aria-hidden="true">{items.length}</span>}</button><button className="icon-button menu-button" aria-expanded={menuOpen} aria-label={menuOpen ? "Close menu" : "Open menu"} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={20} /> : <Menu size={20} />}</button></div>
    </div></header>
    <div className={`drawer-backdrop${isOpen ? " open" : ""}`} aria-hidden={!isOpen} onMouseDown={(event) => { if (event.target === event.currentTarget) setIsOpen(false); }}><aside className="cart-drawer" role="dialog" aria-modal="true" aria-label="Your shopping bag" inert={!isOpen}><div className="drawer-head"><h2>Your bag <span>{items.length ? `(${items.length})` : ""}</span></h2><button className="close-button" onClick={() => setIsOpen(false)} aria-label="Close bag"><X size={20} /></button></div>
      <div className="cart-items">{items.length ? items.map((item) => <article className="cart-line" key={item.id}><CartPhoto id={item.id} focus={item.focus} /><div><h3>{item.productTitle}</h3><p>{item.dimension} · {item.frameFinish} · {item.stringDensity}</p><p className={item.photoName ? "" : "cart-warning"}>{item.photoName ? "Photo attached" : "Photo: add now or after ordering"}</p><button className="remove-line" onClick={() => removeItem(item.id)}>Remove</button></div><div className="cart-line-price">{money(item.price)}</div></article>) : <div className="cart-empty">Your bag is waiting for a story.<Link className="text-link" href="/#collection" onClick={() => setIsOpen(false)}>Start a portrait</Link></div>}</div>
      {items.length > 0 && <div className="cart-foot"><div className="cart-total"><span>Subtotal</span><strong>{money(total)}</strong></div><Link className="button" href="/checkout" onClick={() => setIsOpen(false)}>Checkout securely <ArrowRight size={15} /></Link><p className="fine-print">Free insured delivery · Preview approval before making</p></div>}</aside></div>
    <CustomizeSheet />
  </>;
}

export type FooterContact = { phone: string; phoneLabel: string; email: string; whatsappHref: string; socials: { key: keyof typeof socialIcons; label: string; url: string }[] };

export function SiteFooter({ contact }: { contact: FooterContact }) {
  return <footer className="footer"><div className="wrap"><div className="footer-main"><div className="footer-brand-block"><Link className="brand" href="/" aria-label="Craftkiya home"><LogoMark size={54} className="brand-logo" /><Wordmark tone="dark" tagline /></Link><p className="footer-note">A small studio for things worth holding onto. Thoughtfully made in India, one thread at a time.</p>
    <div className="footer-contact"><a href={`tel:${contact.phone}`}><Phone size={15} /> {contact.phoneLabel}</a><a href={contact.whatsappHref} target="_blank" rel="noreferrer"><WhatsAppIcon size={15} /> Chat on WhatsApp</a>{contact.email && <a href={`mailto:${contact.email}`}><Mail size={15} /> {contact.email}</a>}</div>
    {contact.socials.length > 0 && <div className="footer-social">{contact.socials.map(({ key, label, url }) => { const Icon = socialIcons[key]; return <a key={key} href={url} target="_blank" rel="noreferrer" aria-label={`Craftkiya on ${label}`}><Icon size={18} /></a>; })}</div>}
  </div><div><h3>Explore</h3><div className="footer-links"><Link href="/#collection">The collection</Link><Link href="/gifts">Gift ideas</Link><Link href="/gifts/anniversary-string-art-portrait">Anniversary portraits</Link><Link href="/custom-gifts/handmade-string-art-india">Handmade in India</Link></div></div><div><h3>Here to help</h3><div className="footer-links"><Link href="/#faq">FAQs</Link><Link href="/account">Track my order</Link><Link href="/contact">Contact us</Link></div></div><div><h3>Policies</h3><div className="footer-links"><Link href="/policies/shipping">Shipping</Link><Link href="/policies/returns">Returns &amp; remakes</Link><Link href="/policies/privacy">Privacy</Link><Link href="/policies/terms">Terms</Link></div></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} Craftkiya Studio. Made with care.</span><span>Custom thread art · India</span></div></div></footer>;
}
