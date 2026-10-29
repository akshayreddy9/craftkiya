import { permanentRedirect } from "next/navigation";

export default function CustomGiftsIndex() {
  permanentRedirect("/gifts");
}
