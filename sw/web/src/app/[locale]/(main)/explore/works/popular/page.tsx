/*
  파일명: /app/(main)/explore/works/popular/page.tsx
  기능: 인기 작품 — 판매처의 도서 순위 및 불후의 고전
  책임: 한국 전일 베스트셀러·미국 유료 전자책 차트와 시대/직군별 고전을 제공한다.
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
    alternates: await getLocalizedAlternates("/explore/works/popular"),
  };
}

async function PopularContent({ mode }: { mode?: string }) {
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
        initialMode={mode === "classics" ? "classics" : "bestseller"}
      />
    </AsyncIntlProvider>
  );
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  return <PopularContent mode={(await searchParams).mode} />;
}
