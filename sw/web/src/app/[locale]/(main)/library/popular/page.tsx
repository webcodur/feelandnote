/*
  파일명: /app/(main)/library/popular/page.tsx
  기능: 인기 작품 — 지금 주목받는 주간 베스트셀러 및 불후의 고전
  책임: 실시간 주간 베스트셀러와 전 시대/직군별 불후의 고전을 탭으로 탐색한다.
*/ // ------------------------------

import { getLocale, getTranslations } from "next-intl/server";
import AsyncIntlProvider from "@/components/shared/AsyncIntlProvider";
import PopularSection from "@/components/features/library/sections/PopularSection";
import { getBestsellers, getChosenLibrary, getProfessionContentCounts } from "@/actions/library";
import { getLocalizedAlternates } from "@/lib/seo";

export async function generateMetadata() {
  const t = await getTranslations("library.popular");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: await getLocalizedAlternates("/library/popular"),
  };
}

async function PopularContent() {
  const locale = await getLocale();
  const [bestsellerData, initialClassicsData, professionCounts] = await Promise.all([
    getBestsellers("ALL", locale),
    getChosenLibrary({ page: 1, limit: 12 }),
    getProfessionContentCounts(),
  ]);

  return (
    <AsyncIntlProvider>
      <PopularSection
        initialBestsellers={bestsellerData}
        initialClassicsData={initialClassicsData}
        professions={professionCounts.map(p => ({ profession: p.profession, count: p.count }))}
      />
    </AsyncIntlProvider>
  );
}

export default function Page() {
  return <PopularContent />;
}
