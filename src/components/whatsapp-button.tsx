import { WhatsAppIcon } from "@/components/brand-icons";

/** Floating "Chat on WhatsApp" button shown on every page. */
export function WhatsAppButton({ href }: { href: string }) {
  return <a className="whatsapp-float" href={href} target="_blank" rel="noreferrer" aria-label="Chat with Craftkiya on WhatsApp">
    <WhatsAppIcon size={28} />
    <span className="whatsapp-float-label">Chat with us</span>
  </a>;
}
