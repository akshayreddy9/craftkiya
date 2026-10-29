# Craftkiya Development Handoff

## Goal

Craftkiya is a premium handmade string-art ecommerce brand. The original brief was `craftkiya_master_prompt.md`, kept outside this repository. Launch focus: custom thread/string-art portrait gifts, with the catalog able to expand later.

## Current state (27 Oct 2026)

Next.js 16 App Router, React 19, TypeScript, Tailwind 4, Supabase SSR. Lint, `tsc --noEmit` and `next build` pass (34 routes). Smoke tests against the dev server: every public route returns 200, unknown products return 404, and JSON-LD parses. Desktop and 390px mobile renders show no horizontal overflow.

**Not yet verified end to end:** Supabase is still unconfigured locally (the publishable key is blank because the earlier key returned `401 Invalid API key`), and migrations have not been run against the live project. Checkout, payment, studio, account and webhooks are implemented and type-checked but untested against a real database or real Razorpay/Resend/Shiprocket accounts.

## Security warning (unchanged)

A Supabase secret key was pasted into a previous chat. Treat it as compromised and rotate it. Never put secret keys in `NEXT_PUBLIC_*`. The new `SUPABASE_SECRET_KEY` is read only in `src/lib/supabase/admin.ts` (`server-only`).

## What was added in this session

- **Migrations** `202610280001_commerce.sql` and `202610280002_seed_catalog.sql`:
  - `place_order` RPC: server-side pricing, photo ownership check, idempotency key
  - `pending_payment` status; order numbers (`CK1001…`); contact, payment and shipment columns
  - approval → order-status trigger; `updated_at` triggers
  - banner kinds; review fields and a delivered-only submit policy
  - bucket size/MIME limits; public `catalog-images` and `review-photos` buckets
- **Catalog from DB** (`src/lib/catalog.ts`) with a static fallback that mirrors the seed. The pages use ISR (`revalidate = 300`) and a cookie-free public client.
- **Configurator** (`src/components/product-configurator.tsx`):
  - live wood-frame preview whose aspect ratio matches the chosen size
  - drag/arrow-key photo reframing; crop and low-resolution warnings
  - size, frame and thread-detail options driven by the DB variants
  - animated price, notes for the artist, trust badges
  - sticky mobile bar that hides while the main button is visible
- **Cart v2** + IndexedDB photo store (`src/lib/photo-store.ts`). Checkout at `/checkout` uploads photos privately, calls the RPC, then opens Razorpay. Server actions: `src/app/checkout/actions.ts`; shared logic: `src/lib/orders.ts`.
- **Webhooks:** `/api/webhooks/razorpay` (HMAC verified, idempotent, amount checked) and `/api/webhooks/shipping` (Shiprocket token).
- **Account:**
  - order numbers; five-step tracker; pay-now retry
  - inline signed preview images; approve, or request an edit (feedback required)
  - earlier drafts, tracking info, delivered-only review form with consented before/after photos
  - profile editing
- **Studio:**
  - shared layout and nav
  - order pipeline (filters, search, customer photo, notes, address, offline payments, courier and tracking link, dispatch email, proof upload + email)
  - catalog manager
  - banners and FAQs CMS
  - review moderation
- **SEO:**
  - absolute-URL JSON-LD: Organization, WebSite, Product with Offer/shipping/MerchantReturnPolicy, AggregateRating and reviews (only when real reviews exist), FAQPage, BreadcrumbList, ItemList, CollectionPage
  - eight occasion landing pages with unique copy and FAQs; `/gifts` index (`/custom-gifts` redirects to it)
  - policy pages; sitemap built from the catalog; AVIF/WebP image optimization
- **Auth:** `next` redirects, so checkout → sign-in → back to checkout works. Phone OTP accepts 10-digit Indian numbers.
- **UX:**
  - minimum font sizes raised (old mobile text was 7–9px)
  - fake sample testimonials replaced by honest promise cards until real reviews exist
  - skip link, focus styles, Escape closes the bag, branded 404, SVG icon
- ESLint now ignores `.next-craftkiya/` and `legacy-preview/` (it was linting build output).

## Setup to go live

1. Get a valid publishable key and run all four migrations in order (see README).
2. Promote the owner to admin. Then test sign-up, Google and SMS sign-in, and RLS isolation between two customers.
3. Add `SUPABASE_SECRET_KEY` plus the Razorpay keys. Configure the Razorpay webhook. Test a ₹1 order in test mode, including closing the payment window and retrying from `/account`.
4. Add the Resend keys, verify the sending domain, and test the confirmation, preview and dispatch emails.
5. Configure the Shiprocket webhook token, or enter AWBs manually.

## Still outstanding

- Business review: seed prices, frame/detail upcharges, timelines in FAQs and policies, and all policy text (drafts, not legal advice).
- Replace Unsplash stock imagery with real Craftkiya product photography. Several gift pages share the same three images.
- WhatsApp OTP (needs a provider). Automatic Shiprocket shipment creation (only tracking webhooks are in). Coupons/discounts. GST invoices.
- Automated tests: the `place_order` pricing/ownership rules, the Razorpay signature/webhook idempotency, and an RLS test suite.
- Framer Motion was not added. The micro-interactions are CSS transitions, which keeps JavaScript off the critical path.
