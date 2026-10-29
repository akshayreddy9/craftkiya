# Craftkiya

Next.js 16 storefront and studio for handmade string-art portraits, built on Supabase (Postgres, Auth, Storage, RLS), with Razorpay payments, Resend email and Shiprocket tracking webhooks.

## Run locally

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in at least `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
3. In Supabase **SQL Editor**, run the migrations in order:
   1. `supabase/migrations/202610270001_initial.sql`
   2. `supabase/migrations/202610270002_customer_approval.sql`
   3. `supabase/migrations/202610280001_commerce.sql`: checkout RPC, payments, shipments, CMS fields, review rules, bucket limits
   4. `supabase/migrations/202610280002_seed_catalog.sql`: starter products, variants and FAQs (optional, but checkout needs at least one product)
4. In **Authentication → URL Configuration**, set the site URL and allow `<site>/auth/callback`.
5. `npm run dev`, then open `http://localhost:3000`.

Without Supabase the storefront still renders from a static fallback catalog, but checkout, accounts and the studio stay disabled.

## Granting studio access

Create a normal account, then in SQL Editor:

```sql
update public.profiles set role = 'admin' where email = 'owner@example.com';
```

Public sign-up never creates an admin. The proxy, every studio page and action, and RLS all check the role.

## How an order flows

1. The customer configures a portrait. The photo stays in the browser (IndexedDB) and the cart in localStorage.
2. At `/checkout` (sign-in required), photos upload straight to the private `customer-reference-images` bucket under the customer's own folder.
3. The `place_order` database function prices every line from `product_variants` (client prices are ignored), checks that each photo exists in the caller's folder, and dedupes on an idempotency key. The order starts as **Awaiting payment**.
4. When Razorpay is configured, the server creates a Razorpay order for the DB total. The browser callback signature (HMAC) and the `/api/webhooks/razorpay` webhook both mark the order paid idempotently, so a duplicate webhook can't record the payment or send the email twice. Without Razorpay, the studio uses **Mark paid (offline)**.
5. In the studio, uploading a proof moves the order to **Preview ready** and can email the customer. When the customer approves every item, a DB trigger moves the order to **Preview approved**.
6. Dispatch: enter the AWB/courier in the studio, or let the Shiprocket webhook (`/api/webhooks/shipping`, `x-api-key` = `SHIPPING_WEBHOOK_TOKEN`) advance it to dispatched/delivered.
7. After delivery, customers can leave a review with optional photos. Reviews only show publicly after studio approval.

## Studio (admin)

- `/studio`: order pipeline with filters and search, customer photo, notes, address, proof history, offline payment, courier details, emails.
- `/studio/catalog`: products, SEO fields, cover images, sizes/frames/thread detail and prices, and bulk % price changes.
- `/studio/storefront`: scheduled announcement strip, home promo cards, FAQ editor.
- `/studio/reviews`: approve, feature, reply, hide photos, delete.

## Webhooks

| Provider | URL | Secret |
| --- | --- | --- |
| Razorpay (events `payment.captured`, `order.paid`) | `<site>/api/webhooks/razorpay` | `RAZORPAY_WEBHOOK_SECRET` |
| Shiprocket tracking | `<site>/api/webhooks/shipping` | `SHIPPING_WEBHOOK_TOKEN` (x-api-key) |

## Keys

Only the project URL and publishable key go in `NEXT_PUBLIC_*`. `SUPABASE_SECRET_KEY`, Razorpay, Resend and webhook secrets are server-only. `.env.local` is gitignored.

## Deploy (Vercel)

The project is linked to the Vercel project `craftkiya` (https://craftkiya.vercel.app). Environment variables live in Vercel → Project → Settings → Environment Variables; `SUPABASE_SECRET_KEY` is stored as sensitive. `NEXT_PUBLIC_NOINDEX=true` keeps the preview out of search engines; remove it at launch.

```powershell
npx vercel deploy --prod   # build on Vercel and publish
```

`NEXT_PUBLIC_SITE_URL` can stay unset on Vercel (it falls back to the production URL). Set it when you attach a custom domain, and add that domain plus `/auth/callback` in Supabase → Authentication → URL Configuration.

## Checks

```powershell
npm.cmd run lint
npx tsc --noEmit
npm.cmd run build
```
