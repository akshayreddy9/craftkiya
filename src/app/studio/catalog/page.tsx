import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { addVariant, adjustPrices, saveProduct, saveVariant } from "@/app/studio/catalog/actions";
import { requireAdmin } from "@/lib/auth";
import { money } from "@/lib/site";

export const metadata: Metadata = { title: "Catalog" };

const messages: Record<string, [string, boolean?]> = {
  "product-saved": ["Product saved. The storefront refreshes automatically."],
  "variant-saved": ["Pricing saved. The storefront refreshes automatically."],
  "product-invalid": ["Use a lowercase slug with hyphens (e.g. family-portrait) and a title of at least 3 characters.", true],
  "slug-taken": ["Another product already uses that slug.", true],
  "image-host": ["Image links must come from images.unsplash.com or your Supabase storage. Upload a file instead.", true],
  "image-invalid": ["Cover images must be JPG, PNG, WEBP or AVIF under 6 MB.", true],
  "variant-invalid": ["Check the size, frame and price values.", true],
  "variant-exists": ["That size/frame/detail combination already exists.", true],
  "save-error": ["That change could not be saved.", true],
};

type Variant = { id: string; dimension: string; frame_finish: string; string_density: string; price_inr: number; is_active: boolean; sort_order: number };
type Product = { id: string; slug: string; title: string; subtitle: string; description: string; badge: string | null; cover_image_url: string | null; is_active: boolean; sort_order: number; seo_title: string | null; seo_description: string | null; gallery_image_urls: string[] | null; product_variants: Variant[] | null };

function ProductFields({ product }: { product?: Product }) {
  return <>
    <div className="field-grid field-grid-3"><div className="field"><label>Title</label><input name="title" required maxLength={120} defaultValue={product?.title} /></div><div className="field"><label>URL slug</label><input name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={80} defaultValue={product?.slug} /></div><div className="field"><label>Badge</label><input name="badge" maxLength={40} defaultValue={product?.badge || ""} placeholder="Most loved" /></div></div>
    <div className="field"><label>Subtitle</label><input name="subtitle" maxLength={160} defaultValue={product?.subtitle} /></div>
    <div className="field"><label>Description</label><textarea name="description" rows={3} maxLength={3000} defaultValue={product?.description} /></div>
    <div className="field-grid"><div className="field"><label>SEO title <span>(≤ 60 chars, optional)</span></label><input name="seoTitle" maxLength={70} defaultValue={product?.seo_title || ""} /></div><div className="field"><label>SEO description <span>(≤ 160 chars, optional)</span></label><input name="seoDescription" maxLength={170} defaultValue={product?.seo_description || ""} /></div></div>
    <div className="field-grid field-grid-3"><div className="field"><label>Upload cover image</label><input name="coverImage" type="file" accept="image/jpeg,image/png,image/webp,image/avif" /></div><div className="field"><label>…or image URL</label><input name="coverImageUrl" type="url" defaultValue="" placeholder={product?.cover_image_url ? "Keep current image" : "https://images.unsplash.com/…"} /></div><div className="field"><label>Sort order</label><input name="sortOrder" type="number" defaultValue={product?.sort_order ?? 0} /></div></div>
    <div className="field-grid"><div className="field"><label>Slideshow images <span>(one link per line, shown after the cover; delete a line to remove it)</span></label><textarea name="galleryUrls" rows={4} defaultValue={(product?.gallery_image_urls || []).join("\n")} placeholder="/art/portrait-studio-scarf.jpg" /></div><div className="field"><label>Add slideshow images <span>(select several; JPG, PNG, WEBP, AVIF up to 6 MB each)</span></label><input name="galleryImages" type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif" /></div></div>
    <label className="check-row"><input type="checkbox" name="isActive" defaultChecked={product?.is_active ?? false} /> Visible on the storefront</label>
  </>;
}

export default async function StudioCatalogPage({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  const { message } = await searchParams;
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.from("products")
    .select("id,slug,title,subtitle,description,badge,cover_image_url,is_active,sort_order,seo_title,seo_description,gallery_image_urls,product_variants(id,dimension,frame_finish,string_density,price_inr,is_active,sort_order)")
    .order("sort_order");
  const products = (data || []) as Product[];
  const notice = message ? messages[message] : undefined;

  return <main className="studio-page">
    <div className="studio-heading"><div className="eyebrow">Catalog &amp; pricing</div><h1>Products</h1><p>Edit products, sizes, frame finishes, thread detail and prices. Checkout always charges the prices saved here.</p></div>
    {notice && <p className={`auth-message${notice[1] ? " auth-error" : ""}`} role="status">{notice[0]}</p>}
    {error && <div className="empty-state">The catalog could not be loaded. Confirm all migrations have been applied.</div>}
    {!error && !products.length && <div className="setup-card">No products yet. Run <code>supabase/migrations/202610280002_seed_catalog.sql</code> to load the starter catalog, or add a product below.</div>}
    <div className="studio-orders">{products.map((product) => {
      const variants = [...(product.product_variants || [])].sort((a, b) => a.sort_order - b.sort_order);
      return <article className="studio-order" key={product.id}>
        <details className="studio-card-details"><summary className="catalog-summary">
          <div className="catalog-thumb">{product.cover_image_url && <Image src={product.cover_image_url} alt="" fill sizes="64px" />}</div>
          <div><strong>{product.title}</strong><span className="muted">/products/{product.slug} · {variants.filter((variant) => variant.is_active).length} active options · from {variants.length ? money(Math.min(...variants.map((variant) => variant.price_inr))) : "—"}</span></div>
          <span className={`status-pill${product.is_active ? "" : " muted-pill"}`}>{product.is_active ? "Live" : "Hidden"}</span>
        </summary>
          <form action={saveProduct} encType="multipart/form-data" className="studio-form"><input type="hidden" name="id" value={product.id} /><ProductFields product={product} /><div className="studio-form-foot"><Link className="text-link" href={`/products/${product.slug}`} target="_blank">View on site</Link><button className="button" type="submit">Save product</button></div></form>
          <div className="variant-table-wrap"><table className="studio-table"><thead><tr><th>Size</th><th>Frame</th><th>Detail</th><th>Price (₹)</th><th>Order</th><th>Active</th><th /></tr></thead><tbody>
            {variants.map((variant) => <tr key={variant.id}><td>{variant.dimension}</td><td>{variant.frame_finish}</td><td>{variant.string_density}</td><td colSpan={4}><form action={saveVariant} className="variant-form"><input type="hidden" name="id" value={variant.id} /><input name="price" type="number" min={1} step={1} defaultValue={variant.price_inr} aria-label="Price in rupees" /><input name="sortOrder" type="number" defaultValue={variant.sort_order} aria-label="Sort order" /><input type="checkbox" name="isActive" defaultChecked={variant.is_active} aria-label="Active" /><button className="button button-outline" type="submit">Save</button></form></td></tr>)}
          </tbody></table></div>
          <div className="studio-split">
            <form action={addVariant} className="studio-inline-form"><input type="hidden" name="productId" value={product.id} /><input name="dimension" placeholder="24 × 36 in" required maxLength={40} aria-label="Size" /><input name="frameFinish" placeholder="Matte black" required maxLength={40} aria-label="Frame finish" /><input name="stringDensity" placeholder="Standard" maxLength={40} aria-label="Thread detail" /><input name="price" type="number" min={1} placeholder="₹" required aria-label="Price" /><button className="button button-outline" type="submit">Add option</button></form>
            <form action={adjustPrices} className="studio-inline-form"><input type="hidden" name="productId" value={product.id} /><input name="percent" type="number" min={-50} max={50} step={1} placeholder="%" required aria-label="Percent change" /><button className="button button-outline" type="submit">Adjust all prices by %</button></form>
          </div>
        </details>
      </article>;
    })}</div>
    <section className="studio-section"><h2>Add a product</h2><form action={saveProduct} encType="multipart/form-data" className="studio-form studio-order"><ProductFields /><div className="studio-form-foot"><span className="muted">Add sizes and prices after saving. Products with no active options stay hidden.</span><button className="button" type="submit">Create product</button></div></form></section>
  </main>;
}
