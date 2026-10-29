"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import Image from "next/image";

export type BeforeAfterPair = { before: string; after: string; label: string };

/**
 * Circular before/after wipe: the customer's photo on the left of the divider,
 * the finished string art on the right. The divider sweeps by itself while on
 * screen; dragging it takes over, and the sweep resumes a few seconds later.
 */
function Comparison({ pair, offset }: { pair: BeforeAfterPair; offset: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(50);
  const dragging = useRef(false);
  const pausedUntil = useRef(0);

  useEffect(() => {
    const element = ref.current;
    if (!element || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    let visible = false;
    const start = performance.now() - offset;
    const tick = (now: number) => {
      if (visible && !dragging.current && now > pausedUntil.current) {
        // Ease back and forth between 12% and 88% every ~5 seconds.
        const t = ((now - start) / 5200) * Math.PI * 2;
        setPos(50 + 38 * Math.sin(t));
      }
      frame = requestAnimationFrame(tick);
    };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }, { threshold: 0.2 });
    observer.observe(element);
    frame = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [offset]);

  const moveTo = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setPos(Math.min(100, Math.max(0, ((event.clientX - rect.left) / rect.width) * 100)));
  };

  return <figure className="ba-item">
    <div
      ref={ref}
      className="ba-circle"
      role="slider" aria-label={`${pair.label}: before and after`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pos)} tabIndex={0}
      onPointerDown={(event) => { dragging.current = true; event.currentTarget.setPointerCapture(event.pointerId); moveTo(event); }}
      onPointerMove={(event) => { if (dragging.current) moveTo(event); }}
      onPointerUp={() => { dragging.current = false; pausedUntil.current = performance.now() + 4000; }}
      onPointerCancel={() => { dragging.current = false; }}
      onKeyDown={(event) => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();
        pausedUntil.current = performance.now() + 6000;
        setPos((current) => Math.min(100, Math.max(0, current + (event.key === "ArrowLeft" ? -5 : 5))));
      }}
    >
      <Image src={pair.after} alt={`${pair.label} string-art portrait, handmade by Craftkiya`} fill sizes="(max-width: 680px) 78vw, 340px" className="ba-img" draggable={false} />
      <div className="ba-before" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        <Image src={pair.before} alt={`The customer's original ${pair.label.toLowerCase()} photo`} fill sizes="(max-width: 680px) 78vw, 340px" className="ba-img" draggable={false} />
      </div>
      <span className="ba-divider" style={{ left: `${pos}%` }} aria-hidden="true"><span className="ba-handle">‹ ›</span></span>
      <span className="ba-tag ba-tag-before" aria-hidden="true">Photo</span>
      <span className="ba-tag ba-tag-after" aria-hidden="true">Thread art</span>
    </div>
    <figcaption>{pair.label}</figcaption>
  </figure>;
}

export function BeforeAfterGallery({ pairs }: { pairs: BeforeAfterPair[] }) {
  return <div className="ba-gallery">{pairs.map((pair, index) => <Comparison key={pair.after} pair={pair} offset={index * 900} />)}</div>;
}
