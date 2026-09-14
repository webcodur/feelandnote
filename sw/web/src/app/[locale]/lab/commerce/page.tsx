import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { getLocalizedAlternates } from "@/lib/seo";
import { isDeveloperMode } from "@/lib/developer-mode";
import CollectionJourneyLab from "@/components/features/commerce/prototype/CollectionJourneyLab";

export async function generateMetadata() {
  return {
    title: "작품 소장 흐름 | Lab",
    robots: { index: false, follow: false },
    alternates: await getLocalizedAlternates("/lab/commerce"),
  };
}

// 개발자 전용 모형이므로 공개 사이트맵에는 등록하지 않는다.
export default async function Page() {
  if (!isDeveloperMode() || await getLocale() !== "ko") notFound();
  return <CollectionJourneyLab />;
}
