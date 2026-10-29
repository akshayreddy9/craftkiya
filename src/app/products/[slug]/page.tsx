import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PriceTag } from "@/components/price-tag";
import { BeforeAfterGallery } from "@/components/before-after";
import { beforeAfterPairs } from "@/lib/before-after";
import { ProductConfigurator } from "@/components/product-configurator";
import { ProductGallery } from "@/components/product-gallery";
import { ProductGrid, ReviewGallery } from "@/components/storefront-sections";
import { getProduct, getProducts, isPurchasable, optionValues, priceRange, type Product } from "@/lib/catalog";
import { getReviews, summarizeReviews, type Review } from "@/lib/storefront";
import { absoluteImage, absoluteUrl, brand, jsonLd, money } from "@/lib/site";

export const revalidate = 300;
export const dynamicParams = true;

type Params = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return (await getProducts()).map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return { title: "Product not found", robots: { index: false } };
  const { low } = priceRange(product);
  const title = product.seoTitle || `${product.title} — Handmade, from ${money(low)}`;
  const description = product.seoDescription || `${product.description.split(". ")[0]}. Digital preview before making, free insured delivery across India.`;
  return {
    title,
    description,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: { title: product.title, description, url: `/products/${product.slug}`, images: [{ url: product.image, width: 1400, height: 1400, alt: product.title }], type: "website" },
    twitter: { card: "summary_large_image", title: product.title, description, images: [product.image] },
  };
}

function productJsonLd(product: Product, reviews: Review[]) {
  const url = absoluteUrl(`/products/${product.slug}`);
  const { low, high } = priceRange(product);
  const summary = summarizeReviews(reviews);
  const nextYear = new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10);
  return {
    "@type": "Product",
    "@id": `${url}#product`,
    name: product.title,
    description: product.description,
    image: product.images.map(absoluteImage),
    url,
    sku: product.slug,
    brand: { "@type": "Brand", name: brand.name },
    material: "Thread, steel pins and wood",
    offers: {
      "@type": "Offer",
      url,
      price: low,
      priceCurrency: "INR",
      priceValidUntil: nextYear,
      availability: "https://schema.org/MadeToOrder",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@id": absoluteUrl("/#organization") },
      priceSpecification: { "@type": "PriceSpecification", minPrice: low, maxPrice: high, priceCurrency: "INR" },
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingRate: { "@type": "MonetaryAmount", value: 0, currency: "INR" },
        shippingDestination: { "@type": "DefinedRegion", addressCountry: "IN" },
        deliveryTime: {
          "@type": "ShippingDeliveryTime",
          handlingTime: { "@type": "QuantitativeValue", minValue: 7, maxValue: 10, unitCode: "DAY" },
          transitTime: { "@type": "QuantitativeValue", minValue: 2, maxValue: 6, unitCode: "DAY" },
        },
      },
      hasMerchantReturnPolicy: {
        "@type": "MerchantReturnPolicy",
        applicableCountry: "IN",
        returnPolicyCategory: "https://schema.org/MerchantReturnNotPermitted",
        merchantReturnLink: absoluteUrl("/policies/returns"),
      },
    },
    ...(summary ? {
      aggregateRating: { "@type": "AggregateRating", ratingValue: summary.average, reviewCount: summary.count, bestRating: 5, worstRating: 1 },
      review: reviews.slice(0, 5).map((review) => ({ "@type": "Review", reviewRating: { "@type": "Rating", ratingValue: review.rating, bestRating: 5 }, author: { "@type": "Person", name: review.customerName }, reviewBody: review.text, datePublished: review.createdAt.slice(0, 10) })),
    } : {}),
  };
}

export default async function ProductPage({ params }: Params) {
  const { slug } = await params;
  const [product, products, allReviews] = await Promise.all([getProduct(slug), getProducts(), getReviews()]);
  if (!product) notFound();
  const reviews = allReviews.filter((review) => review.productId === product.id);
  const summary = summarizeReviews(reviews);
  const sizes = optionValues(product.variants, "dimension");
  const finishes = optionValues(product.variants, "frameFinish");
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      productJsonLd(product, reviews),
      { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") }, { "@type": "ListItem", position: 2, name: "The collection", item: absoluteUrl("/#collection") }, { "@type": "ListItem", position: 3, name: product.title, item: absoluteUrl(`/products/${product.slug}`) }] },
    ],
  };
  const variant = product.variants[0];
  return <main className="product-page">
    <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structuredData)} />
    <div className="wrap">
      <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link> / <Link href="/#collection">The collection</Link> / <span aria-current="page">{product.title}</span></nav>
      <div className="product-detail-grid">
        <ProductGallery images={product.images} title={product.title} />
        <div className="product-detail-copy">
          {product.badge && <div className="eyebrow">{product.badge}</div>}
          <h1>{product.title}</h1>
          {summary && <a className="rating-link" href="#product-reviews"><span className="stars">★★★★★</span> {summary.average} · {summary.count} review{summary.count === 1 ? "" : "s"}</a>}
          <div className="pdp-price"><PriceTag price={variant.priceInr} compareAt={variant.compareAtInr} size="lg" /><small>Inclusive of all taxes · Free insured delivery</small></div>
          <ProductConfigurator product={product} purchasable={isPurchasable(product)} showPrice={false} />
          <div className="pdp-accordions">
            <details className="pdp-accordion"><summary>Description<span aria-hidden="true">+</span></summary><div className="pdp-accordion-body">
              <p>{product.description}</p>
              <dl className="spec-list"><div><dt>{sizes.length > 1 ? "Sizes" : "Size"}</dt><dd>{sizes.join(" · ")}</dd></div><div><dt>{finishes.length > 1 ? "Frames" : "Frame"}</dt><dd>{finishes.join(" · ")}</dd></div><div><dt>Materials</dt><dd>One continuous black thread wound on pins around a circular ring frame</dd></div><div><dt>Timeline</dt><dd>Preview in 2–3 working days · made in 5–7 days after approval</dd></div></dl>
            </div></details>
            <details className="pdp-accordion"><summary>Shipping &amp; returns<span aria-hidden="true">+</span></summary><div className="pdp-accordion-body">
              <p><strong>Free insured delivery across India.</strong> Your digital preview is ready in 2–3 working days; after you approve it, your portrait is made in 5–7 working days and then shipped, usually arriving in 2–6 days. Tracking appears in your account.</p>
              <p><strong>Returns.</strong> Each portrait is made to order from your photo, so we can’t accept change-of-mind returns. If it arrives damaged or differs from the preview you approved, tell us within 48 hours and we’ll repair or remake it.</p>
              <p><Link className="text-link" href="/policies/shipping">Shipping policy</Link> · <Link className="text-link" href="/policies/returns">Returns policy</Link></p>
            </div></details>
          </div>
        </div>
      </div>
      {beforeAfterPairs.length > 0 && <section className="section section-tight ba-section-pdp"><div className="section-heading"><div><div className="eyebrow">From photo to thread</div><h2>See the transformation.</h2></div><p>A customer’s original photo next to the finished, hand-threaded portrait.</p></div><BeforeAfterGallery pairs={beforeAfterPairs} /></section>}
      {reviews.length > 0 && <section className="section" id="product-reviews"><div className="section-heading"><div><div className="eyebrow">Kind words</div><h2>From people who gave one.</h2></div></div><ReviewGallery reviews={reviews} /></section>}
      {products.length > 1 && <section className="section section-tight"><div className="section-heading"><div><div className="eyebrow">You may also love</div><h2>More ways to keep a moment.</h2></div></div><ProductGrid products={products.filter((item) => item.slug !== product.slug)} /></section>}
    </div>
  </main>;
}
