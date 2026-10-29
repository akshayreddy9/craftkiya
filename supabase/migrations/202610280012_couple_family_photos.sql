-- Real studio shots for Double Face (4 pieces) and Family (5 pieces), replacing
-- the "sample photo coming soon" placeholders.
update public.products p
set cover_image_url = v.cover,
    gallery_image_urls = v.gallery
from (values
  ('double-face-string-art-portrait', '/art/portrait-couple-1.jpg',
   array['/art/portrait-couple-3.jpg', '/art/portrait-couple-2.jpg', '/art/portrait-couple-4.jpg']),
  ('family-string-art-portrait', '/art/portrait-family-3.jpg',
   array['/art/portrait-family-2.jpg', '/art/portrait-family-5.jpg', '/art/portrait-family-1.jpg', '/art/portrait-family-4.jpg'])
) as v (slug, cover, gallery)
where p.slug = v.slug;
