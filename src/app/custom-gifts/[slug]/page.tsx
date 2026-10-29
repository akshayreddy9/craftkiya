import { SeoGiftPage, landingMetadata, landingParams } from "@/components/seo-gift-page";

export const revalidate = 300;
export const dynamicParams = false;

type Params = { params: Promise<{ slug: string }> };

export const generateStaticParams = () => landingParams("custom-gifts");
export async function generateMetadata({ params }: Params) { return landingMetadata("custom-gifts", (await params).slug); }

export default async function CustomGiftPage({ params }: Params) {
  return <SeoGiftPage section="custom-gifts" slug={(await params).slug} />;
}
