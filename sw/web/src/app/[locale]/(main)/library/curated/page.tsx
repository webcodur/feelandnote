/*
  파일명: /app/(main)/library/curated/page.tsx
  기능: 기관 선정 허브
  책임: 대학·언론·시상기관 등이 발표한 작품 목록을 성격별로 진열한다.
*/ // ------------------------------

import { getTranslations } from "next-intl/server";
import { getCuratedHub } from "@/actions/library";
import { getLocalizedAlternates } from "@/lib/seo";
import CuratedHubView from "@/components/features/library/curated/CuratedHubView";

export async function generateMetadata() {
  const t = await getTranslations("library.curated");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: await getLocalizedAlternates("/library/curated"),
  };
}

export default async function CuratedPage() {
  const t = await getTranslations("library.curated");
  const hub = await getCuratedHub();

  return (
    <div className="space-y-6 pb-20">
      <h1 className="text-[22px] font-serif font-bold text-text-primary">{t("title")}</h1>
      <CuratedHubView hub={hub} />
    </div>
  );
}
