-- One size only: every product is a 24-inch circular portrait with a fixed
-- white ring frame and a single continuous thread, at Rs 4,999.
-- Older size/frame/detail variants are deactivated (not deleted) so past
-- orders keep their references. Safe to re-run.

insert into public.product_variants (product_id, dimension, frame_finish, string_density, price_inr, sort_order, is_active)
select p.id, '24-inch circle', 'White ring frame', 'Single thread', 4999, 1, true
from public.products p
where p.slug in ('custom-string-art-portrait', 'couple-string-art-portrait', 'mini-string-art-keepsake')
on conflict (product_id, dimension, frame_finish, string_density)
do update set price_inr = excluded.price_inr, is_active = true, sort_order = 1;

update public.product_variants v
set is_active = false
where not (v.dimension = '24-inch circle' and v.frame_finish = 'White ring frame' and v.string_density = 'Single thread');

update public.products
set subtitle = 'A single portrait, in one continuous thread',
    description = 'A 24-inch circular string-art portrait of the person (or pet) you love most, made from your photograph. Our artist maps your photo, then winds one continuous black thread around a ring of pins until the face appears.'
where slug = 'mini-string-art-keepsake';

-- The Standard vs Fine detail FAQ no longer applies; replace it with a size answer.
update public.faqs
set question = 'What size is the portrait?',
    answer = 'Every Craftkiya portrait is a 24-inch (about 61 cm) circle on a white ring frame, threaded by hand with a single continuous black thread. It is sized to be the centrepiece of a wall.'
where question = 'What is the difference between Standard and Fine detail?';
