import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check } from "lucide-react";
import { ProductConfigurator } from "@/components/product-configurator";
import { FaqList, ReviewGallery, faqJsonLd } from "@/components/storefront-sections";
import { getProduct, getProducts, isPurchasable } from "@/lib/catalog";
import { getLandingPage, landingPages, type LandingPageData } from "@/lib/landing-pages";
import { fallbackFaqs, getReviews } from "@/lib/storefront";
import { absoluteImage, absoluteUrl, jsonLd } from "@/lib/site";

const sectionNames = { "gifts": "Gift ideas", "custom-gifts": "Custom gifts" };

export function landingMetadata(section: LandingPageData["section"], slug: string): Metadata {
  const page = getLandingPage(section, slug);
  if (!page) return { title: "Page not found", robots: { index: false } };
  return {
    title: { absolute: `${page.metaTitle} | Craftkiya` },
    description: page.metaDescription,
    alternates: { canonical: page.route },
    openGraph: { title: page.metaTitle, description: page.metaDescription, url: page.route, images: [{ url: page.image, alt: page.imageAlt }] },
  };
}

export const landingParams = (section: LandingPageData["section"]) => landingPages.filter((page) => page.section === section).map((page) => ({ slug: page.slug }));

export async function SeoGiftPage({ section, slug }: { section: LandingPageData["section"]; slug: string }) {
  const page = getLandingPage(section, slug);
  if (!page) notFound();
  const [product, products, reviews] = await Promise.all([getProduct(page.productSlug), getProducts(), getReviews()]);
  const configured = product || products[0];
  const faqs = [...page.faqs, ...fallbackFaqs.slice(0, 3)];
  const related = landingPages.filter((item) => item.route !== page.route).slice(0, 4);
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebPage", "@id": absoluteUrl(page.route), name: page.metaTitle, description: page.metaDescription, url: absoluteUrl(page.route), isPartOf: { "@id": absoluteUrl("/#website") }, primaryImageOfPage: absoluteImage(page.image) },
      { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") }, { "@type": "ListItem", position: 2, name: sectionNames[section], item: absoluteUrl("/gifts") }, { "@type": "ListItem", position: 3, name: page.label, item: absoluteUrl(page.route) }] },
      faqJsonLd(faqs),
    ],
  };
  return <main className="product-page"><script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structuredData)} /><div className="wrap">
    <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link> / <Link href="/gifts">{sectionNames[section]}</Link> / <span aria-current="page">{page.label}</span></nav>
    <section className="product-detail-grid"><div className="product-media"><div className="product-detail-image-wrap"><Image className="product-detail-image" src={page.image} alt={page.imageAlt} fill sizes="(max-width: 680px) 100vw, 50vw" priority /></div></div>
      <div className="product-detail-copy"><div className="eyebrow">{page.eyebrow}</div><h1>{page.title}</h1><p>{page.description}</p><div className="product-facts"><span><Check size={13} /> Preview before making</span><span><Check size={13} /> Handmade to order</span><span><Check size={13} /> Free insured delivery</span></div>
        {configured && <ProductConfigurator product={configured} purchasable={isPurchasable(configured)} heading={`Start your ${configured.title.toLowerCase()}.`} />}</div></section>
    <section className="section section-tight"><div className="prose-grid">{page.body.map((block) => <article key={block.heading}><h2>{block.heading}</h2><p>{block.text}</p></article>)}</div></section>
    <section className="section section-tight"><div className="section-heading"><div><div className="eyebrow">A simple, thoughtful process</div><h2>From your photo to their keepsake.</h2></div></div><ol className="story-steps story-steps-light"><li className="story-step"><span>01 / CHOOSE A PHOTO</span><h3>Pick your moment</h3><p>Upload the photograph that tells your story.</p></li><li className="story-step"><span>02 / APPROVE A PREVIEW</span><h3>Make it yours</h3><p>Review the digital draft in your account before the artisan begins.</p></li><li className="story-step"><span>03 / MADE BY HAND</span><h3>Ready to be kept</h3><p>Your portrait is threaded, framed and delivered with care.</p></li></ol></section>
    {reviews.length > 0 && <section className="section section-tight"><div className="section-heading"><div><div className="eyebrow">Kind words</div><h2>Stories worth keeping.</h2></div></div><ReviewGallery reviews={reviews} limit={3} /></section>}
    <section className="section section-tight"><div className="faq-grid"><div className="faq-heading"><div className="eyebrow">A few good questions</div><h2>Before you choose.</h2></div><FaqList faqs={faqs} /></div></section>
    <section className="section section-tight"><div className="section-heading"><div><div className="eyebrow">More gift ideas</div><h2>Find the right moment.</h2></div></div><div className="link-grid">{related.map((item) => <Link className="link-card" href={item.route} key={item.route}><span>{item.label}</span><strong>{item.title}</strong></Link>)}</div></section>
  </div></main>;
}
