import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Check, Heart, Sparkles } from "lucide-react";
import { BeforeAfterGallery } from "@/components/before-after";
import { LogoMark } from "@/components/logo";
import { beforeAfterPairs } from "@/lib/before-after";
import { FaqList, ProductGrid, ReviewGallery, faqJsonLd } from "@/components/storefront-sections";
import { getProducts, priceRange } from "@/lib/catalog";
import { getSettings } from "@/lib/settings";
import { getBanners, getFaqs, getReviews, summarizeReviews } from "@/lib/storefront";
import { absoluteUrl, jsonLd, money } from "@/lib/site";

export const revalidate = 300;
export const metadata: Metadata = { alternates: { canonical: "/" } };

export default async function Home() {
  // Hero text and photo are edited in Studio → Site settings; on phones the photo shows first.
  const [products, faqs, reviews, { promos }, settings] = await Promise.all([getProducts(), getFaqs(), getReviews(), getBanners(), getSettings()]);
  const summary = summarizeReviews(reviews);
  const lowest = Math.min(...products.map((product) => priceRange(product).low));
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "ItemList", name: "Handmade string art portraits", itemListElement: products.map((product, index) => ({ "@type": "ListItem", position: index + 1, url: absoluteUrl(`/products/${product.slug}`), name: product.title })) },
      faqJsonLd(faqs),
    ],
  };
  return <main>
    <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structuredData)} />
    <section className="hero" id="home"><div className="wrap hero-grid"><div>{settings.heroEyebrow && <div className="eyebrow">{settings.heroEyebrow}</div>}<h1>{settings.heroTitle}{settings.heroHighlight && <> <em>{settings.heroHighlight}</em></>}</h1>{settings.heroText && <p className="hero-copy">{settings.heroText}</p>}<div className="hero-links"><Link className="button" href="#collection">Create your portrait <ArrowUpRight size={15} /></Link><Link className="text-link" href="#collection">From {money(lowest)} · Explore the collection</Link></div><div className="hero-note">{summary ? <><span className="stars">★★★★★</span><span>Rated {summary.average}/5 by {summary.count} customers</span></> : <><span className="stars">✦</span><span>Every portrait previewed and approved by you</span></>}</div></div><div className="hero-visual"><Image className="hero-image" src={settings.heroImage} alt="A hand-threaded 24-inch circular string-art portrait by Craftkiya" fill sizes="(max-width: 680px) 100vw, 55vw" priority /><div className="hero-frame" /><div className="hero-caption">Made slowly. Kept forever.</div><span className="hero-sticker" aria-hidden="true"><LogoMark size={88} /></span><div className="hero-stamp"><strong>Not just<br />a picture.</strong><span>Your story, in thread</span></div></div></div></section>
    <section className="trust-row" aria-label="Craftkiya promises"><div className="wrap trust-inner"><div className="trust-item"><Sparkles size={16} /><span>100% hand-woven, never printed</span></div><div className="trust-item"><Check size={16} /><span>Digital preview before we make it</span></div><div className="trust-item"><Heart size={16} /><span>Made for your one-of-a-kind story</span></div><div className="trust-item"><ArrowUpRight size={16} /><span>Free insured delivery across India</span></div></div></section>
    {promos.length > 0 && <section className="promo-row" aria-label="Current offers"><div className="wrap promo-inner">{promos.map((promo) => { const content = <><strong>{promo.title}</strong>{promo.body && <span>{promo.body}</span>}</>; return promo.targetUrl ? <Link className="promo-card" href={promo.targetUrl} key={promo.id}>{content}<ArrowUpRight size={15} /></Link> : <div className="promo-card" key={promo.id}>{content}</div>; })}</div></section>}
    <section className="section" id="collection"><div className="wrap"><div className="section-heading"><div><div className="eyebrow">Made for the moments that matter</div><h2>Choose your portrait.</h2></div><p>Every piece is a 24-inch circle, hand-threaded from your photo. Pick one, upload your photo, and we’ll do the rest.</p></div><ProductGrid products={products} /></div></section>
    {beforeAfterPairs.length > 0 && <section className="section ba-section" id="before-after"><div className="wrap"><div className="section-heading ba-heading"><div><div className="eyebrow">From photo to thread</div><h2>From your moment to a masterpiece.</h2></div><p>Drag the circle to compare a customer’s original photo with the finished, hand-threaded portrait.</p></div><BeforeAfterGallery pairs={beforeAfterPairs} /></div></section>}
    <section className="story-band" id="story"><div className="wrap story-grid"><div><div className="story-number">A little patience makes a lot of love.</div><h2>From your photo<br />to your forever piece.</h2><p className="story-copy">No two portraits are exactly alike. An artist maps your photograph into a digital thread pattern, then builds every line by hand, winding thread around carefully placed pins until your people appear.</p></div><ol className="story-steps story-steps-5"><li className="story-step"><span>01</span><h3>Order confirmed</h3><p>Upload your photo and place your order.</p></li><li className="story-step"><span>02</span><h3>Digital draft</h3><p>Our artist maps your photo into a thread pattern.</p></li><li className="story-step"><span>03</span><h3>You approve</h3><p>Review it in your account, or ask for edits.</p></li><li className="story-step"><span>04</span><h3>Hammering &amp; threading</h3><p>Pins placed, thread wound by hand.</p></li><li className="story-step"><span>05</span><h3>Dispatched</h3><p>Framed, packed with care and insured.</p></li></ol></div></section>
    <section className="section reviews" id="reviews"><div className="wrap"><div className="section-heading"><div><div className="eyebrow">{reviews.length ? "From the people who keep them" : "Our promise to you"}</div><h2>{reviews.length ? "Stories worth keeping." : "Made with care, start to finish."}</h2></div><p>{summary ? `${summary.average} out of 5 from ${summary.count} verified customer${summary.count === 1 ? "" : "s"}. Every review comes from a delivered order.` : "Reviews here only ever come from delivered orders. Until our first stories arrive, here is what every order is promised."}</p></div><ReviewGallery reviews={reviews} /></div></section>
    <section className="section" id="faq"><div className="wrap faq-grid"><div className="faq-heading"><div className="eyebrow">A few good questions</div><h2>Before you make it yours.</h2><p>Still wondering about something? We’re happy to help make this easy.</p><a className="text-link" href="mailto:craftkiya.support@gmail.com">Write us a note</a></div><FaqList faqs={faqs} /></div></section>
  </main>;
}
