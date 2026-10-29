import Image from "next/image";
import Link from "next/link";
import { Hand, PackageCheck, ShieldCheck } from "lucide-react";
import { AddToCartButton } from "@/components/add-to-cart";
import { PriceTag } from "@/components/price-tag";
import type { Product } from "@/lib/catalog";
import type { Faq, Review } from "@/lib/storefront";

const stars = (rating: number) => "★★★★★".slice(0, rating) + "☆☆☆☆☆".slice(0, 5 - rating);

export function ProductGrid({ products }: { products: Product[] }) {
  return <div className="product-grid">{products.map((product, index) => <article className="product-card" key={product.slug}>
    <div className="product-image-wrap">
      <Link href={`/products/${product.slug}`} className="product-image-link" aria-label={product.title}><Image className="product-image" src={product.image} alt={`${product.title} — handmade string art`} fill sizes="(max-width: 680px) 50vw, 33vw" priority={index === 0} /></Link>
      {product.badge && <span className="product-label">{product.badge}</span>}
    </div>
    <Link href={`/products/${product.slug}`} className="product-meta product-meta-stacked"><div className="product-title">{product.title}</div><PriceTag price={product.variants[0].priceInr} compareAt={product.variants[0].compareAtInr} size="sm" /></Link>
    <AddToCartButton product={{ slug: product.slug, title: product.title, image: product.image }} variant={product.variants[0]} />
  </article>)}</div>;
}

export function ReviewGallery({ reviews, limit = 6 }: { reviews: Review[]; limit?: number }) {
  if (!reviews.length) {
    return <div className="review-grid review-promises">
      <article className="review-card"><Hand size={20} /><div><h3>Every thread placed by hand</h3><p>No printing, no machines: an artisan maps, pins and winds every line of your portrait.</p></div></article>
      <article className="review-card"><ShieldCheck size={20} /><div><h3>You approve it first</h3><p>We share a digital draft in your account. Nothing is made until you say it feels right.</p></div></article>
      <article className="review-card"><PackageCheck size={20} /><div><h3>Remade if it arrives damaged</h3><p>Insured delivery across India, and a free repair or remake if anything goes wrong in transit.</p></div></article>
    </div>;
  }
  return <div className="review-grid">{reviews.slice(0, limit).map((review) => <article className={`review-card${review.afterUrl ? " has-photos" : ""}`} key={review.id}>
    {review.afterUrl && <div className={`review-photos${review.beforeUrl ? " pair" : ""}`}>
      {review.beforeUrl && <figure><Image src={review.beforeUrl} alt={`Reference photo sent by ${review.customerName}`} fill sizes="(max-width: 680px) 45vw, 180px" /><figcaption>Their photo</figcaption></figure>}
      <figure><Image src={review.afterUrl} alt={`Finished string-art portrait for ${review.customerName}`} fill sizes="(max-width: 680px) 90vw, 360px" /><figcaption>In thread</figcaption></figure>
    </div>}
    <div><div className="stars" aria-label={`${review.rating} out of 5 stars`}>{stars(review.rating)}</div><p className="review-text">“{review.text}”</p>{review.adminReply && <p className="review-reply"><strong>Craftkiya:</strong> {review.adminReply}</p>}</div>
    <div className="review-person"><div><strong>{review.customerName}</strong>{review.occasion || "Verified purchase"}</div><span>{review.featured ? "Featured" : "Verified"}</span></div>
  </article>)}</div>;
}

export function FaqList({ faqs }: { faqs: Faq[] }) {
  return <div className="faq-list">{faqs.map((faq) => <details className="faq-item" key={faq.question}><summary className="faq-question">{faq.question}<span aria-hidden="true">+</span></summary><div className="faq-answer">{faq.answer}</div></details>)}</div>;
}

export const faqJsonLd = (faqs: Faq[]) => ({ "@type": "FAQPage", mainEntity: faqs.map((faq) => ({ "@type": "Question", name: faq.question, acceptedAnswer: { "@type": "Answer", text: faq.answer } })) });
