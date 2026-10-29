"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Product-page slideshow: swipe (scroll-snap) on phones, arrows and thumbnails
 * on desktop, dots everywhere. Advances every 4 s until the shopper interacts.
 */
export function ProductGallery({ images, title }: { images: string[]; title: string }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [autoplay, setAutoplay] = useState(true);
  const count = images.length;

  const goTo = (next: number) => {
    const track = trackRef.current;
    if (!track) return;
    const target = (next + count) % count;
    track.scrollTo({ left: target * track.clientWidth, behavior: "smooth" });
  };
  const userGo = (next: number) => { setAutoplay(false); goTo(next); };

  useEffect(() => {
    if (!autoplay || count < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      const track = trackRef.current;
      if (!track) return;
      const current = Math.round(track.scrollLeft / track.clientWidth);
      track.scrollTo({ left: ((current + 1) % count) * track.clientWidth, behavior: "smooth" });
    }, 4000);
    return () => window.clearInterval(timer);
  }, [autoplay, count]);

  return <div className="product-gallery" aria-roledescription="carousel" aria-label={`${title} photos`}>
    <div className="gallery-stage">
      <div className="gallery-track" ref={trackRef} onScroll={(event) => setIndex(Math.round(event.currentTarget.scrollLeft / event.currentTarget.clientWidth))} onPointerDown={() => setAutoplay(false)} onTouchStart={() => setAutoplay(false)}>
        {images.map((src, slide) => <div className="gallery-slide" key={src} aria-roledescription="slide" aria-label={`${slide + 1} of ${count}`}>
          <Image src={src} alt={slide === 0 ? `${title} — handmade string art` : `${title}, photo ${slide + 1}`} fill sizes="(max-width: 680px) 100vw, 50vw" priority={slide === 0} />
        </div>)}
      </div>
      {count > 1 && <>
        <button type="button" className="gallery-arrow prev" onClick={() => userGo(index - 1)} aria-label="Previous photo"><ChevronLeft size={20} /></button>
        <button type="button" className="gallery-arrow next" onClick={() => userGo(index + 1)} aria-label="Next photo"><ChevronRight size={20} /></button>
        <div className="gallery-dots">{images.map((src, dot) => <button type="button" key={src} className={dot === index ? "active" : ""} onClick={() => userGo(dot)} aria-label={`Show photo ${dot + 1}`} aria-current={dot === index} />)}</div>
      </>}
    </div>
    {count > 1 && <div className="gallery-thumbs">{images.map((src, thumb) => <button type="button" key={src} className={thumb === index ? "active" : ""} onClick={() => userGo(thumb)} aria-label={`Show photo ${thumb + 1}`}><Image src={src} alt="" fill sizes="80px" /></button>)}</div>}
  </div>;
}
