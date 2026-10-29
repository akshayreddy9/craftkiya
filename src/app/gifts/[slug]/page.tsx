import { SeoGiftPage, landingMetadata, landingParams } from "@/components/seo-gift-page";

export const revalidate = 300;
export const dynamicParams = false;

type Params = { params: Promise<{ slug: string }> };

export const generateStaticParams = () => landingParams("gifts");
export async function generateMetadata({ params }: Params) { return landingMetadata("gifts", (await params).slug); }

export default async function GiftPage({ params }: Params) {
  return <SeoGiftPage section="gifts" slug={(await params).slug} />;
}
