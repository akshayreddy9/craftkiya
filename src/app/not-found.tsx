import Link from "next/link";

export default function NotFound() {
  return <main className="auth-page not-found"><div className="eyebrow">Lost the thread</div><h1 className="page-title">We couldn’t find that page.</h1><p>It may have moved, or the link may be mistyped.</p><div className="hero-links"><Link className="button" href="/">Back to the studio</Link><Link className="text-link" href="/gifts">Browse gift ideas</Link></div></main>;
}
