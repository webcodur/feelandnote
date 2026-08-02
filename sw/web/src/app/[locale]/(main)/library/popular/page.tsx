/*
  파일명: /app/(main)/library/popular/page.tsx
  기능: 인기 작품 — 인물들이 가장 많이 감상한 작품
  책임: 자르는 기준(전체·시대·직군)과 종류를 골라 목록 하나를 본다.
        (옛 /library/era · /library/profession 을 합친 화면)
*/ // ------------------------------

import { getTranslations } from "next-intl/server";
import AsyncIntlProvider from "@/components/shared/AsyncIntlProvider";
import PopularSection from "@/components/features/library/sections/PopularSection";
import { getChosenLibrary, getProfessionContentCounts } from "@/actions/library";
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
  const [initialData, professionCounts] = await Promise.all([
    getChosenLibrary({ page: 1, limit: 12 }),
    getProfessionContentCounts(),
  ]);

  return (
    <AsyncIntlProvider>
      <PopularSection
        initialData={initialData}
        professions={professionCounts.map(p => ({ profession: p.profession, count: p.count }))}
      />
    </AsyncIntlProvider>
  );
}

export default function Page() {
  return <PopularContent />;
}
