"use client";

import { useLocale, useTranslations } from "next-intl";
import { CategoryTabFilter } from "@/components/ui/CategoryTabFilter";
import { RetryBlock } from "@/components/ui/pending";
import { CHART_CATEGORIES, chartSource, chartSources, type ChartCategory, type ChartSourceId } from "@/lib/library/chartSources";
import type { MusicChartSelection } from "@/lib/library/musicChart";
import type { StoreChartSelection } from "@/lib/library/storeChart";
import type { SteamChartSelection } from "@/lib/library/steamChart";
import type { BestsellerItem } from "@/actions/library/types";
import BestsellerFreshness, { type BestsellerFreshnessProps } from "../BestsellerFreshness";
import BookChartGrid from "../BookChartGrid";
import StoreChartGrid from "../StoreChartGrid";
import ChartSourceNotice from "../ChartSourceNotice";
import ChartFreshness from "../ChartFreshness";
import SteamChartGrid from "../SteamChartGrid";
import MusicChartGrid from "../MusicChartGrid";

interface Props {
  category: ChartCategory;
  sourceId?: ChartSourceId;
  books: BestsellerFreshnessProps & { items: BestsellerItem[] };
  music: MusicChartSelection | null;
  storeChart: StoreChartSelection | null;
  steamChart: SteamChartSelection | null;
}

export default function BestsellerSection({ category, sourceId, books, music, storeChart, steamChart }: Props) {
  const locale = useLocale();
  const language = locale === "en" ? "en" : "ko";
  const t = useTranslations("library.popular.charts");
  const tc = useTranslations("content.category");
  const source = chartSource(category, language, sourceId);
  const options = CHART_CATEGORIES.map(value => ({ value, label: tc(value.toLowerCase()) }));
  const sourceOptions = chartSources(category, language).filter(item => item.available).map(item => ({
    value: item.id,
    label: t(`sources.${item.id}`),
  }));

  // 차트별 갱신 시각을 아코디언 요약줄에 붙인다 — 준비 실패·미선택 소스면 비운다.
  const feed = category === "MUSIC" ? music : category === "VIDEO" ? storeChart : category === "GAME" ? steamChart : null;
  const meta = category === "BOOK"
    ? (books.items.length > 0 ? <BestsellerFreshness {...books} /> : null)
    : feed?.status === "ready" ? <ChartFreshness updatedAt={feed.updatedAt} isStale={feed.isStale} /> : null;

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <nav aria-label={t("categories")}>
          <CategoryTabFilter options={options} value={category}
            linkTo={value => `/explore/works/popular?category=${value}`} size="sm" />
        </nav>
        <nav aria-label={t("sourceSelection")}>
          <CategoryTabFilter options={sourceOptions} value={source.id}
            linkTo={value => `/explore/works/popular?category=${category}&source=${value}`} subtle size="sm" wrap />
        </nav>
      </div>

      <ChartSourceNotice key={`${language}-${source.id}`} category={category} source={source} meta={meta} />

      {category === "BOOK" && books.items.length > 0 && (
        <div className="space-y-5">
          <BookChartGrid items={books.items} />
        </div>
      )}
      {category === "BOOK" && books.items.length === 0 && <RetryBlock message={t("loadFailed")} />}

      {category === "VIDEO" && <StoreChartGrid chart={storeChart} />}
      {category === "GAME" && source.id === "steam" && <SteamChartGrid chart={steamChart} />}

      {category === "MUSIC" && <MusicChartGrid chart={music} />}
    </div>
  );
}
