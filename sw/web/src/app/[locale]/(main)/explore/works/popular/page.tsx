/*
  파일명: /app/(main)/explore/works/popular/page.tsx
  기능: 분야별 베스트셀러 및 불후의 고전
  책임: 선택한 분야의 외부 차트 또는 시대/직군별 고전만 조회한다.
*/ // ------------------------------

import { getLocale, getTranslations } from "next-intl/server";
import AsyncIntlProvider from "@/components/shared/AsyncIntlProvider";
import PopularSection from "@/components/features/library/sections/PopularSection";
import { getBestsellers, getChosenLibrary, getProfessionContentCounts } from "@/actions/library";
import { getLocalizedAlternates } from "@/lib/seo";
import { chartCategory, chartSource, type ChartCategory } from "@/lib/library/chartSources";
import { selectBookChart } from "@/lib/library/bestsellerFeed";
import { getMusicChart } from "@/actions/library/musicChart";
import { getStoreChart } from "@/actions/library/storeChart";
import { getSteamChart } from "@/actions/library/steamChart";

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const t = await getTranslations("library.hub");
  const mode = (await searchParams).mode === "classics" ? "classics" : "bestseller";
  const title = t(`${mode}Label`);
  const description = t(mode);
  return {
    title,
    description,
    alternates: await getLocalizedAlternates(`/explore/works/popular${mode === "classics" ? "?mode=classics" : ""}`),
    openGraph: { title, description },
  };
}

async function PopularContent({ mode, category, source }: { mode?: string; category: ChartCategory; source?: string }) {
  const locale = await getLocale();
  const selectedSource = chartSource(category, locale === "en" ? "en" : "ko", source);
  const classics = mode === "classics";
  const [bestsellerData, initialClassicsData, professionCounts, music, storeChart, steamChart] = await Promise.all([
    !classics && category === "BOOK" ? getBestsellers("ALL", locale) : selectBookChart(null, locale === "en" ? "en" : "ko"),
    classics ? getChosenLibrary({ page: 1, limit: 12 }) : { contents: [], total: 0, totalPages: 0, currentPage: 1 },
    classics ? getProfessionContentCounts() : [],
    !classics && category === "MUSIC" ? getMusicChart(locale) : null,
    !classics && category === "VIDEO" ? getStoreChart(locale) : null,
    !classics && category === "GAME" && selectedSource.id === "steam" ? getSteamChart(locale) : null,
  ]);

  return (
    <AsyncIntlProvider>
      <PopularSection
        initialBestsellers={bestsellerData}
        initialClassicsData={initialClassicsData}
        professions={professionCounts.map(p => ({ profession: p.profession, count: p.count }))}
        initialMode={mode === "classics" ? "classics" : "bestseller"}
        initialCategory={category}
        initialSource={selectedSource.id}
        initialMusic={music}
        initialStoreChart={storeChart}
        initialSteamChart={steamChart}
      />
    </AsyncIntlProvider>
  );
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; category?: string; source?: string }>;
}) {
  const { mode, category, source } = await searchParams;
  return <PopularContent mode={mode} category={chartCategory(category)} source={source} />;
}
