-- Allow a "video" entry in site_banners: the process film shown in the
-- "Make it yours" section. title = heading, body = caption,
-- target_url = YouTube link or direct MP4 URL. Managed in /studio/storefront.
alter table public.site_banners drop constraint if exists site_banners_kind_check;
alter table public.site_banners add constraint site_banners_kind_check check (kind in ('announcement', 'promo', 'video'));
