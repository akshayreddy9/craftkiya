import { money } from "@/lib/site";

/** Selling price, with the original price struck through and "% off" when an original price is set. */
export function PriceTag({ price, compareAt, size = "md" }: { price: number; compareAt: number | null; size?: "sm" | "md" | "lg" }) {
  const off = compareAt && compareAt > price ? Math.round((1 - price / compareAt) * 100) : 0;
  return <span className={`price-tag price-tag-${size}`}>
    <strong>{money(price)}</strong>
    {off > 0 && <><s aria-label={`Original price ${money(compareAt as number)}`}>{money(compareAt as number)}</s><em>{off}% off</em></>}
  </span>;
}
