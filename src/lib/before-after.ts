import type { BeforeAfterPair } from "@/components/before-after";

// Before = the customer's original photo placed inside the same ring, faces lined up with the
// finished piece (after), so the wipe only changes the inside of the circle. Both live in /public/art.
// The homepage section is hidden while this list is empty.
export const beforeAfterPairs: BeforeAfterPair[] = [
  { before: "/art/before-single.jpg", after: "/art/portrait-studio-scarf.jpg", label: "Single face" },
  { before: "/art/before-couple.jpg", after: "/art/portrait-couple-1.jpg", label: "Couple" },
  { before: "/art/before-family.jpg", after: "/art/portrait-family-1.jpg", label: "Family" },
];
