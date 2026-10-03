import { getLocale, getTranslations } from "next-intl/server";
import { RetryBlock } from "@/components/ui/pending";
import AsyncIntlProvider from "@/components/shared/AsyncIntlProvider";
import { getBestsellers, getCuratedHub } from "@/actions/library";
import type { CuratedHub } from "@/actions/library/types";
import CuratedHubView from "@/components/features/library/curated/CuratedHubView";
import BestsellerSection from "@/components/features/library/sections/BestsellerSection";
import { chartSource, type ChartCategory } from "@/lib/library/chartSources";
import { selectBookChart } from "@/lib/library/bestsellerFeed";
import { getMusicChart } from "@/actions/library/musicChart";
import { getStoreChart } from "@/actions/library/storeChart";
import { getSteamChart } from "@/actions/library/steamChart";
import { getVisitorCountry } from "@/lib/visitorCountryServer";

/** 작품 모드 첫 화면 — 고른 분야의 차트만 불러온다 */
export async function BestsellerMain({ category, source }: { category: ChartCategory; source?: string }) {
  const locale = await getLocale();
  const language = locale === "en" ? "en" : "ko";
  const selectedSource = chartSource(category, language, source);
  const [books, music, storeChart, steamChart] = await Promise.all([
    category === "BOOK" ? getBestsellers("ALL", locale) : selectBookChart(null, language),
    category === "MUSIC" ? getMusicChart(locale) : null,
    category === "VIDEO" ? getStoreChart(locale) : null,
    category === "GAME" && selectedSource.id === "steam" ? getSteamChart(locale) : null,
  ]);

  return (
    <AsyncIntlProvider>
      <BestsellerSection category={category} sourceId={selectedSource.id} books={books} music={music} storeChart={storeChart} steamChart={steamChart} />
    </AsyncIntlProvider>
  );
}

/** 기관 선정(/explore/works/curated) — 조회 실패를 빈 목록처럼 보이지 않게 다시 시도 칸으로 가른다 */
export async function CuratedSection() {
  let hub: CuratedHub;
  try {
    hub = await getCuratedHub();
  } catch (error) {
    console.error("[works] Curated lists failed:", error);
    return <RetryBlock />;
  }
  if (hub.curators.length === 0) {
    const t = await getTranslations("pending");
    return <p className="py-8 text-center text-sm text-text-secondary">{t("empty")}</p>;
  }
  return <CuratedHubView hub={hub} visitorCountry={await getVisitorCountry()} />;
}
