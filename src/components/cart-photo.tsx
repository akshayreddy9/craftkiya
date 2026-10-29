"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { getPhoto } from "@/lib/photo-store";

/** Loads a cart line's reference photo from IndexedDB. `version` forces a reload after replacement. */
export function useCartPhoto(id: string, version = 0) {
  const [state, setState] = useState<{ blob: Blob | null; url: string; loaded: boolean }>({ blob: null, url: "", loaded: false });
  useEffect(() => {
    let active = true;
    let url = "";
    getPhoto(id).then((blob) => {
      if (!active) return;
      url = blob ? URL.createObjectURL(blob) : "";
      setState({ blob, url, loaded: true });
    });
    return () => { active = false; if (url) URL.revokeObjectURL(url); };
  }, [id, version]);
  return state;
}

export function CartPhoto({ id, focus, version }: { id: string; focus?: { x: number; y: number }; version?: number }) {
  const { url } = useCartPhoto(id, version);
  return <div className="cart-thumb">{url && <Image src={url} alt="" fill sizes="64px" unoptimized style={{ objectFit: "cover", objectPosition: focus ? `${focus.x}% ${focus.y}%` : "center" }} />}</div>;
}
