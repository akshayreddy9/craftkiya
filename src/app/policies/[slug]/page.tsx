import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { brand } from "@/lib/site";

// Draft policy copy for a made-to-order business. Have it reviewed before launch.
const policies: Record<string, { title: string; description: string; updated: string; sections: { heading: string; text: string[] }[] }> = {
  shipping: {
    title: "Shipping policy",
    description: "How and when Craftkiya portraits are made and delivered across India.",
    updated: "27 October 2026",
    sections: [
      { heading: "Making time", text: ["Every portrait is made to order. We share a digital preview within 2–3 working days of your order. Making begins after you approve the preview and usually takes 5–7 working days."] },
      { heading: "Delivery", text: ["Delivery is free and insured to all serviceable pincodes in India. Once your order is dispatched, the courier name and tracking number appear in your account and we email you a tracking link.", "Typical transit time is 2–6 working days depending on your location. Remote areas may take longer."] },
      { heading: "Gifts", text: ["You may ship to any address in India and add a gift note at checkout. Prices are never included in the parcel."] },
      { heading: "International orders", text: ["We currently ship within India only."] },
    ],
  },
  returns: {
    title: "Returns, repairs & remakes",
    description: "Our policy on returns, damaged deliveries and remakes for custom portraits.",
    updated: "27 October 2026",
    sections: [
      { heading: "Custom, made-to-order pieces", text: ["Because each portrait is made by hand from your own photograph, and you approve a digital preview before making, we cannot accept returns or refunds for a change of mind."] },
      { heading: "Damaged or incorrect pieces", text: ["If your portrait arrives damaged, or differs materially from the preview you approved, email us within 48 hours of delivery with your order number and photos of the parcel and the piece. We will repair or remake it at no cost, or refund you if a remake is not possible."] },
      { heading: "Cancellations", text: ["You may cancel for a full refund until you approve your digital preview. After approval, materials are cut and the making begins, so the order can no longer be cancelled."] },
      { heading: "Refund timing", text: ["Approved refunds are issued to the original payment method within 5–7 working days."] },
    ],
  },
  privacy: {
    title: "Privacy policy",
    description: "How Craftkiya collects, uses and protects your personal data and photographs.",
    updated: "27 October 2026",
    sections: [
      { heading: "What we collect", text: ["Your name, email address, phone number and delivery address; the photographs you upload; your order and payment status. Card and UPI details are handled by our payment provider and never reach our servers."] },
      { heading: "Your photographs", text: ["Uploaded photos are stored in a private, access-controlled storage folder. Only you and authorised studio staff can view them, through short-lived links. We never publish your photo or the finished portrait without your explicit consent, for example when you choose to share photos in a review."] },
      { heading: "How we use your data", text: ["To make and deliver your order, send you previews and updates, provide customer support and meet legal obligations. We do not sell your personal data."] },
      { heading: "Service providers", text: ["We use Supabase (database, authentication and storage), our payment gateway, courier partners and an email delivery service. Each receives only the data needed for its role."] },
      { heading: "Your rights", text: [`You can ask us to access, correct or delete your personal data, including your photos, by writing to ${brand.email}. We will respond within 30 days.`] },
    ],
  },
  terms: {
    title: "Terms of service",
    description: "The terms that apply when you order from Craftkiya.",
    updated: "27 October 2026",
    sections: [
      { heading: "Orders", text: ["An order is accepted once payment is received. Prices are in Indian rupees and include applicable taxes."] },
      { heading: "Your photographs", text: ["By uploading a photograph you confirm you have the right to use it and grant us a limited licence to use it solely to make your order."] },
      { heading: "Handmade variation", text: ["Each portrait is handmade, so small variations in thread placement and wood grain are part of its character and are not defects."] },
      { heading: "Liability", text: ["Our liability for any order is limited to the amount paid for that order, except where the law does not allow such a limit."] },
      { heading: "Contact", text: [`Questions about these terms can be sent to ${brand.email}.`] },
    ],
  },
};

type Params = { params: Promise<{ slug: string }> };
export const dynamicParams = false;
export const generateStaticParams = () => Object.keys(policies).map((slug) => ({ slug }));

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const policy = policies[(await params).slug];
  return policy ? { title: policy.title, description: policy.description, alternates: { canonical: `/policies/${(await params).slug}` } } : {};
}

export default async function PolicyPage({ params }: Params) {
  const { slug } = await params;
  const policy = policies[slug];
  if (!policy) notFound();
  return <main className="policy-page"><div className="wrap policy-wrap">
    <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link> / <span aria-current="page">{policy.title}</span></nav>
    <div className="eyebrow">Policies</div><h1 className="page-title">{policy.title}</h1><p className="policy-updated">Last updated {policy.updated}</p>
    {policy.sections.map((section) => <section key={section.heading}><h2>{section.heading}</h2>{section.text.map((text) => <p key={text}>{text}</p>)}</section>)}
    <nav className="policy-nav" aria-label="Other policies">{Object.entries(policies).filter(([key]) => key !== slug).map(([key, item]) => <Link className="text-link" key={key} href={`/policies/${key}`}>{item.title}</Link>)}</nav>
  </div></main>;
}
