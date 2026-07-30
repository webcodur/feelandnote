/*
  파일명: /app/(main)/library/era/page.tsx
  기능: 불후의 명작 페이지 (통합)
  책임: 전체 시대 + 시대별 인물들의 선택을 보여준다.
*/ // ------------------------------

import { getTranslations } from "next-intl/server";
import AsyncIntlProvider from "@/components/shared/AsyncIntlProvider";
import EraSection from "@/components/features/library/sections/EraSection";
import { getLibraryByEra, getChosenLibrary, getTopCelebsAcrossAllEras } from "@/actions/library";
import { getLocalizedAlternates } from "@/lib/seo";

export async function generateMetadata() {
  const t = await getTranslations("library.era");
  return { title: t("metaTitle"), description: t("metaDescription"), alternates: await getLocalizedAlternates("/library/era") };
}

async function EraContent() {
  const [eraData, chosenData, topCelebs] = await Promise.all([
    getLibraryByEra(),
    getChosenLibrary({ page: 1, limit: 12 }),
    getTopCelebsAcrossAllEras(),
  ]);

  return (
    <AsyncIntlProvider>
      <EraSection initialEraData={eraData} initialChosenData={chosenData} topCelebsAcrossAllEras={topCelebs} />
    </AsyncIntlProvider>
  );
}

export default function Page() {
  return <EraContent />;
}
