"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronRight, LayoutDashboard, LogOut, Package, User, UserRound } from "lucide-react";
import { signOutAction } from "@/app/auth/actions";

type Me = { name: string; email: string; isAdmin: boolean; orders: number } | null;

/** Profile icon that opens a small panel with the account options instead of a full page. */
export function AccountMenu() {
  const [open, setOpen] = useState(false);
  const [me, setMe] = useState<Me | undefined>(undefined);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    fetch("/api/me", { cache: "no-store" }).then((response) => response.json()).then((data) => setMe(data.user)).catch(() => setMe(null));
    const onPointer = (event: PointerEvent) => { if (!ref.current?.contains(event.target as Node)) setOpen(false); };
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onPointer); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const close = () => setOpen(false);
  const first = me?.name?.split(" ")[0];

  return <div className="account-menu" ref={ref}>
    <button className="icon-button" type="button" aria-label="Your account" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}><User size={18} /></button>
    {open && <div className="account-panel" role="menu">
      {me === undefined ? <div className="account-panel-loading">Loading…</div> : me ? <>
        <div className="account-panel-head"><span className="account-avatar">{(first || me.email || "?").charAt(0).toUpperCase()}</span><div><strong>Hello{first ? `, ${first}` : ""}!</strong><small>{me.email}</small></div></div>
        <Link role="menuitem" href="/account" onClick={close}><Package size={17} /><span>My orders{me.orders > 0 && <em>{me.orders}</em>}</span><ChevronRight size={15} /></Link>
        <Link role="menuitem" href="/account?section=details#details" onClick={close}><UserRound size={17} /><span>My details</span><ChevronRight size={15} /></Link>
        {me.isAdmin && <Link role="menuitem" href="/studio" onClick={close}><LayoutDashboard size={17} /><span>Studio</span><ChevronRight size={15} /></Link>}
        <form action={signOutAction}><button role="menuitem" type="submit" className="account-signout"><LogOut size={17} /><span>Sign out</span></button></form>
      </> : <>
        <div className="account-panel-guest"><strong>Welcome to Craftkiya</strong><small>Sign in to track your order and approve your portrait preview.</small></div>
        <Link className="button button-clay" href="/login" onClick={close}>Sign in</Link>
        <Link className="button button-outline" href="/login?mode=signup" onClick={close}>Create account</Link>
      </>}
    </div>}
  </div>;
}
