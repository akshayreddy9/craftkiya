import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { landingPages } from "@/lib/landing-pages";
import { absoluteUrl, jsonLd } from "@/lib/site";

export const metadata: Metadata = {
  title: "String Art Gift Ideas — Anniversary, Wedding, Birthday & More",
  description: "Handmade string-art portrait gift ideas for anniversaries, weddings, parents, birthdays, couples and best friends. Made from your photo, previewed before making.",
  alternates: { canonical: "/gifts" },
};

export default function GiftsIndex() {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "CollectionPage", name: "String art gift ideas", url: absoluteUrl("/gifts"), isPartOf: { "@id": absoluteUrl("/#website") } },
      { "@type": "ItemList", itemListElement: landingPages.map((page, index) => ({ "@type": "ListItem", position: index + 1, url: absoluteUrl(page.route), name: page.label })) },
      { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") }, { "@type": "ListItem", position: 2, name: "Gift ideas", item: absoluteUrl("/gifts") }] },
    ],
  };
  return <main className="product-page"><script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structuredData)} /><div className="wrap">
    <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link> / <span aria-current="page">Gift ideas</span></nav>
    <div className="section-heading"><div><div className="eyebrow">Gift ideas</div><h1 className="page-title">A handmade portrait for every moment.</h1></div><p>Every gift starts with a photo you love. Pick the occasion, and we’ll help you make it unforgettable.</p></div>
    <div className="gift-grid">{landingPages.map((page) => <Link className="gift-card" href={page.route} key={page.route}><div className="gift-card-image"><Image src={page.image} alt={page.imageAlt} fill sizes="(max-width: 680px) 100vw, 33vw" /></div><span>{page.label}</span><strong>{page.title}</strong><p>{page.metaDescription}</p></Link>)}</div>
  </div></main>;
}
