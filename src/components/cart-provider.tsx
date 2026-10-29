"use client";

import { createContext, useContext, useState, useSyncExternalStore } from "react";
import { clearPhotos, deletePhoto } from "@/lib/photo-store";

export type CartItem = {
  id: string;
  productSlug: string;
  productTitle: string;
  variantId: string | null;
  dimension: string;
  frameFinish: string;
  stringDensity: string;
  price: number;
  notes: string;
  focus: { x: number; y: number };
  photoName: string | null;
};
/** The item just added from a product card; drives the "Customize now / later" sheet. */
export type AddedPrompt = { itemId: string; productTitle: string; price: number; compareAt: number | null; image: string };
type CartContextValue = {
  items: CartItem[];
  /** Adds a line and opens the bag drawer, unless `prompt` is given, which opens the customize sheet instead. */
  addItem: (item: Omit<CartItem, "id">, id?: string, prompt?: Omit<AddedPrompt, "itemId">) => void;
  updateItem: (id: string, patch: Partial<Omit<CartItem, "id">>) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  total: number;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  prompt: AddedPrompt | null;
  setPrompt: (prompt: AddedPrompt | null) => void;
};
const CartContext = createContext<CartContextValue | null>(null);
const storageKey = "craftkiya-cart-v2";
const changeEvent = "craftkiya-cart-change";
const emptyCart: CartItem[] = [];
let cachedRaw = "";
let cachedItems: CartItem[] = emptyCart;

const isCartItem = (item: CartItem) => Boolean(item) && typeof item.id === "string" && typeof item.productSlug === "string" &&
  typeof item.productTitle === "string" && (item.variantId === null || typeof item.variantId === "string") &&
  typeof item.dimension === "string" && typeof item.frameFinish === "string" && typeof item.stringDensity === "string" &&
  Number.isSafeInteger(item.price) && item.price > 0 && typeof item.notes === "string" &&
  typeof item.focus?.x === "number" && typeof item.focus?.y === "number";

function readCartSnapshot() {
  if (typeof window === "undefined") return emptyCart;
  let raw = "";
  try { raw = localStorage.getItem(storageKey) || ""; } catch { return emptyCart; }
  if (raw === cachedRaw) return cachedItems;
  cachedRaw = raw;
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    cachedItems = Array.isArray(parsed) ? parsed.filter(isCartItem).slice(0, 10) : emptyCart;
  } catch {
    cachedItems = emptyCart;
  }
  return cachedItems;
}

function subscribeToCart(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(changeEvent, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(changeEvent, onChange);
  };
}

function writeCart(items: CartItem[]) {
  const raw = JSON.stringify(items);
  try { localStorage.setItem(storageKey, raw); } catch { /* Private mode: keep the in-memory copy. */ }
  cachedRaw = raw;
  cachedItems = items;
  window.dispatchEvent(new Event(changeEvent));
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const items = useSyncExternalStore(subscribeToCart, readCartSnapshot, () => emptyCart);
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState<AddedPrompt | null>(null);
  const value: CartContextValue = {
    items,
    addItem: (item, id = crypto.randomUUID(), added) => {
      writeCart([...readCartSnapshot(), { ...item, id }].slice(-10));
      if (added) setPrompt({ ...added, itemId: id }); else setIsOpen(true);
    },
    updateItem: (id, patch) => writeCart(readCartSnapshot().map((item) => item.id === id ? { ...item, ...patch } : item)),
    removeItem: (id) => { writeCart(readCartSnapshot().filter((item) => item.id !== id)); void deletePhoto(id); },
    clearCart: () => { writeCart([]); void clearPhotos(); },
    total: items.reduce((sum, item) => sum + item.price, 0), isOpen, setIsOpen, prompt, setPrompt,
  };
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart must be used inside CartProvider");
  return value;
}
