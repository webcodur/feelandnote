/*
  파일명: /components/features/library/sections/BestsellerSection.tsx
  기능: 작품 모드 첫 화면 — 분야별 베스트셀러
  책임: 분야 칩(도서·영상·게임·음악) → 출처 안내 한 덩어리 → 순위 격자. 첫 화면에서 곧바로 작품(표지)이 보이게 한다.
        분야를 바꾸면 주소(/explore/works?category=)가 바뀌고 서버가 그 분야 차트만 불러온다. 보던 자리는 지킨다.
        출처 고르기 줄은 한 분야에 출처가 둘 이상일 때만 세운다 — 하나뿐인 칩은 고를 것이 없는데 자리만 차지했다.
*/ // ------------------------------

"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { RetryBlock } from "@/components/ui/pending";
import { EXPLORE_CHIP_CLASS, EXPLORE_PANEL_CLASS, exploreChipStateClass } from "@/components/shared/ExploreSearchControls";
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

/** 작품 모드 첫 화면 주소 — 분야·출처는 검색 조건으로 싣는다(기본값은 싣지 않는다) */
const WORKS_HOME = "/explore/works";
const chartHref = (category: ChartCategory, source?: string) => {
  const query = new URLSearchParams();
  if (category !== "BOOK") query.set("category", category);
  if (source) query.set("source", source);
  return query.size ? `${WORKS_HOME}?${query}` : WORKS_HOME;
};

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
  const sources = chartSources(category, language).filter(item => item.available);

  // 차트별 갱신 시각을 출처 안내 줄에 붙인다 — 준비 실패·미선택 소스면 비운다.
  const feed = category === "MUSIC" ? music : category === "VIDEO" ? storeChart : category === "GAME" ? steamChart : null;
  const meta = category === "BOOK"
    ? (books.items.length > 0 ? <BestsellerFreshness {...books} /> : null)
    : feed?.status === "ready" ? <ChartFreshness updatedAt={feed.updatedAt} isStale={feed.isStale} /> : null;

  return (
    <div>
      <div className={EXPLORE_PANEL_CLASS}>
        <nav aria-label={t("categories")} className="flex flex-wrap items-center justify-center gap-2">
          {CHART_CATEGORIES.map(value => (
            <Link key={value} href={chartHref(value)} prefetch={false} scroll={false}
              aria-current={value === category ? "page" : undefined}
              className={`${EXPLORE_CHIP_CLASS} ${exploreChipStateClass(value === category)}`}>
              {tc(value.toLowerCase())}
            </Link>
          ))}
        </nav>
        {sources.length > 1 && (
          <nav aria-label={t("sourceSelection")} className="flex flex-wrap items-center justify-center gap-2">
            {sources.map(item => (
              <Link key={item.id} href={chartHref(category, item.id)} prefetch={false} scroll={false}
                aria-current={item.id === source.id ? "page" : undefined}
                className={`${EXPLORE_CHIP_CLASS} min-h-9 min-w-0 px-3 text-xs ${exploreChipStateClass(item.id === source.id)}`}>
                {t(`sources.${item.id}`)}
              </Link>
            ))}
          </nav>
        )}
        <ChartSourceNotice key={`${language}-${source.id}`} category={category} source={source} meta={meta} />
      </div>

      {category === "BOOK" && books.items.length > 0 && <BookChartGrid items={books.items} />}
      {category === "BOOK" && books.items.length === 0 && <RetryBlock message={t("loadFailed")} />}

      {category === "VIDEO" && <StoreChartGrid chart={storeChart} />}
      {category === "GAME" && source.id === "steam" && <SteamChartGrid chart={steamChart} />}

      {category === "MUSIC" && <MusicChartGrid chart={music} />}
    </div>
  );
}
