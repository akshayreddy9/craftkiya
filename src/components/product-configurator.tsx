"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Check, Hand, ImagePlus, ShieldCheck, Truck } from "lucide-react";
import { useCart } from "@/components/cart-provider";
import { PriceTag } from "@/components/price-tag";
import type { Product } from "@/lib/catalog";
import { savePhoto, validatePhoto } from "@/lib/photo-store";

type Props = { product: Product; purchasable: boolean; heading?: string; showPrice?: boolean };

/** Photo upload + add to bag. The photo is only saved (no preview); it uploads privately at checkout. */
export function ProductConfigurator({ product, purchasable, heading, showPrice = true }: Props) {
  const { addItem } = useCart();
  const variants = product.variants;
  const [variantIndex, setVariantIndex] = useState(0);
  const [photo, setPhoto] = useState<File | null>(null);
  const [lowRes, setLowRes] = useState(false);
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [adding, setAdding] = useState(false);
  const [ctaVisible, setCtaVisible] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const ctaRef = useRef<HTMLButtonElement>(null);
  const variant = variants[variantIndex] || variants[0];

  useEffect(() => {
    const target = ctaRef.current;
    if (!target || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setCtaVisible(entry.isIntersecting), { threshold: 0.2 });
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  const selectPhoto = (file?: File) => {
    if (!file) return;
    const problem = validatePhoto(file);
    if (problem) { setMessage({ text: problem, error: true }); return; }
    setMessage(null);
    setPhoto(file);
    setLowRes(false);
    // Only to warn about small photos; nothing is displayed.
    const url = URL.createObjectURL(file);
    const probe = new window.Image();
    probe.onload = () => { setLowRes(Math.min(probe.naturalWidth, probe.naturalHeight) < 900); URL.revokeObjectURL(url); };
    probe.onerror = () => URL.revokeObjectURL(url);
    probe.src = url;
  };

  const add = async () => {
    if (!photo) {
      // Same flow as the product cards: add now, then choose "Customize now" or "Buy now, customize later".
      addItem({
        productSlug: product.slug, productTitle: product.title, variantId: variant.id, dimension: variant.dimension, frameFinish: variant.frameFinish,
        stringDensity: variant.stringDensity, price: variant.priceInr, notes: "", focus: { x: 50, y: 50 }, photoName: null,
      }, undefined, { productTitle: product.title, price: variant.priceInr, compareAt: variant.compareAtInr, image: product.image });
      return;
    }
    setAdding(true);
    const id = crypto.randomUUID();
    let stored = true;
    try { await savePhoto(id, photo); } catch { stored = false; }
    addItem({
      productSlug: product.slug, productTitle: product.title, variantId: variant.id, dimension: variant.dimension, frameFinish: variant.frameFinish,
      stringDensity: variant.stringDensity, price: variant.priceInr, notes: notes.trim().slice(0, 1000), focus: { x: 50, y: 50 }, photoName: stored ? photo.name : null,
    }, id);
    setMessage({ text: stored ? "Added to your cart with your photo." : "Added to your cart. Please re-attach your photo at checkout." });
    setAdding(false);
  };

  return <div className="custom-form">
    {heading && <><h2>{heading}</h2><p className="form-intro">A clear, well-lit photo works best. We send you a digital preview to approve before a single thread is wound.</p></>}
    {variants.length > 1 && <div className="field"><label htmlFor={`variant-${product.slug}`}>Option</label><select id={`variant-${product.slug}`} value={variantIndex} onChange={(event) => setVariantIndex(Number(event.target.value))}>{variants.map((option, index) => <option key={option.id || index} value={index}>{option.dimension} · {option.frameFinish}</option>)}</select></div>}

    <label className={`upload-box${photo ? " has-file" : ""}`} onDragOver={(event) => { event.preventDefault(); event.currentTarget.classList.add("dragging"); }} onDragLeave={(event) => event.currentTarget.classList.remove("dragging")} onDrop={(event) => { event.preventDefault(); event.currentTarget.classList.remove("dragging"); selectPhoto(event.dataTransfer.files[0]); }}>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif" aria-label="Choose your photo" onChange={(event) => selectPhoto(event.target.files?.[0])} />
      <div>{photo ? <Check className="upload-icon" size={26} /> : <ImagePlus className="upload-icon" size={26} />}<div className="upload-title">{photo ? "Photo saved" : "Upload your photo"}</div><div className="upload-help">{photo ? `${photo.name} · tap to change` : "Tap to choose, or drop it here · JPG, PNG, HEIC · up to 12 MB"}</div></div>
    </label>
    {lowRes && <p className="photo-hint" role="status">This photo is quite small. A larger original will give the artist more detail to work from.</p>}
    {photo && <details className="notes-toggle"><summary>Add a note for the artist (optional)</summary><textarea aria-label="Note for the artist" value={notes} maxLength={500} rows={2} onChange={(event) => setNotes(event.target.value)} placeholder="e.g. Leave out the person on the far left" /></details>}

    {showPrice && <div className="price-row"><span className="price-label">{variant.dimension} · {variant.frameFinish}<small>Free insured delivery · All taxes included</small></span><span className="price-value"><PriceTag price={variant.priceInr} compareAt={variant.compareAtInr} size="lg" /></span></div>}
    <button ref={ctaRef} className="button button-clay add-button" type="button" onClick={add} disabled={adding}>{adding ? "Adding…" : <>Add to cart <ArrowUpRight size={15} /></>}</button>
    {message && <p className={`form-status${message.error ? " error" : ""}`} role="status">{message.text}</p>}
    {!purchasable && <p className="fine-print">Catalog preview: online checkout opens once the studio catalog is connected.</p>}
    <ul className="trust-badges"><li><Hand size={14} /> 100% hand-woven</li><li><ShieldCheck size={14} /> Preview before making</li><li><Truck size={14} /> Free insured delivery</li></ul>

    <div className={`mobile-bar${ctaVisible ? " is-hidden" : ""}`} aria-hidden={ctaVisible}>
      <div className="mobile-price"><PriceTag price={variant.priceInr} compareAt={variant.compareAtInr} size="sm" /></div>
      <button className="button button-clay" type="button" tabIndex={ctaVisible ? -1 : 0} onClick={add}>Add to cart <ArrowUpRight size={14} /></button>
    </div>
  </div>;
}
