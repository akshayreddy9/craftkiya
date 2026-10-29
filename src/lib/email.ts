import "server-only";
import nodemailer from "nodemailer";
import { absoluteUrl, brand, money } from "@/lib/site";

export const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[character] || character);

// Two ways to send, both server-only env vars (never NEXT_PUBLIC_):
//  - SMTP (e.g. Gmail with an app password): SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
//  - Resend API: RESEND_API_KEY, RESEND_FROM_EMAIL
const smtpConfig = () => {
  const { SMTP_HOST: host, SMTP_USER: user, SMTP_PASS: pass } = process.env;
  return host && user && pass ? { host, user, pass, port: Number(process.env.SMTP_PORT || 465), from: process.env.SMTP_FROM || `Craftkiya <${user}>` } : null;
};
const resendConfig = () => process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL ? { apiKey: process.env.RESEND_API_KEY, from: process.env.RESEND_FROM_EMAIL } : null;

export const isEmailConfigured = () => Boolean(smtpConfig() || resendConfig());

/** Sends a branded email. Returns false instead of throwing so callers can degrade gracefully. */
export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  if (!to) return false;
  const body = wrap(html);
  const smtp = smtpConfig();
  try {
    if (smtp) {
      const transport = nodemailer.createTransport({ host: smtp.host, port: smtp.port, secure: smtp.port === 465, auth: { user: smtp.user, pass: smtp.pass } });
      await transport.sendMail({ from: smtp.from, to, subject, html: body, replyTo: brand.email });
      return true;
    }
    const resend = resendConfig();
    if (!resend) return false;
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resend.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: resend.from, to: [to], subject, html: body, reply_to: brand.email }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/** Where new-order alerts go: ADMIN_NOTIFY_EMAIL, or the business inbox. */
export const adminEmail = () => process.env.ADMIN_NOTIFY_EMAIL || brand.email;

function wrap(body: string) {
  return `<div style="margin:0;padding:24px 12px;background:#fdf6ec;font-family:Arial,Helvetica,sans-serif;color:#1f1e3d">
<table role="presentation" width="100%" style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #ebe0d0;border-radius:14px">
<tr><td style="padding:26px 28px 6px;text-align:center"><div style="font-family:Georgia,serif;font-size:28px;font-weight:bold"><span style="color:#2b2a6b">craft</span><span style="color:#d63370">kiya</span></div><div style="font-size:10px;letter-spacing:3px;color:#6b6a80;margin-top:4px">CUSTOMISED ARTS &amp; CRAFTS</div></td></tr>
<tr><td style="padding:18px 28px 8px;font-size:15px;line-height:1.65;color:#2f2e4a">${body}</td></tr>
<tr><td style="padding:16px 28px 24px;text-align:center;border-top:1px solid #ebe0d0;font-size:12px;line-height:1.6;color:#6b6a80">Questions? Just reply to this email or WhatsApp us.<br>${brand.legalName} · Handmade in India · <a href="${absoluteUrl("/")}" style="color:#2b2a6b">craftkiya.com</a></td></tr>
</table></div>`;
}

const heading = (text: string) => `<h1 style="font-family:Georgia,serif;font-weight:normal;font-size:24px;line-height:1.25;color:#1f1e3d;margin:0 0 12px;text-align:center">${text}</h1>`;
const button = (href: string, label: string, color = "#d63370") => `<p style="margin:22px 0;text-align:center"><a href="${href}" style="display:inline-block;padding:13px 26px;background:${color};color:#ffffff;text-decoration:none;border-radius:8px;font-weight:bold">${label}</a></p>`;
const orderBox = (rows: [string, string][]) => `<table role="presentation" width="100%" style="margin:16px 0;border-collapse:collapse;background:#fdf6ec;border-radius:10px">${rows.map(([label, value]) => `<tr><td style="padding:9px 14px;font-size:13px;color:#6b6a80">${label}</td><td style="padding:9px 14px;font-size:14px;text-align:right;font-weight:bold;color:#1f1e3d">${value}</td></tr>`).join("")}</table>`;
const steps = (current: number) => {
  const names = ["Order confirmed", "Digital preview", "You approve", "Threading by hand", "Dispatched"];
  return `<p style="margin:14px 0;font-size:12px;color:#6b6a80;text-align:center">${names.map((name, index) => index < current ? `<span style="color:#2b2a6b">✓ ${name}</span>` : index === current ? `<strong style="color:#d63370">● ${name}</strong>` : `<span>○ ${name}</span>`).join(" &nbsp; ")}</p>`;
};
const hello = (name: string) => `<p style="margin:0 0 12px">Hi ${escapeHtml(name.split(" ")[0] || "there")},</p>`;

type OrderInfo = { name: string; orderNumber: string; total: number };

export const emails = {
  /** Sent when the order is placed and is waiting for payment. */
  orderPlaced: (order: OrderInfo & { needsPhoto: boolean }) => ({
    subject: `We’ve received your order ${order.orderNumber}`,
    html: `${heading("Thank you for your order!")}${hello(order.name)}<p>Your handmade string-art portrait order is saved. Here are the details:</p>${orderBox([["Order", escapeHtml(order.orderNumber)], ["Total", money(order.total)], ["Status", "Awaiting payment"]])}<p>${order.needsPhoto ? "<strong>Next step:</strong> upload your photo from your account so our artist can start your digital preview." : "Complete your payment from your account and our artist will start your digital preview."}</p>${button(absoluteUrl("/account"), order.needsPhoto ? "Upload your photo" : "View my order")}`,
  }),
  /** Sent when payment is confirmed. */
  orderConfirmed: (order: OrderInfo) => ({
    subject: `Order ${order.orderNumber} confirmed — your portrait has begun`,
    html: `${heading("Payment received — your portrait has begun!")}${hello(order.name)}<p>Thank you! We’ve received <strong>${money(order.total)}</strong> for order <strong>${escapeHtml(order.orderNumber)}</strong>.</p>${steps(1)}<p>Our artist is now mapping your photo into a digital thread draft. You’ll get an email as soon as it’s ready — <strong>nothing is threaded until you approve it.</strong></p>${button(absoluteUrl("/account"), "Follow your order")}`,
  }),
  previewReady: (input: { name: string; productTitle: string }) => ({
    subject: "Your Craftkiya preview is ready to approve ✨",
    html: `${heading("Your digital preview is ready")}${hello(input.name)}<p>Our artist has finished the digital draft of your <strong>${escapeHtml(input.productTitle)}</strong>. Take a look and either <strong>approve it</strong> or tell us what you’d like changed — we’re happy to adjust.</p>${steps(2)}${button(absoluteUrl("/account"), "Review my preview")}<p style="font-size:13px;color:#6b6a80">Threading starts only after you approve, so the sooner you reply, the sooner it ships.</p>`,
  }),
  dispatched: (input: { name: string; orderNumber: string; awb: string; courier?: string | null; trackingUrl?: string | null }) => ({
    subject: `Order ${input.orderNumber} is on its way 🚚`,
    html: `${heading("Your portrait is on its way!")}${hello(input.name)}<p>Your handmade portrait has been carefully packed and has left our studio${input.courier ? ` with <strong>${escapeHtml(input.courier)}</strong>` : ""}.</p>${orderBox([["Order", escapeHtml(input.orderNumber)], ["Tracking number", escapeHtml(input.awb)]])}${steps(5)}${button(input.trackingUrl && /^https:\/\//.test(input.trackingUrl) ? input.trackingUrl : absoluteUrl("/account"), "Track my parcel")}<p style="font-size:13px;color:#6b6a80">Please record a short video while opening the parcel — if anything is damaged in transit, it helps us replace it quickly.</p>`,
  }),
  delivered: (input: { name: string; orderNumber: string }) => ({
    subject: "Your Craftkiya portrait has arrived — how do you like it?",
    html: `${heading("We hope you love it ❤️")}${hello(input.name)}<p>Your order <strong>${escapeHtml(input.orderNumber)}</strong> has been delivered. We’d love to know how it feels to see your moment in thread.</p><p>Would you share a quick review, and a photo of it on your wall? It helps other families discover handmade art.</p>${button(absoluteUrl("/account"), "Write a review")}`,
  }),
  /** Internal alert to the studio for every new order. */
  adminNewOrder: (input: OrderInfo & { phone: string; items: string; needsPhoto: boolean }) => ({
    subject: `🧵 New order ${input.orderNumber} — ${money(input.total)}`,
    html: `${heading("New order received")}${orderBox([["Order", escapeHtml(input.orderNumber)], ["Customer", escapeHtml(input.name)], ["Phone", escapeHtml(input.phone)], ["Items", escapeHtml(input.items)], ["Total", money(input.total)], ["Photo", input.needsPhoto ? "Customer will upload later" : "Uploaded"]])}${button(absoluteUrl("/studio"), "Open the studio", "#2b2a6b")}`,
  }),
};
