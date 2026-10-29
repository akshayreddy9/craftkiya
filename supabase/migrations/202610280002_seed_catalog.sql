-- Starter catalog and FAQs. Mirrors the static fallback in src/lib/catalog.ts and
-- src/lib/storefront.ts so the storefront looks the same before and after the
-- database is connected. Prices are placeholders: edit them in /studio/catalog.
-- Safe to re-run; existing rows are left untouched. Kept pure ASCII (U&'' escapes
-- for the multiplication sign and en dash) so pasting into the SQL editor cannot corrupt quotes.

insert into public.products (slug, title, subtitle, description, badge, cover_image_url, is_active, sort_order)
values
  (
    'custom-string-art-portrait',
    'Custom String Art Portrait',
    'Your family, threaded by hand',
    'Turn a favorite family photograph into a handmade string-art portrait. An artisan maps your photo, places every pin by hand and winds thousands of metres of thread until your people appear, framed in natural wood.',
    'Most loved',
    '/art/string-art-portrait-smile.jpg',
    true,
    1
  ),
  (
    'couple-string-art-portrait',
    'Couple String Art Portrait',
    'Your favorite person, always close',
    'A handmade thread-art portrait of the two of you, made from a photograph you love. Ideal for anniversaries, weddings and the quiet moments in between, with a digital preview for your approval before we begin.',
    'Made for two',
    '/art/string-art-portrait-black.jpg',
    true,
    2
  ),
  (
    'mini-string-art-keepsake',
    'Mini String Art Keepsake',
    'A small piece of a big story',
    'A desk-sized string-art keepsake made from a single portrait: a parent, a pet, a best friend. Hand-threaded on wood and framed to sit on a shelf or bedside table.',
    'A thoughtful gift',
    '/art/string-art-portrait-home.jpg',
    true,
    3
  )
on conflict (slug) do nothing;

insert into public.product_variants (product_id, dimension, frame_finish, string_density, price_inr, sort_order)
select p.id, s.dimension, f.finish, d.density, s.price + f.extra + d.extra, s.ord * 100 + f.ord * 10 + d.ord
from public.products p
join (values
  ('custom-string-art-portrait', U&'12 \00D7 12 in', 4900, 1),
  ('custom-string-art-portrait', U&'18 \00D7 18 in', 6900, 2),
  ('custom-string-art-portrait', U&'18 \00D7 24 in', 8900, 3),
  ('couple-string-art-portrait', U&'12 \00D7 12 in', 4900, 1),
  ('couple-string-art-portrait', U&'18 \00D7 18 in', 6900, 2),
  ('couple-string-art-portrait', U&'18 \00D7 24 in', 8900, 3),
  ('mini-string-art-keepsake', U&'8 \00D7 8 in', 2900, 1),
  ('mini-string-art-keepsake', U&'10 \00D7 10 in', 3600, 2)
) as s (slug, dimension, price, ord) on s.slug = p.slug
cross join (values ('Charcoal', 0, 1), ('Warm teak', 600, 2), ('Natural pine', 300, 3)) as f (finish, extra, ord)
cross join (values ('Standard', 0, 1), ('Fine detail', 1200, 2)) as d (density, extra, ord)
on conflict (product_id, dimension, frame_finish, string_density) do nothing;

insert into public.faqs (question, answer, sort_order, is_active)
select q.question, q.answer, q.sort_order, true
from (values
  ('What kind of photo should I send?', 'Choose a well-lit, in-focus photo where the people you want in your portrait are easy to see. A close-up with a simple background usually translates beautifully into thread art. Phone photos are perfect as long as they are not heavily filtered.', 1),
  ('Do I get to see it before you make it?', 'Yes. We prepare a digital draft and share it in your Craftkiya account for approval. Your piece only moves into physical making after you approve it, and you can request edits first.', 2),
  ('How long does it take?', U&'Your digital preview is usually ready within 2\20133 working days. Once you approve it, threading and framing take around 5\20137 working days, followed by insured delivery anywhere in India.', 3),
  ('Can I send it as a gift?', 'Absolutely. Add a gift note at checkout and ship it straight to the recipient. Prices are never printed on the packaging.', 4),
  ('What is the difference between Standard and Fine detail?', 'Fine detail uses more pins and a denser thread pattern, so facial features and small details read more clearly. It suits larger sizes and photos with more than two people.', 5),
  ('Can I return a custom portrait?', 'Because every portrait is made to order from your photo, we cannot accept returns for a change of mind. If your piece arrives damaged or differs from the approved preview, tell us within 48 hours of delivery and we will repair or remake it.', 6),
  ('Is my photo kept private?', 'Your photo is stored in a private, access-controlled folder that only you and our studio team can open. We never publish it without your written permission.', 7)
) as q (question, answer, sort_order)
where not exists (select 1 from public.faqs);
