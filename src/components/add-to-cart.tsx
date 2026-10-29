"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Camera, Check, ShoppingBag, X } from "lucide-react";
import { useCart } from "@/components/cart-provider";
import { PriceTag } from "@/components/price-tag";
import type { Variant } from "@/lib/catalog";
import { savePhoto, validatePhoto } from "@/lib/photo-store";

type CardProduct = { slug: string; title: string; image: string };

/** Product-card button: adds the portrait without a photo and opens the customize sheet. */
export function AddToCartButton({ product, variant }: { product: CardProduct; variant: Variant }) {
  const { addItem } = useCart();
  const add = () => addItem({
    productSlug: product.slug, productTitle: product.title, variantId: variant.id, dimension: variant.dimension, frameFinish: variant.frameFinish,
    stringDensity: variant.stringDensity, price: variant.priceInr, notes: "", focus: { x: 50, y: 50 }, photoName: null,
  }, undefined, { productTitle: product.title, price: variant.priceInr, compareAt: variant.compareAtInr, image: product.image });
  return <button type="button" className="button add-to-cart-button" onClick={add}><ShoppingBag size={15} /> Add to cart</button>;
}

/** Shown after "Add to cart": upload the photo now, or check out and add it later. */
export function CustomizeSheet() {
  const router = useRouter();
  const { prompt, setPrompt, updateItem } = useCart();
  const inputRef = useRef<HTMLInputElement>(null);
  const [savedName, setSavedName] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const close = () => { setPrompt(null); setSavedName(""); setError(""); };
  const isOpen = Boolean(prompt);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") { setPrompt(null); setSavedName(""); setError(""); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, setPrompt]);

  if (!prompt) return null;
  const goToCheckout = () => { close(); router.push("/checkout"); };

  const choosePhoto = async (file?: File) => {
    if (!file || !prompt) return;
    const problem = validatePhoto(file);
    if (problem) { setError(problem); return; }
    setSaving(true);
    try {
      await savePhoto(prompt.itemId, file);
      updateItem(prompt.itemId, { photoName: file.name });
      setSavedName(file.name);
      setError("");
    } catch {
      setError("We couldn’t read that photo. Please try another one.");
    } finally {
      setSaving(false);
    }
  };

  return <div className="sheet-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
    <div className="customize-sheet" role="dialog" aria-modal="true" aria-labelledby="customize-sheet-title">
      <button className="close-button sheet-close" type="button" onClick={close} aria-label="Close"><X size={20} /></button>
      <div className="sheet-added">
        <div className="sheet-thumb"><Image src={prompt.image} alt="" fill sizes="72px" /></div>
        <div><span className="sheet-check"><Check size={14} /> Added to cart</span><strong>{prompt.productTitle}</strong><PriceTag price={prompt.price} compareAt={prompt.compareAt} size="sm" /></div>
      </div>
      {savedName ? <>
        <h2 id="customize-sheet-title">✓ Photo saved</h2>
        <p>{savedName}. We’ll turn it into a digital draft for you to approve after you order.</p>
        <button className="button button-clay sheet-primary" type="button" onClick={goToCheckout}>Checkout now</button>
        <button className="text-link sheet-secondary" type="button" onClick={close}>Continue shopping</button>
      </> : <>
        <h2 id="customize-sheet-title">Add your photo now?</h2>
        <p>Upload it now and we can start your digital preview as soon as you’ve paid, or check out now and add your photo later from your account.</p>
        <button className="button button-clay sheet-primary" type="button" onClick={() => inputRef.current?.click()} disabled={saving}><Camera size={16} /> {saving ? "Adding your photo…" : "Customize now"}</button>
        <button className="button button-outline sheet-primary" type="button" onClick={goToCheckout}>Buy now, customize later</button>
        <input ref={inputRef} type="file" hidden accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif" onChange={(event) => choosePhoto(event.target.files?.[0])} />
      </>}
      {error && <p className="form-status error" role="alert">{error}</p>}
    </div>
  </div>;
}
